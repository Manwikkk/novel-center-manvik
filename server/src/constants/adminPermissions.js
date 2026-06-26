'use strict';

/** Sidebar / page access */
const PAGE_PERMISSION_DEFS = [
  { key: 'dashboard', label: 'Dashboard', kind: 'page' },
  { key: 'page_configuration', label: 'Page Configuration', kind: 'page' },
  { key: 'catalog', label: 'Catalog', kind: 'page' },
  { key: 'users', label: 'User Management', kind: 'page' },
  { key: 'comments', label: 'Moderation', kind: 'page' },
  { key: 'transactions', label: 'Transactions', kind: 'page' },
  { key: 'books', label: 'Books', kind: 'page' },
];

/** Fine-grained capabilities within pages */
const CAPABILITY_PERMISSION_DEFS = [
  { key: 'users.view', label: 'View user profiles', group: 'Users' },
  { key: 'users.manage_wallet', label: 'Add or deduct tokens', group: 'Users' },
  { key: 'users.manage_roles', label: 'Change member roles', group: 'Users' },
  { key: 'users.suspend', label: 'Suspend or reinstate members', group: 'Users' },
  { key: 'authors.view', label: 'View authors', group: 'Authors' },
  { key: 'authors.payouts', label: 'View payout requests', group: 'Authors' },
  { key: 'authors.contracts', label: 'View contracts', group: 'Authors' },
  { key: 'comments.view', label: 'View reported comments & reviews', group: 'Moderation' },
  { key: 'comments.moderate', label: 'Approve, hide, or delete content', group: 'Moderation' },
  { key: 'comments.suspend_content', label: 'Suspend members (content actions)', group: 'Moderation' },
  { key: 'transactions.view', label: 'View transactions & unlock history', group: 'Finance' },
  { key: 'transactions.reports', label: 'Generate finance reports', group: 'Finance' },
  { key: 'transactions.refund', label: 'Issue refunds', group: 'Finance' },
  { key: 'books.view', label: 'View novels', group: 'Books' },
  { key: 'books.delete', label: 'Delete novels', group: 'Books' },
  { key: 'tickets.respond', label: 'Respond to support tickets', group: 'Support' },
  { key: 'audit.view', label: 'View audit log', group: 'System' },
];

const ADMIN_PERMISSION_DEFS = [...PAGE_PERMISSION_DEFS, ...CAPABILITY_PERMISSION_DEFS];

const PAGE_PERMISSION_KEYS = PAGE_PERMISSION_DEFS.map((d) => d.key);
const ALL_PERMISSION_KEYS = ADMIN_PERMISSION_DEFS.map((d) => d.key);
const PERMISSION_KEY_SET = new Set(ALL_PERMISSION_KEYS);

function isValidPermission(key) {
  return PERMISSION_KEY_SET.has(key);
}

function sanitizePermissions(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((k) => typeof k === 'string' && PERMISSION_KEY_SET.has(k)))];
}

function hasCapability(permissions, capability) {
  return permissions.includes(capability);
}

function assertCapability(actor, permissions, capability, message) {
  if (actor?.role === 'admin') return;
  if (!hasCapability(permissions, capability)) {
    const { errors } = require('../utils/HttpError');
    throw errors.forbidden(message || 'Insufficient permission');
  }
}

module.exports = {
  PAGE_PERMISSION_DEFS,
  CAPABILITY_PERMISSION_DEFS,
  ADMIN_PERMISSION_DEFS,
  PAGE_PERMISSION_KEYS,
  ALL_PERMISSION_KEYS,
  PERMISSION_KEY_SET,
  isValidPermission,
  sanitizePermissions,
  hasCapability,
  assertCapability,
};
