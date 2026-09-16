'use client';

import { api } from '@/lib/api';

export const checkinApi = {
  status: () => api.get('/check-in'),
  claim: () => api.post('/check-in/claim'),
  claimMilestone: (checkinId, option) => api.post(`/check-in/milestones/${checkinId}/claim`, { option }),
  history: (month) => api.get('/check-in/history', { query: month ? { month } : undefined }),
  rewards: () => api.get('/check-in/rewards'),
  activateReward: (rewardId, bookId) =>
    api.post(`/check-in/rewards/${rewardId}/activate`, bookId ? { bookId: Number(bookId) } : {}),

  // Admin
  adminOverview: () => api.get('/admin/check-in'),
  adminUpdateConfig: (patch) => api.put('/admin/check-in/config', patch),
  adminCreateCampaign: (body) => api.post('/admin/check-in/campaigns', body),
  adminUpdateCampaign: (id, patch) => api.patch(`/admin/check-in/campaigns/${id}`, patch),
  adminDeleteCampaign: (id) => api.delete(`/admin/check-in/campaigns/${id}`),
};

/** Icons + accent classes per reward type (Material Symbols names). */
export const REWARD_META = {
  COINS: { icon: 'toll', label: 'Coins', tone: 'gold' },
  CHAPTER_DISCOUNT: { icon: 'sell', label: 'Chapter discount', tone: 'blue' },
  BUNDLE_DISCOUNT: { icon: 'inventory_2', label: 'Bundle discount', tone: 'blue' },
  NOVEL_PASS: { icon: 'auto_stories', label: 'Novel Pass', tone: 'violet' },
  PLATFORM_WIDE_PASS: { icon: 'public', label: 'Platform Pass', tone: 'rose' },
};

export function rewardMeta(type) {
  return REWARD_META[type] || { icon: 'redeem', label: type || 'Reward', tone: 'gold' };
}

/** "5h 12m" / "42m" / "0m" from seconds. */
export function formatDuration(totalSeconds, { withSeconds = false } = {}) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return withSeconds ? `${h}h ${m}m ${sec}s` : `${h}h ${m}m`;
  if (withSeconds) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${m}m`;
}

export function secondsUntil(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000));
}
