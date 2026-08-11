'use strict';

const { suspensionMeta } = require('../services/suspension.service');

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_e) {
    return fallback;
  }
}

function publicUser(row, extra = {}) {
  const meta = suspensionMeta(row);
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url || null,
    bio: row.bio,
    country: row.country || null,
    socialLinks: parseJson(row.social_links, {}),
    isVerified: Number(row.is_verified) === 1,
    isPremium: Number(row.is_premium) === 1 || row.membership_tier === 'premium',
    readerLevel: Number(row.reader_level) || 1,
    xp: Number(row.xp) || 0,
    showReviews: row.show_reviews == null ? true : Number(row.show_reviews) !== 0,
    showComments: row.show_comments == null ? true : Number(row.show_comments) !== 0,
    membershipTier: row.membership_tier || 'none',
    currentStreak: Number(row.current_streak) || 0,
    longestStreak: Number(row.longest_streak) || 0,
    status: row.status,
    staffRole: row.staff_role || null,
    onboardingCompleted: Number(row.onboarding_completed) === 1,
    authProvider: row.google_id ? 'google' : 'local',
    createdAt: row.created_at,
    ...meta,
    ...extra,
  };
}

module.exports = { publicUser };
