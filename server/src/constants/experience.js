'use strict';

// How a member uses Novel Centre. `reader` gets the reading navigation, `creator`
// leads with the author studio, `both` combines them. Creator experiences require
// the author role; the reader experience is available to every role.
const EXPERIENCES = ['reader', 'creator', 'both'];

function isExperience(value) {
  return EXPERIENCES.includes(value);
}

// Role implied by an experience choice (readers stay `user`, writers become `author`).
function roleForExperience(experience) {
  return experience === 'creator' || experience === 'both' ? 'author' : 'user';
}

// Experience to assume for accounts created before the column existed (or by
// clients that only send a role).
function defaultExperienceForRole(role) {
  return role === 'author' || role === 'admin' ? 'both' : 'reader';
}

// Resolve the {role, experience} pair for a sign-up / onboarding payload.
function resolveRoleAndExperience({ role, experience }) {
  if (isExperience(experience)) {
    const impliedRole = roleForExperience(experience);
    return { role: role === 'author' || impliedRole === 'author' ? 'author' : 'user', experience };
  }
  const safeRole = role === 'author' ? 'author' : 'user';
  return { role: safeRole, experience: defaultExperienceForRole(safeRole) };
}

module.exports = {
  EXPERIENCES,
  isExperience,
  roleForExperience,
  defaultExperienceForRole,
  resolveRoleAndExperience,
};
