'use client';

const BASE = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '')}/api/v1`;

function handleAccountSuspended(message) {
  clearTokens();
  if (typeof window !== 'undefined') {
    import('@/stores/authStore').then(({ useAuthStore }) => {
      useAuthStore.getState().logout();
    });
    window.dispatchEvent(new CustomEvent('nc:account-suspended', {
      detail: { message: message || 'Your account has been suspended.' },
    }));
  }
}

let memoryAccessToken = null;
let memoryRefreshToken = null;

export function setTokens({ accessToken, refreshToken } = {}) {
  if (typeof window === 'undefined') return;
  memoryAccessToken = accessToken || null;
  memoryRefreshToken = refreshToken || null;
  if (accessToken) localStorage.setItem('nc.accessToken', accessToken);
  else localStorage.removeItem('nc.accessToken');
  if (refreshToken) localStorage.setItem('nc.refreshToken', refreshToken);
  else localStorage.removeItem('nc.refreshToken');
}

export function clearTokens() {
  setTokens({});
}

export function getAccessToken() {
  if (memoryAccessToken) return memoryAccessToken;
  if (typeof window === 'undefined') return null;
  memoryAccessToken = localStorage.getItem('nc.accessToken');
  return memoryAccessToken;
}

function getRefreshToken() {
  if (memoryRefreshToken) return memoryRefreshToken;
  if (typeof window === 'undefined') return null;
  memoryRefreshToken = localStorage.getItem('nc.refreshToken');
  return memoryRefreshToken;
}

let refreshPromise = null;
async function tryRefresh() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        const failData = await res.json().catch(() => null);
        if (res.status === 403 && failData?.error?.code === 'ACCOUNT_SUSPENDED') {
          handleAccountSuspended(failData.error.message);
        } else {
          clearTokens();
        }
        return null;
      }
      const data = await res.json();
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request(path, { method = 'GET', body, query, headers, formData, signal } = {}, _retry = false) {
  let url = `${BASE}${path}`;
  if (query && typeof query === 'object') {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      qs.append(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const finalHeaders = { ...(headers || {}) };
  let payload = undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const token = getAccessToken();
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { method, headers: finalHeaders, body: payload, signal });

  if (res.status === 401 && !_retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, { method, body, query, headers, formData }, true);
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const err = new Error(
      (data && data.error && data.error.message) || `Request failed: ${res.status}`,
    );
    err.status = res.status;
    err.code = data && data.error && data.error.code;
    err.details = data && data.error && data.error.details;
    err.payload = data;
    if (res.status === 403 && err.code === 'ACCOUNT_SUSPENDED') {
      handleAccountSuspended(err.message);
    }
    throw err;
  }
  return data;
}

async function downloadBlob(path, { query, fallbackFilename } = {}, _retry = false) {
  let url = `${BASE}${path}`;
  if (query && typeof query === 'object') {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      qs.append(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method: 'GET', headers });
  if (res.status === 401 && !_retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return downloadBlob(path, { query, fallbackFilename }, true);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const err = new Error(data?.error?.message || `Download failed: ${res.status}`);
    err.status = res.status;
    err.code = data?.error?.code;
    throw err;
  }
  const contentType = res.headers.get('content-type') || '';
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";\n]+)"?/i);
  let filename = match?.[1] || fallbackFilename || '';
  if (!filename) {
    filename = contentType.includes('pdf') ? 'report.pdf' : 'report.xlsx';
  }
  const blob = await res.blob();
  return { blob, filename, contentType };
}

export const api = {
  get:    (path, opts) => request(path, { method: 'GET',    ...opts }),
  post:   (path, body, opts) => request(path, { method: 'POST',   body, ...opts }),
  patch:  (path, body, opts) => request(path, { method: 'PATCH',  body, ...opts }),
  delete: (path, opts) => request(path, { method: 'DELETE', ...opts }),
  upload: (path, formData, opts) => request(path, { method: 'POST', formData, ...opts }),
  downloadBlob,
};

export const ApiBaseUrl = BASE;
