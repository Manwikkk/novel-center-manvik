'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

const POLL_MS = 30_000;

/** Keeps the client session in sync and signs out suspended users promptly. */
export default function SessionGuard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setUser = useAuthStore((s) => s.setUser);
  const pushToast = useUiStore((s) => s.pushToast);
  const checkingRef = useRef(false);

  useEffect(() => {
    function onSuspended(e) {
      pushToast({
        type: 'error',
        title: 'Account suspended',
        message: e?.detail?.message || 'Your account has been suspended.',
      });
      router.replace('/');
    }

    window.addEventListener('nc:account-suspended', onSuspended);
    return () => window.removeEventListener('nc:account-suspended', onSuspended);
  }, [pushToast, router]);

  useEffect(() => {
    if (!hydrated || !user) return undefined;

    async function verifySession() {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const data = await api.get('/auth/me');
        setUser(data.user);
      } catch (_err) {
        /* api client handles ACCOUNT_SUSPENDED logout */
      } finally {
        checkingRef.current = false;
      }
    }

    verifySession();
    const timer = setInterval(verifySession, POLL_MS);

    function onVisible() {
      if (document.visibilityState === 'visible') verifySession();
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hydrated, user?.id, setUser]);

  return null;
}
