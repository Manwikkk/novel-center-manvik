'use client';

import { api } from '@/lib/api';

export const tasksApi = {
  board: () => api.get('/tasks'),
  adminList: () => api.get('/admin/tasks'),
  adminCreate: (body) => api.post('/admin/tasks', body),
  adminUpdate: (id, body) => api.patch(`/admin/tasks/${id}`, body),
  adminRemove: (id) => api.delete(`/admin/tasks/${id}`),
};
