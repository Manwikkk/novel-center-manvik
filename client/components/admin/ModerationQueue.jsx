'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import SuspendUserModal from '@/components/admin/SuspendUserModal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { formatRelative } from '@/lib/format';
import { hasAdminCapability, hasAdminPermission } from '@/lib/adminPermissions';
import { suspensionStatusLabel } from '@/lib/suspensionRestrictions';
import { cn } from '@/lib/cn';

const KIND_LABELS = { comment: 'Comment', review: 'Review', book: 'Novel' };

const REASON_LABELS = {
  spam: 'Spam',
  harassment: 'Harassment',
  spoilers: 'Spoilers',
  inappropriate: 'Inappropriate',
  plagiarism: 'Plagiarism',
  copyright: 'Copyright',
  other: 'Other',
};

function isRestricted(user) {
  return user?.status === 'suspended' || Boolean(user?.suspensionType) || Boolean(user?.restrictions);
}

function targetHref(item) {
  if (item.kind === 'book') return item.book?.slug ? `/books/${item.book.slug}` : null;
  if (item.comment?.chapterId) return `/read/${item.comment.chapterId}`;
  return item.comment?.bookSlug ? `/books/${item.comment.bookSlug}` : null;
}

function reasonList(item) {
  return (item.reasons || []).map((r) => REASON_LABELS[r] || r).join(', ');
}

/**
 * Reported comments, reviews and novels with per-item moderation actions.
 * `items` come from GET /admin/moderation/queue; the parent owns loading,
 * this component reports back removals/updates via `onRemove` / `onUpdate`.
 */
