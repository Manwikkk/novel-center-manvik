'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { profileApi } from '@/lib/profileApi';
import CelebrationModal from '@/components/engagement/CelebrationModal';

const POLL_MS = 45_000;
export const ENGAGEMENT_REFRESH = 'engagement:refresh';

/** Ask the host to pull pending toast / celebration surfaces. */
let _refreshTimer = null;
export function refreshEngagementSurface() {
  if (typeof window === 'undefined') return;
  if (_refreshTimer) return;
  _refreshTimer = window.setTimeout(() => {
    _refreshTimer = null;
    window.dispatchEvent(new CustomEvent(ENGAGEMENT_REFRESH));
  }, 400);
}

/**
 * Global host for Level-1 toasts and Level-2 celebrations driven by
 * server-authoritative notifications (deduped + presented_at).
 */
export default function EngagementHost() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const router = useRouter();
  const [celebration, setCelebration] = useState(null);
  const queueRef = useRef([]);
  const busyRef = useRef(false);
  const seenRef = useRef(new Set());

  const markPresented = useCallback(async (ids) => {
    const clean = [...new Set((ids || []).map(Number).filter(Boolean))];
    if (!clean.length) return;
    try {
      await profileApi.markNotificationsPresented({ ids: clean });
    } catch (_e) { /* ignore */ }
  }, []);

  const pump = useCallback(() => {
    if (busyRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    busyRef.current = true;
    if (next.presentation === 'celebration') {
      setCelebration(next);
      return;
    }
    pushToast({
      type: 'success',
      title: next.title,
      message: next.body || undefined,
      ttl: 4500,
    });
    markPresented([next.id]).finally(() => {
      busyRef.current = false;
      pump();
    });
  }, [markPresented, pushToast]);

  const ingest = useCallback((items) => {
    const fresh = (items || []).filter((n) => n?.id && !seenRef.current.has(n.id));
    if (!fresh.length) return;
    for (const n of fresh) seenRef.current.add(n.id);
    // Celebrations first, then toasts — never stack celebrations.
    const ordered = [
      ...fresh.filter((n) => n.presentation === 'celebration'),
      ...fresh.filter((n) => n.presentation === 'toast'),
    ];
    queueRef.current.push(...ordered);
    pump();
  }, [pump]);

  const pull = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await profileApi.pendingNotificationSurface();
      ingest(data.items || []);
    } catch (_e) { /* ignore */ }
  }, [user?.id, ingest]);

  useEffect(() => {
    if (!user?.id) {
      queueRef.current = [];
      seenRef.current = new Set();
      setCelebration(null);
      busyRef.current = false;
      return undefined;
    }
    pull();
    const t = setInterval(pull, POLL_MS);
    const onRefresh = () => pull();
    window.addEventListener(ENGAGEMENT_REFRESH, onRefresh);
    const onVis = () => { if (document.visibilityState === 'visible') pull(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      window.removeEventListener(ENGAGEMENT_REFRESH, onRefresh);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user?.id, pull]);

  function closeCelebration() {
    const current = celebration;
    setCelebration(null);
    if (current?.id) {
      markPresented([current.id]).finally(() => {
        busyRef.current = false;
        pump();
      });
    } else {
      busyRef.current = false;
      pump();
    }
  }

  function onPrimary(item) {
    const meta = item?.metadata || {};
    closeCelebration();
    if (meta.openMilestoneChoice) {
      router.push('/check-in?milestone=1');
      return;
    }
    if (item?.linkUrl) router.push(item.linkUrl);
  }

  return (
    <CelebrationModal
      item={celebration}
      open={!!celebration}
      onClose={closeCelebration}
      onPrimary={onPrimary}
    />
  );
}
