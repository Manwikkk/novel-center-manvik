export const ADMIN_PAGE_DEFS = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin', icon: 'dashboard', exact: true },
  { key: 'page_configuration', label: 'Page Configuration', href: '/admin/page-configuration', icon: 'tune' },
  { key: 'catalog', label: 'Catalog', href: '/admin/catalog', icon: 'label' },
  { key: 'users', label: 'User Management', href: '/admin/users', icon: 'group' },
  { key: 'comments', label: 'Moderation', href: '/admin/comments', icon: 'gavel' },
  { key: 'transactions', label: 'Transactions', href: '/admin/transactions', icon: 'monitoring' },
  { key: 'reports', label: 'Reports', href: '/admin/reports', icon: 'assessment' },
  { key: 'books', label: 'Books', href: '/admin/books', icon: 'menu_book' },
];

export const ADMIN_CAPABILITY_DEFS = [
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

/** All permission keys for staff forms (pages + capabilities). */
export const ADMIN_PERMISSION_DEFS = [...ADMIN_PAGE_DEFS, ...ADMIN_CAPABILITY_DEFS];

export const ADMIN_ACCESS_NAV = {
  href: '/admin/access',
  label: 'Access Control',
  icon: 'admin_panel_settings',
};

export const ADMIN_SETTINGS_NAV = {
  href: '/admin/settings',
  label: 'Settings',
  icon: 'settings',
};

export function canAccessAdminPanel(user) {
  return user?.role === 'admin' || user?.role === 'staff';
}

export function hasAdminPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'staff') return false;
  return (user.adminPermissions || []).includes(permission);
}

export function hasAdminCapability(user, capability) {
  return hasAdminPermission(user, capability);
}

export const PAGE_PERMISSION_KEYS = ADMIN_PAGE_DEFS.map((d) => d.key);

export function firstAllowedAdminHref(user) {
  if (user?.role === 'admin') return '/admin';
  for (const item of ADMIN_PAGE_DEFS) {
    if (hasAdminPermission(user, item.key)) return item.href;
  }
  return '/';
}

export function navItemsForUser(user) {
  if (user?.role === 'admin') {
    return [...ADMIN_PAGE_DEFS.map(({ key, label, href, icon, exact }) => ({
      key, label, href, icon, exact,
    })), ADMIN_SETTINGS_NAV, ADMIN_ACCESS_NAV];
  }
  if (user?.role === 'staff') {
    return ADMIN_PAGE_DEFS.filter((item) => hasAdminPermission(user, item.key));
  }
  return [];
}
