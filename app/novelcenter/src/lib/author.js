import { api } from '@/lib/api';

export const authorApi = {
  earnings: () => api.get('/author/earnings'),
  bookStats: (bookId) => api.get(`/author/books/${bookId}/stats`),
  listBooks: (authorId, { page = 1, pageSize = 50, status } = {}) =>
    api.get('/books', {
      query: {
        author: authorId,
        page,
        pageSize,
        ...(status ? { status } : {}),
      },
    }),
};