export default function ModerationQueue({
  items,
  compact = false,
  resolvedView = false,
  onRemove,
  onUpdate,
  emptyText = 'No reported content.',
}) {
  const actor = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const canModerate = hasAdminCapability(actor, 'comments.moderate');
  const canSuspend = hasAdminCapability(actor, 'users.suspend')
    || hasAdminCapability(actor, 'comments.suspend_content');
  const canRecycle = hasAdminPermission(actor, 'books') && hasAdminCapability(actor, 'books.delete');

  const [menuFor, setMenuFor] = useState(null); // `${kind}-${targetId}`
  const [busyKey, setBusyKey] = useState(null);
  const [suspendItem, setSuspendItem] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuFor) return undefined;
    function onDoc(e) {
      if (!menuRef.current?.contains(e.target)) setMenuFor(null);
    }
    function onKey(e) {
      if (e.key === 'Escape') setMenuFor(null);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuFor]);

  const keyOf = (item) => `${item.kind}-${item.targetId}`;

  async function resolve(item, resolution, { silent = false } = {}) {
    const res = await api.post('/admin/moderation/resolve', {
      kind: item.kind === 'book' ? 'book' : 'comment',
      targetId: item.targetId,
      resolution,
    });
    if (!silent) {
      pushToast({
        type: 'success',
        title: resolution === 'dismissed' ? 'Reports dismissed' : 'Reports resolved',
        message: `${res.resolved} report${res.resolved === 1 ? '' : 's'} marked as ${resolution}.`,
      });
    }
    onRemove?.(item);
    return res;
  }

  async function run(item, label, fn) {
    const key = keyOf(item);
    setMenuFor(null);
    setBusyKey(key);
    try {
      await fn();
    } catch (err) {
      pushToast({ type: 'error', title: label, message: err.message });
    } finally {
      setBusyKey(null);
    }
  }

  function dismiss(item) {
    run(item, 'Could not dismiss', () => resolve(item, 'dismissed'));
  }

  function setCommentStatus(item, status) {
    run(item, 'Could not update comment', async () => {
      const r = await api.patch(`/admin/comments/${item.targetId}/status`, { status });
      pushToast({ type: 'success', title: `Comment marked ${status}` });
      if (status === 'visible') {
        onUpdate?.({ ...item, comment: { ...item.comment, status: r.comment.status } });
        return;
      }
      // Hiding / deleting handles the reports as well.
      await resolve(item, 'actioned', { silent: true });
    });
  }

  function recycleBook(item) {
    run(item, 'Could not move to recycle bin', async () => {
      await api.post(`/admin/books/${item.targetId}/recycle`);
      pushToast({ type: 'success', title: 'Novel moved to recycle bin' });
      await resolve(item, 'actioned', { silent: true });
    });
  }

  async function confirmSuspension(payload) {
    if (!suspendItem) return;
    const item = suspendItem;
    await run(item, 'Could not suspend member', async () => {
      const r = await api.patch(`/admin/users/${item.author.id}`, payload);
      pushToast({ type: 'success', title: 'Member suspended' });
      onUpdate?.({
        ...item,
        author: {
          ...item.author,
          status: r.user.status,
          suspensionType: r.user.suspensionType,
          suspendedUntil: r.user.suspendedUntil,
          restrictions: r.user.restrictions,
        },
      });
    });
    setSuspendItem(null);
  }

  if (!items?.length) {
    return (
      <div className={cn('text-center text-on-surface-variant text-sm', compact ? 'p-8' : 'border border-outline-variant rounded-md p-12 bg-surface-container-low')}>
        {emptyText}
      </div>
    );
  }

  return (
    <>
      <ul className={cn(
        'divide-y divide-outline-variant',
        !compact && 'border border-outline-variant rounded-md bg-surface-container-lowest',
      )}
      >
        {items.map((item) => {
          const key = keyOf(item);
          const isBook = item.kind === 'book';
          const href = targetHref(item);
          const busy = busyKey === key;
          const authorRestricted = isRestricted(item.author);
          const latest = item.reports?.[0];
          const menuOpen = menuFor === key;

          return (
            <li key={key} className={cn('relative', compact ? 'p-4' : 'p-5', 'hover:bg-surface-container-low transition-colors')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest',
                      isBook
                        ? 'bg-tertiary-fixed/40 text-tertiary-container dark:text-tertiary-fixed-dim'
                        : item.kind === 'review'
                          ? 'bg-surface-container-highest text-on-surface'
                          : 'bg-surface-variant text-on-surface-variant',
                    )}
                    >
                      {KIND_LABELS[item.kind] || item.kind}
                    </span>
                    <span className="font-ui-label-sm text-ui-label-sm font-bold uppercase tracking-widest text-error">
                      {item.reportCount} report{item.reportCount === 1 ? '' : 's'}
                    </span>
                    <span className="text-[11px] text-on-surface-variant truncate">{reasonList(item)}</span>
                    <span className="ml-auto text-[11px] text-outline whitespace-nowrap">
                      {formatRelative(item.latestReportAt)}
                    </span>
                  </div>

                  {isBook ? (
                    <p className="text-sm text-on-surface">
                      <span className="font-semibold">{item.book?.title}</span>
                      {item.book?.recycled ? <span className="ml-2 text-[11px] uppercase tracking-widest text-error">In recycle bin</span> : null}
                    </p>
                  ) : (
                    <p className={cn('text-sm text-on-surface', compact ? 'line-clamp-2' : 'whitespace-pre-line line-clamp-4')}>
                      {item.comment?.body || <em className="text-on-surface-variant">[comment removed]</em>}
                    </p>
                  )}

                  <p className="mt-2 text-[12px] text-on-surface-variant">
                    <span className="text-on-surface font-medium">{item.author?.displayName || 'User'}</span>
                    {authorRestricted ? (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-danger/10 text-danger text-[10px] uppercase tracking-widest">
                        {suspensionStatusLabel(item.author)}
                      </span>
                    ) : null}
                    {!isBook && item.comment?.status && item.comment.status !== 'visible' ? (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px] uppercase tracking-widest">
                        {item.comment.status}
                      </span>
                    ) : null}
                    {!isBook && item.comment?.bookTitle ? (
                      <>
                        {' · '}
                        <span>{item.comment.chapterId ? `Ch. ${item.comment.chapterIdx} of ` : 'On '}“{item.comment.bookTitle}”</span>
                      </>
                    ) : null}
                  </p>

                  {!compact && latest ? (
                    <p className="mt-2 text-[12px] text-on-surface-variant">
                      Latest report by <span className="text-on-surface">{latest.reporter?.displayName || 'reader'}</span>
                      {latest.details ? <>: <span className="italic">“{latest.details}”</span></> : null}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {compact && href ? (
                    <Link
                      href={href}
                      className="bg-primary text-on-primary font-ui-label-sm text-ui-label-sm px-3 py-2 rounded uppercase tracking-widest text-xs text-center"
                    >
                      Review
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setMenuFor(menuOpen ? null : key)}
                    disabled={busy}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="More actions"
                    className="px-3 py-2 border border-outline text-on-surface rounded hover:bg-surface-variant flex items-center justify-center disabled:opacity-50"
                  >
                    {busy ? <Icon name="progress_activity" size={18} className="animate-spin" /> : <Icon name="more_horiz" size={18} />}
                  </button>
                </div>
              </div>

              {menuOpen ? (
                <div
                  ref={menuRef}
                  role="menu"
                  className="absolute right-4 top-14 z-30 min-w-[220px] rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg py-1 text-[13px]"
                >
                  {href ? (
                    <Link
                      href={href}
                      role="menuitem"
                      className="block px-4 py-2.5 text-on-surface hover:bg-surface-container"
                      onClick={() => setMenuFor(null)}
                    >
                      {isBook ? 'Open novel' : 'View in context'}
                    </Link>
                  ) : null}
                  {!resolvedView ? (
                    <>
                      <div className="my-1 h-px bg-outline-variant" />
                      {!isBook && item.comment?.status !== 'hidden' && item.comment?.status !== 'deleted' ? (
                        <MenuButton disabled={!canModerate} onClick={() => setCommentStatus(item, 'hidden')}>
                          Hide {item.kind}
                        </MenuButton>
                      ) : null}
                      {!isBook && item.comment?.status === 'hidden' ? (
                        <MenuButton disabled={!canModerate} onClick={() => setCommentStatus(item, 'visible')}>
                          Restore (make visible)
                        </MenuButton>
                      ) : null}
                      {!isBook && item.comment?.status !== 'deleted' ? (
                        <MenuButton disabled={!canModerate} danger onClick={() => setCommentStatus(item, 'deleted')}>
                          Delete {item.kind}
                        </MenuButton>
                      ) : null}
                      {isBook && !item.book?.recycled ? (
                        <MenuButton disabled={!canRecycle} danger onClick={() => recycleBook(item)}>
                          Move novel to recycle bin
                        </MenuButton>
                      ) : null}
                      <MenuButton disabled={!canModerate} onClick={() => dismiss(item)}>
                        Dismiss reports (keep content)
                      </MenuButton>
                      <div className="my-1 h-px bg-outline-variant" />
                      {authorRestricted ? (
                        <span className="block px-4 py-2 text-[12px] text-on-surface-variant">
                          {item.author?.displayName} is already restricted
                        </span>
                      ) : (
                        <MenuButton
                          disabled={!canSuspend}
                          danger
                          onClick={() => { setMenuFor(null); setSuspendItem(item); }}
                        >
                          Suspend {item.author?.displayName || 'user'}
                        </MenuButton>
                      )}
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <SuspendUserModal
        open={Boolean(suspendItem)}
        user={suspendItem?.author || null}
        busy={suspendItem ? busyKey === keyOf(suspendItem) : false}
        onClose={() => { if (!busyKey) setSuspendItem(null); }}
        onConfirm={confirmSuspension}
      />
    </>
  );
}

function MenuButton({ children, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'You do not have permission for this action' : undefined}
      className={cn(
        'block w-full text-left px-4 py-2.5 hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed',
        danger ? 'text-danger' : 'text-on-surface',
      )}
    >
      {children}
    </button>
  );
}
