'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function AuthGuard({ children, roles }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace('/');
    }
  }, [user, hydrated, roles, router]);

  if (!hydrated || !user || (roles && !roles.includes(user.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-400">
        <span className="label-sm uppercase">Loading…</span>
      </div>
    );
  }
  return children;
}
