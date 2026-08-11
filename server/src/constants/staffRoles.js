'use strict';

/** Predefined staff role templates — permissions are expanded on save. */
const STAFF_ROLE_TEMPLATES = {
  support_staff: {
    key: 'support_staff',
    label: 'Support Staff',
    summary: 'View profiles, purchases, and unlock history. Respond to tickets. Cannot add coins, refund, or manage staff.',
    permissions: [
      'users',
      'transactions',
      'users.view',
      'transactions.view',
      'tickets.respond',
    ],
  },
  content_moderator: {
    key: 'content_moderator',
    label: 'Content Moderator',
    summary: 'Review reported content, issue warnings, and suspend content. No revenue or wallet access.',
    permissions: [
      'comments',
      'comments.view',
      'comments.moderate',
      'comments.suspend_content',
    ],
  },
  finance_staff: {
    key: 'finance_staff',
    label: 'Finance Staff',
    summary: 'View transactions, purchases, and refunds. Generate reports. No content or user management.',
    permissions: [
      'transactions',
      'reports',
      'transactions.view',
      'transactions.reports',
      'transactions.refund',
      'authors.payouts',
    ],
  },
  author_relations: {
    key: 'author_relations',
    label: 'Author Relations',
    summary: 'View authors, revenue shares, contracts, and payout requests. Cannot manage users or staff.',
    permissions: [
      'users',
      'novels',
      'books',
      'users.view',
      'authors.view',
      'authors.payouts',
      'authors.contracts',
      'books.view',
    ],
  },
};

const STAFF_ROLE_KEYS = Object.keys(STAFF_ROLE_TEMPLATES);

function isValidStaffRole(key) {
  return STAFF_ROLE_KEYS.includes(key);
}

function permissionsForStaffRole(key) {
  const tpl = STAFF_ROLE_TEMPLATES[key];
  return tpl ? [...tpl.permissions] : null;
}

module.exports = {
  STAFF_ROLE_TEMPLATES,
  STAFF_ROLE_KEYS,
  isValidStaffRole,
  permissionsForStaffRole,
};
