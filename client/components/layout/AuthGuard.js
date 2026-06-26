'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { firstAllowedAdminHref, hasAdminPermission } from '@/lib/adminPermissions';

function canAccess(user, { roles, permission }) {
  if (!user) return false;
  if (roles?.length && !roles.includes(user.role)) return false;
  if (permission) return hasAdminPermission(user, permission);
  return true;
}

export default function AuthGuard({ children, roles, permission }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  const allowed = user && canAccess(user, { roles, permission });

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (roles?.length && !roles.includes(user.role)) {
      router.replace('/');
      return;
    }
    if (permission && !hasAdminPermission(user, permission)) {
      router.replace(firstAllowedAdminHref(user));
    }
  }, [user, hydrated, roles, permission, router]);

  if (!hydrated || !user || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        <span className="label-sm uppercase">Loading…</span>
      </div>
    );
  }
  return children;
}
