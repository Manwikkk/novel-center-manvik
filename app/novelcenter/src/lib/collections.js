import { api } from '@/lib/api';

export const collectionsApi = {
  list: (params = {}) => api.get('/collections', { query: params }),
  create: (body) => api.post('/collections', body),
  update: (id, body) => api.patch(`/collections/${Number(id)}`, body),
  remove: (id) => api.delete(`/collections/${Number(id)}`),
  listBooks: (id, params = {}) => api.get(`/collections/${Number(id)}/books`, { query: params }),
  addBook: (id, bookId) => api.post(`/collections/${Number(id)}/books`, { bookId: Number(bookId) }),
  removeBook: (id, bookId) => api.delete(`/collections/${Number(id)}/books/${Number(bookId)}`),
  contains: (bookIds = []) => {
    const ids = (Array.isArray(bookIds) ? bookIds : [bookIds])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) return Promise.resolve({ items: {} });
    return api.get('/collections/contains', { query: { bookIds: ids.join(',') } });
  },
};
