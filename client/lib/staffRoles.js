export const STAFF_ROLE_TEMPLATES = [
  {
    key: 'support_staff',
    label: 'Support Staff',
    summary: 'View profiles, purchases, and unlock history. Respond to tickets. Cannot add coins, refund, or manage staff.',
    permissions: ['users', 'transactions', 'users.view', 'transactions.view', 'tickets.respond'],
  },
  {
    key: 'content_moderator',
    label: 'Content Moderator',
    summary: 'Review reported content, issue warnings, and suspend content. No revenue or wallet access.',
    permissions: ['comments', 'comments.view', 'comments.moderate', 'comments.suspend_content'],
  },
  {
    key: 'finance_staff',
    label: 'Finance Staff',
    summary: 'View transactions, purchases, and refunds. Generate reports. No content or user management.',
    permissions: ['transactions', 'transactions.view', 'transactions.reports'],
  },
  {
    key: 'author_relations',
    label: 'Author Relations',
    summary: 'View authors, revenue shares, contracts, and payout requests. Cannot manage users or staff.',
    permissions: ['users', 'books', 'users.view', 'authors.view', 'authors.payouts', 'authors.contracts', 'books.view'],
  },
];

export function staffRoleByKey(key) {
  return STAFF_ROLE_TEMPLATES.find((r) => r.key === key) || null;
}

export function permissionsForStaffRole(key) {
  return staffRoleByKey(key)?.permissions || [];
}
