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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f3f3f3] text-on-surface-variant dark:bg-neutral-950">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-300 border-t-[#1e80ff] dark:border-neutral-700 dark:border-t-[#1e80ff]" />
        <span className="text-[12px] font-semibold uppercase tracking-widest text-ink-500 dark:text-neutral-400">
          Loading…
        </span>
      </div>
    );
  }
  return children;
}
