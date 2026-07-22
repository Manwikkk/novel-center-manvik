import { api } from '@/lib/api';

export const readingApi = {
  recent: (limit = 4) => api.get('/reading/recent', { query: { limit } }),
  listRecent: (params = {}) => api.get('/reading/recent', { query: params }),
  saveProgress: (chapterId, percent, position = 0) =>
    api.post('/reading/progress', {
      chapterId: Number(chapterId),
      percent: Math.max(0, Math.min(100, Math.round(Number(percent) || 0))),
      position: Math.max(0, Math.round(Number(position) || 0)),
    }),
};
