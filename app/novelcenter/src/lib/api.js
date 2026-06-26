import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config/env';

const ACCESS_KEY = 'nc.accessToken';
const REFRESH_KEY = 'nc.refreshToken';

let memoryAccess = null;
let memoryRefresh = null;

export async function setTokens({ accessToken, refreshToken } = {}) {
  memoryAccess = accessToken || null;
  memoryRefresh = refreshToken || null;
  if (accessToken) await AsyncStorage.setItem(ACCESS_KEY, accessToken);
  else await AsyncStorage.removeItem(ACCESS_KEY);
  if (refreshToken) await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
  else await AsyncStorage.removeItem(REFRESH_KEY);
}

export async function clearTokens() {
  await setTokens({});
}

export async function getAccessToken() {
  if (memoryAccess) return memoryAccess;
  const t = await AsyncStorage.getItem(ACCESS_KEY);
  memoryAccess = t;
  return t;
}

async function getRefreshToken() {
  if (memoryRefresh) return memoryRefresh;
  const t = await AsyncStorage.getItem(REFRESH_KEY);
  memoryRefresh = t;
  return t;
}

let refreshPromise = null;
async function tryRefresh() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        await clearTokens();
        return null;
      }
      const data = await res.json();
      await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request(path, opts = {}, _retry = false) {
  const { method = 'GET', body, query, headers, formData } = opts;
  let url = `${API_URL}${path}`;

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
  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const token = await getAccessToken();
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { method, headers: finalHeaders, body: payload });

  if (res.status === 401 && !_retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, opts, true);
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
    throw err;
  }
  return data;
}

export const api = {
  get:    (path, opts) => request(path, { method: 'GET', ...opts }),
  post:   (path, body, opts) => request(path, { method: 'POST', body, ...opts }),
  patch:  (path, body, opts) => request(path, { method: 'PATCH', body, ...opts }),
  delete: (path, opts) => request(path, { method: 'DELETE', ...opts }),
  upload: (path, formData, opts) => request(path, { method: 'POST', formData, ...opts }),
};
