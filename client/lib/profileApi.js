'use client';

import { api } from '@/lib/api';

export const profileApi = {
  me: () => api.get('/profiles/me'),
  get: (id) => api.get(`/profiles/${id}`),
  update: (body) => api.patch('/profiles/me', body),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.upload('/profiles/me/avatar', fd);
  },
  uploadBanner: (file) => {
    const fd = new FormData();
    fd.append('banner', file);
    return api.upload('/profiles/me/banner', fd);
  },
  checkIn: () => api.post('/profiles/me/check-in'),
  follow: (id) => api.post(`/profiles/${id}/follow`),
  unfollow: (id) => api.delete(`/profiles/${id}/follow`),
  novels: (id, query) => api.get(`/profiles/${id}/novels`, { query }),
  setNovelVisibility: (bookId, showOnProfile) =>
    api.patch(`/profiles/me/novels/${bookId}`, { showOnProfile }),
  library: (id, query) => api.get(`/profiles/${id}/library`, { query }),
  reviews: (id, query) => api.get(`/profiles/${id}/reviews`, { query }),
  comments: (id, query) => api.get(`/profiles/${id}/comments`, { query }),
  achievements: (id) => api.get(`/profiles/${id}/achievements`),
  collections: (id, query) => api.get(`/profiles/${id}/collections`, { query }),
  collection: (id, collectionId) => api.get(`/profiles/${id}/collections/${collectionId}`),
  levels: () => api.get('/profiles/levels'),
  changePassword: (body) => api.post('/profiles/me/password', body),
  updateEmail: (body) => api.patch('/profiles/me/email', body),
  deleteAccount: (body) => api.post('/profiles/me/delete', body),
};
