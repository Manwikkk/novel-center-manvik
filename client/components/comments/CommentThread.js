'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 5;

function mergeById(existing, incoming) {
  const map = new Map(existing.map((c) => [c.id, c]));
  for (const c of incoming) map.set(c.id, c);
  return Array.from(map.values());
}

export default function CommentThread({ bookId, chapterId, variant = 'default' }) {
  const reader = variant === 'reader';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState('oldest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalRoots, setTotalRoots] = useState(0);
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);

  const queryBase = { bookId, chapterId, pageSize: PAGE_SIZE, sort };

  const fetchPage = useCallback(
    async (pageNum, { append } = { append: false }) => {
      const data = await api.get('/comments', {
        query: { ...queryBase, page: pageNum },
      });
      const next = data.items || [];
      setItems((prev) => (append ? mergeById(prev, next) : next));
      setHasMore(Boolean(data.hasMore));
      setTotalRoots(Number(data.totalRoots) || 0);
      setPage(pageNum);
      return data;
    },
    [bookId, chapterId, sort],
  );

  useEffect(() => {
    let abort = false;
    setLoading(true);
    setPage(1);
    fetchPage(1, { append: false })
      .catch(() => {
        if (!abort) setItems([]);
      })
      .finally(() => {
        if (!abort) setLoading(false);
      });
    return () => {
      abort = true;
    };
  }, [bookId, chapterId, sort, fetchPage]);

  const tree = buildTree(items);

  async function postComment({ body, parentId, isSpoiler }) {
    try {
      const res = await api.post('/comments', {
        body,
        bookId,
        chapterId,
        parentId: parentId || null,
        isSpoiler: Boolean(isSpoiler),
      });
      if (!parentId) {
        await fetchPage(1, { append: false });
      } else {
        setItems((prev) => [...prev, res.comment]);
      }
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

  async function voteComment(id, reaction) {
    if (!user) return;
    try {
      const out = await api.patch(`/comments/${id}/reaction`, { reaction });
      setItems((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                likeCount: out.likeCount,
                dislikeCount: out.dislikeCount,
                myReaction: out.myReaction,
              }
            : c,
        ),
      );
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update reaction', message: err.message });
    }
  }

  async function handleLoadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(page + 1, { append: true });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not load more', message: err.message });
    } finally {
      setLoadingMore(false);
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

  const selectCls = reader
    ? cn(
        'rounded-md border border-[var(--reader-rule)] bg-[var(--reader-fg)]/[0.06]',
        'px-3 py-2 text-[13px] text-[var(--reader-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--reader-accent)]/40',
      )
    : cn(
        'rounded-md border border-ink-200/70 bg-cream-50 px-3 py-2 text-[13px] text-ink-900',
        'dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
        'focus:outline-none focus:ring-2 focus:ring-ink-900/15 dark:focus:ring-neutral-500/30',
      );

  return (
    <section className="mt-20 max-w-reading">
      <h2 className={cn('font-serif text-[28px]', hx)}>Discussion</h2>

      <div className={cn('mt-8 rounded-xl overflow-hidden', reviewShell)}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr]">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-4">
              <p className={cn('text-[22px] font-semibold', hx)}>6,703Reviews</p>
              <div className="flex items-center gap-2">
                <Stars value={4.72} />
                <span className={cn('text-[18px] font-semibold tabular-nums', hx)}>4.72</span>
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

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={cn('text-[14px] font-medium', reader ? 'text-[var(--reader-fg)]' : muted)}>
          {loading ? '…' : `${items.length} message${items.length === 1 ? '' : 's'} loaded`}
          {!loading && totalRoots > 0 && (
            <span className={cn('ml-2 font-normal', muted)}>· {totalRoots} top-level thread{totalRoots === 1 ? '' : 's'}</span>
          )}
        </p>
        <label className={cn('flex items-center gap-2 text-[13px]', muted)}>
          <span className="whitespace-nowrap">Sort threads by</span>
          <select
            className={selectCls}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort discussion threads"
          >
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
            <option value="likes">Most likes</option>
            <option value="dislikes">Most dislikes</option>
          </select>
        </label>
      </div>

      {user ? (
        <div className="mt-6">
          <CommentForm
            onSubmit={({ body, isSpoiler }) => postComment({ body, parentId: null, isSpoiler })}
            reader={reader}
          />
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
          to join the discussion and react to comments.
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
              onReply={(parentId, body, isSpoiler) => postComment({ body, parentId, isSpoiler })}
              onDelete={removeComment}
              onVote={voteComment}
            />
          ))
        )}
      </div>

      {hasMore && !loading && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={cn(
              'inline-flex min-w-[200px] items-center justify-center rounded-full border px-8 py-3 text-[12px] font-semibold uppercase tracking-widest transition-colors',
              reader
                ? 'border-[var(--reader-rule)] text-[var(--reader-fg)] hover:bg-[var(--reader-fg)]/[0.06] disabled:opacity-50'
                : 'border-ink-200 text-ink-900 hover:bg-cream-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-50',
            )}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
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
