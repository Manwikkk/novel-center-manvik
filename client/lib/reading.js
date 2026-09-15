'use client';

import { api } from '@/lib/api';

export const readingApi = {
  recent: (limit = 4) => api.get('/reading/recent', { query: { limit } }),
  recentPage: ({ page = 1, pageSize = 12 } = {}) =>
    api.get('/reading/recent', { query: { page, pageSize } }),
  latestForBook: (bookId) => api.get(`/reading/books/${Number(bookId)}`),
  saveProgress: (chapterId, percent, position = 0) =>
    api.post('/reading/progress', {
      chapterId: Number(chapterId),
      percent: Math.max(0, Math.min(100, Math.round(Number(percent) || 0))),
      position: Math.max(0, Math.round(Number(position) || 0)),
    }),
};
