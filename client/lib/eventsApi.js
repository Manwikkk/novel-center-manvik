'use client';

import { api } from '@/lib/api';

export const eventsApi = {
  list: () => api.get('/events'),
  promoted: () => api.get('/events/promoted'),
  detail: (id) => api.get(`/events/${id}`),
  register: (id) => api.post(`/events/${id}/register`, {}),
  dismiss: (id) => api.post(`/events/${id}/dismiss`, {}),
  claim: (id, rewardId) => api.post(`/events/${id}/rewards/${rewardId}/claim`, {}),
  adminList: () => api.get('/admin/events'),
  adminCreate: (body) => api.post('/admin/events', body),
  adminUpdate: (id, body) => api.patch(`/admin/events/${id}`, body),
  adminRemove: (id) => api.delete(`/admin/events/${id}`),
};

export const EVENT_REWARD_LABELS = {
  COINS: 'Coins',
  EXP: 'Reader EXP',
  CHAPTER_DISCOUNT: 'Chapter discount',
  BUNDLE_DISCOUNT: 'Bundle discount',
  NOVEL_PASS: 'Novel Pass',
  PLATFORM_WIDE_PASS: 'Platform pass',
  BADGE: 'Exclusive badge',
  TITLE: 'Profile title',
  COSMETIC: 'Profile cosmetic',
};
