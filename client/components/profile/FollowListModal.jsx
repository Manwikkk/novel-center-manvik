'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import { profileApi } from '@/lib/profileApi';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { openAuthModal } from '@/lib/authModal';
import { cn } from '@/lib/cn';

function FollowRow({ person, viewerId, onToggle, busyId }) {
  const isSelf = viewerId != null && Number(viewerId) === Number(person.id);
  const href = person.isAuthor ? `/authors/${person.id}` : `/users/${person.id}`;
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={href} className="shrink-0">
        <Avatar name={person.displayName} src={person.avatarUrl} size={44} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold text-ink-900 hover:underline dark:text-neutral-100">{person.displayName}</span>
          {person.isVerified ? <Icon name="verified" filled size={16} className="shrink-0 text-[#1e80ff]" /> : null}
          {person.isAuthor ? (
            <span className="shrink-0 rounded bg-[#1e80ff]/15 px-1.5 text-[9px] font-bold uppercase tracking-wide text-[#1e80ff]">Author</span>
          ) : null}
        </Link>
        <p className="truncate text-[12px] text-ink-500 dark:text-neutral-500">
          Lv {person.readerLevel} · {person.followers} follower{person.followers === 1 ? '' : 's'}
          {person.isAuthor && person.bookCount ? ` · ${person.bookCount} novel${person.bookCount === 1 ? '' : 's'}` : ''}
          {person.bio ? ` · ${person.bio}` : ''}
        </p>
      </div>
      {!isSelf ? (
        <button
          type="button"
          disabled={busyId === person.id}
          onClick={() => onToggle(person)}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition-colors disabled:opacity-60',
            person.isFollowing
              ? 'border border-neutral-300 text-ink-700 hover:border-ink-900 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-300'
              : 'bg-ink-900 text-white hover:bg-ink-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200',
          )}
        >
          {person.isFollowing ? 'Following' : 'Follow'}
        </button>
      ) : null}
    </li>
  );
}

/**
 * Followers / following lists for a profile, with inline follow toggles.
 */
export default function FollowListModal({ userId, open, initialTab = 'followers', onClose, onCountsChange }) {
  const viewer = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState(initialTab);
  const [lists, setLists] = useState({ followers: null, following: null });
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { if (open) setTab(initialTab); }, [open, initialTab]);

  useEffect(() => {
    if (!open || !userId) return undefined;
    let cancelled = false;
    setLoading(true);
    const fn = tab === 'followers' ? profileApi.followers : profileApi.following;
    fn(userId, { pageSize: 60 })
      .then((d) => { if (!cancelled) setLists((prev) => ({ ...prev, [tab]: d })); })
      .catch(() => { if (!cancelled) setLists((prev) => ({ ...prev, [tab]: { items: [], total: 0 } })); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, userId, tab, viewer?.id]);

  async function toggle(person) {
    if (!viewer) {
      openAuthModal({ message: 'Sign in to follow readers and authors.' });
      return;
    }
    setBusyId(person.id);
    try {
      const res = person.isFollowing ? await profileApi.unfollow(person.id) : await profileApi.follow(person.id);
      setLists((prev) => {
        const next = {};
        for (const key of Object.keys(prev)) {
          next[key] = prev[key]
            ? { ...prev[key], items: prev[key].items.map((p) => (p.id === person.id ? { ...p, isFollowing: res.isFollowing, followers: res.followers } : p)) }
            : prev[key];
        }
        return next;
      });
      onCountsChange?.({ targetId: person.id, isFollowing: res.isFollowing, followers: res.followers });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update follow', message: err.message });
    } finally {
      setBusyId(null);
    }
  }

  const current = lists[tab];

  return (
    <Modal open={open} onClose={onClose} size="md" title="Connections">
      <div className="flex gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-900">
        {['followers', 'following'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-full py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors',
              tab === t ? 'bg-white text-ink-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-ink-500 dark:text-neutral-400',
            )}
          >
            {t}{lists[t]?.total != null ? ` · ${lists[t].total}` : ''}
          </button>
        ))}
      </div>
      <div className="mt-3 max-h-[60vh] overflow-y-auto">
        {loading && !current ? (
          <p className="py-10 text-center text-[13px] text-ink-500 dark:text-neutral-500">Loading…</p>
        ) : current?.items?.length ? (
          <ul className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
            {current.items.map((p) => (
              <FollowRow key={p.id} person={p} viewerId={viewer?.id} onToggle={toggle} busyId={busyId} />
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-[13px] text-ink-500 dark:text-neutral-500">
            {tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        )}
      </div>
    </Modal>
  );
}
