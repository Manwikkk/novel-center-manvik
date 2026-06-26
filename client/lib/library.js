'use client';

import { api } from '@/lib/api';

export const libraryApi = {
  list: (params = {}) => api.get('/library', { query: params }),
  add: (bookId) => api.post('/library', { bookId: Number(bookId) }),
  remove: (bookId) => api.delete(`/library/${Number(bookId)}`),
  setStatus: (bookId, status) => api.patch(`/library/${Number(bookId)}/status`, { status }),
  contains: (bookIds = []) => {
    const ids = (Array.isArray(bookIds) ? bookIds : [bookIds])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) return Promise.resolve({ items: {} });
    return api.get('/library/contains', { query: { bookIds: ids.join(',') } });
  },
  statusMany: (bookIds = []) => {
    const ids = (Array.isArray(bookIds) ? bookIds : [bookIds])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) return Promise.resolve({ items: {} });
    return api.get('/library/status', { query: { bookIds: ids.join(',') } });
  },
};
