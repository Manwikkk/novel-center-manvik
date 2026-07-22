import { api } from '@/lib/api';

export const catalogApi = {
  categories: () => api.get('/catalog/categories'),
  languages: () => api.get('/catalog/languages'),
  contentTags: () => api.get('/catalog/content-tags'),
  createContentTag: (label) => api.post('/catalog/content-tags', { label: label.trim() }),
};
