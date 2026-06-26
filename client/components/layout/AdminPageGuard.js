'use client';

import AuthGuard from '@/components/layout/AuthGuard';

/** Protects admin pages for super-admin and staff with a specific page permission. */
export default function AdminPageGuard({ permission, children }) {
  return (
    <AuthGuard roles={['admin', 'staff']} permission={permission}>
      {children}
    </AuthGuard>
  );
}
