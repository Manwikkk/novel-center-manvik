'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import ProfileShell from '@/components/profile/ProfileShell';

export default function AccountPage() {
  return (
    <AuthGuard>
      <ProfileShell mode="me" />
    </AuthGuard>
  );
}
