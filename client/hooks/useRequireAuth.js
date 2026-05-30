'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { openAuthModal } from '@/lib/authModal';

/**
 * Returns a helper that runs `action` when signed in, or opens the auth modal first.
 */
export function useRequireAuth() {
  const user = useAuthStore((s) => s.user);

  const requireAuth = useCallback(
    (action, opts = {}) => {
      if (user) {
        if (typeof action === 'function') action();
        return true;
      }
      openAuthModal({
        tab: opts.tab || 'login',
        message: opts.message,
        onSuccess: typeof action === 'function' ? action : undefined,
      });
      return false;
    },
    [user],
  );

  return { user, requireAuth };
}
