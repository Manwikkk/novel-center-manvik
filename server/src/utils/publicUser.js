'use strict';

const { suspensionMeta } = require('../services/suspension.service');

function publicUser(row, extra = {}) {
  const meta = suspensionMeta(row);
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    avatarUrl: row.avatar_url,
    bio: row.bio,
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
