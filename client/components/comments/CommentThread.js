'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

export default function CommentThread({ bookId, chapterId, variant = 'default' }) {
  const reader = variant === 'reader';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => {
    let abort = false;
    setLoading(true);
    api.get('/comments', { query: { bookId, chapterId, pageSize: 100 } })
      .then((data) => { if (!abort) setItems(data.items || []); })
      .catch(() => { if (!abort) setItems([]); })
      .finally(() => { if (!abort) setLoading(false); });
    return () => { abort = true; };
  }, [bookId, chapterId]);

  const tree = buildTree(items);

  async function postComment({ body, parentId }) {
    try {
      const res = await api.post('/comments', { body, bookId, chapterId, parentId: parentId || null });
      setItems((prev) => [...prev, res.comment]);
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not post comment', message: err.message });
    }
  }

  async function removeComment(id) {
    try {
      await api.delete(`/comments/${id}`);
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'deleted', body: null } : c)));
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not delete comment', message: err.message });
    }
  }

  const hx = reader ? 'text-[var(--reader-fg)]' : 'text-ink-900 dark:text-neutral-100';
  const muted = reader ? 'text-[var(--reader-muted)]' : 'text-ink-400 dark:text-neutral-500';
  const reviewShell = reader
    ? 'border border-[var(--reader-rule)] bg-[var(--reader-bg)] shadow-sm'
    : 'border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950';
  const reviewDivide = reader
    ? 'border-[var(--reader-rule)]'
    : 'border-neutral-200 dark:border-neutral-800';

  return (
    <section className="mt-20 max-w-reading">
      <h2 className={cn('font-serif text-[28px]', hx)}>Discussion</h2>

      {/* Reviews (dummy for now) */}
      <div className={cn('mt-8 rounded-xl overflow-hidden', reviewShell)}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr]">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-4">
              <p className={cn('text-[22px] font-semibold', hx)}>
                6,703Reviews
              </p>
              <div className="flex items-center gap-2">
                <Stars value={4.72} />
                <span className={cn('text-[18px] font-semibold tabular-nums', hx)}>
                  4.72
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <ReviewRow label="Writing Quality" value={4} reader={reader} />
              <ReviewRow label="Stability of Updates" value={4} reader={reader} />
              <ReviewRow label="Story Development" value={4} reader={reader} />
              <ReviewRow label="Character Design" value={4} reader={reader} />
              <ReviewRow label="World Background" value={4} reader={reader} />
            </div>
          </div>

          <div
            className={cn(
              'p-6 md:p-8 border-t md:border-t-0 md:border-l flex flex-col items-center justify-center text-center',
              reviewDivide,
              reader && 'bg-[var(--reader-fg)]/[0.04]',
            )}
          >
            <p className={cn('text-sm', reader ? 'text-[var(--reader-muted)]' : 'text-ink-500 dark:text-neutral-400')}>
              Share your thoughts with others
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#2563eb] text-white px-6 py-3 text-[12px] font-semibold uppercase tracking-widest hover:bg-[#1d4ed8] transition-colors"
            >
              <Icon name="rate_review" size={18} />
              Write a review
            </button>
          </div>
        </div>
      </div>

      {/* Comments */}
      <p className={cn('mt-10 text-[14px] font-medium', reader ? 'text-[var(--reader-fg)]' : muted)}>
        {items.length} {items.length === 1 ? 'comment' : 'comments'}
      </p>
      {user ? (
        <div className="mt-6">
          <CommentForm onSubmit={postComment} reader={reader} />
        </div>
      ) : (
        <p className={cn('mt-6 text-[14px]', muted)}>
          <a
            href="/auth/login"
            className={cn(
              'underline underline-offset-4',
              reader
                ? 'text-[var(--reader-fg)] decoration-[var(--reader-accent)]'
                : 'decoration-gold text-ink-900 dark:text-neutral-100',
            )}
          >
            Sign in
          </a>{' '}
          to join the discussion.
        </p>
      )}

      <div className="mt-10 space-y-8">
        {loading ? (
          <p className={muted}>Loading discussion…</p>
        ) : tree.length === 0 ? (
          <p className={muted}>Be the first to share your thoughts.</p>
        ) : (
          tree.map((node) => (
            <CommentItem
              key={node.id}
              node={node}
              currentUser={user}
              reader={reader}
              onReply={(parentId, body) => postComment({ body, parentId })}
              onDelete={removeComment}
            />
          ))
        )}
      </div>
    </section>
  );
}

function Stars({ value = 0 }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const out = [];
  for (let i = 0; i < full; i += 1) out.push(<Icon key={`f${i}`} name="star" filled size={18} className="text-[#ff8a00]" />);
  if (half) out.push(<Icon key="h" name="star_half" size={18} className="text-[#ff8a00]" />);
  while (out.length < 5) out.push(<Icon key={`e${out.length}`} name="star" size={18} className="text-[#ff8a00]/30" />);
  return <div className="flex items-center gap-1">{out}</div>;
}

function ReviewRow({ label, value = 0, reader = false }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <p
        className={cn(
          'text-sm',
          reader ? 'text-[var(--reader-muted)]' : 'text-ink-600 dark:text-neutral-400',
        )}
      >
        {label}
      </p>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon
            key={String(i)}
            name="star"
            filled={i < value}
            size={16}
            className={i < value ? 'text-[#ff8a00]' : 'text-[#ff8a00]/25'}
          />
        ))}
      </div>
    </div>
  );
}

function buildTree(list) {
  const map = new Map();
  list.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots = [];
  list.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId).children.push(map.get(c.id));
    else roots.push(map.get(c.id));
  });
  const sortRec = (arr) => {
    arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}
