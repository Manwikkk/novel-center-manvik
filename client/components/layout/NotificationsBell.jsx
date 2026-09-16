'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

const TYPE_ICON = {
  follow: { icon: 'person_add', cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-300' },
  chapter: { icon: 'menu_book', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  badge: { icon: 'military_tech', cls: 'bg-gold/20 text-gold-dim dark:text-gold' },
  reward: { icon: 'redeem', cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  checkin: { icon: 'local_fire_department', cls: 'bg-orange-500/15 text-orange-600 dark:text-orange-300' },
  system: { icon: 'info', cls: 'bg-neutral-200 text-ink-700 dark:bg-neutral-800 dark:text-neutral-300' },
};

const POLL_MS = 60_000;

/**
 * Header bell: unread badge, dropdown with the latest notifications, mark-as-read.
 * Polls quietly so new followers / chapters show up without a refresh.
 */
export default function NotificationsBell({ userId, className, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const d = await api.get('/profiles/me/notifications', { query: { pageSize: 1 } });
      setUnread(Number(d.unread || 0));
    } catch (_e) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    refreshCount();
    const t = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(t);
  }, [userId, refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    try {
      const d = await api.get('/profiles/me/notifications', { query: { pageSize: 8 } });
      setItems(d.items || []);
      setUnread(Number(d.unread || 0));
    } catch (_e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAll() {
    try {
      await api.post('/profiles/me/notifications/read', { all: true });
      setUnread(0);
      setItems((list) => (list || []).map((n) => ({ ...n, isRead: true })));
    } catch (_e) { /* ignore */ }
  }

  async function openItem(n) {
    if (!n.isRead) {
      api.post('/profiles/me/notifications/read', { ids: [n.id] }).catch(() => {});
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-900/5 dark:text-neutral-200 dark:hover:bg-white/10"
      >
        <Icon name={unread ? 'notifications_active' : 'notifications'} size={22} filled={!!unread} />
        {unread ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-black">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-editorial-modal dark:border-neutral-800 dark:bg-neutral-950"
        >
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <p className="text-[13px] font-semibold text-ink-900 dark:text-neutral-100">Notifications</p>
            {unread ? (
              <button type="button" onClick={markAll} className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 hover:text-ink-900 dark:text-neutral-400 dark:hover:text-white">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading && !items ? (
              <p className="px-4 py-8 text-center text-[13px] text-ink-500 dark:text-neutral-500">Loading…</p>
            ) : items && items.length ? (
              items.map((n) => {
                const meta = TYPE_ICON[n.type] || TYPE_ICON.system;
                const inner = (
                  <>
                    <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', meta.cls)}>
                      <Icon name={meta.icon} size={18} filled />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[13px] leading-snug', n.isRead ? 'text-ink-700 dark:text-neutral-300' : 'font-semibold text-ink-900 dark:text-neutral-50')}>{n.title}</span>
                      {n.body ? <span className="mt-0.5 block text-[12px] leading-snug text-ink-500 dark:text-neutral-500">{n.body}</span> : null}
                      <span className="mt-1 block text-[11px] text-ink-400 dark:text-neutral-600">{formatRelative(n.createdAt)}</span>
                    </span>
                    {!n.isRead ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-hidden="true" /> : null}
                  </>
                );
                const cls = 'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900';
                return n.linkUrl ? (
                  <Link key={n.id} href={n.linkUrl} onClick={() => openItem(n)} className={cls} role="menuitem">{inner}</Link>
                ) : (
                  <button key={n.id} type="button" onClick={() => openItem(n)} className={cls} role="menuitem">{inner}</button>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center">
                <Icon name="notifications_off" size={28} className="text-ink-300 dark:text-neutral-600" />
                <p className="mt-2 text-[13px] text-ink-500 dark:text-neutral-500">You’re all caught up.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
