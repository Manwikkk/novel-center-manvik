'use client';

import { api } from '@/lib/api';

export const libraryApi = {
  list: (params = {}) => api.get('/library', { query: params }),
  add: (bookId) => api.post('/library', { bookId: Number(bookId) }),
  remove: (bookId) => api.delete(`/library/${Number(bookId)}`),
  contains: (bookIds = []) => {
    const ids = (Array.isArray(bookIds) ? bookIds : [bookIds])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) return Promise.resolve({ items: {} });
    return api.get('/library/contains', { query: { bookIds: ids.join(',') } });
  },
};
