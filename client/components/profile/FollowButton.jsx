'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { profileApi } from '@/lib/profileApi';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { openAuthModal } from '@/lib/authModal';
import { cn } from '@/lib/cn';

/**
 * Follow / following toggle for any user id. Resolves the current state from
 * the profile API when `initialFollowing` is unknown.
 */
export default function FollowButton({ userId, initialFollowing = null, size = 'sm', className, onChange }) {
  const viewer = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialFollowing != null || !viewer || Number(viewer.id) === Number(userId)) return undefined;
    let cancelled = false;
    profileApi.get(userId).then((d) => { if (!cancelled) setFollowing(!!d.profile?.isFollowing); }).catch(() => {});
    return () => { cancelled = true; };
  }, [userId, viewer, initialFollowing]);

  if (viewer && Number(viewer.id) === Number(userId)) return null;

  async function toggle() {
    if (!viewer) {
      openAuthModal({ message: 'Sign in to follow authors and readers.', onSuccess: () => toggle() });
      return;
    }
    setBusy(true);
    try {
      const res = following ? await profileApi.unfollow(userId) : await profileApi.follow(userId);
      setFollowing(res.isFollowing);
      onChange?.(res);
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update follow', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full font-semibold uppercase tracking-widest transition-colors disabled:opacity-60',
        size === 'sm' ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-2 text-[11px]',
        following
          ? 'border border-neutral-300 text-ink-700 hover:border-ink-900 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-300'
          : 'bg-ink-900 text-white hover:bg-ink-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200',
        className,
      )}
    >
      <Icon name={following ? 'check' : 'person_add'} size={14} />
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
