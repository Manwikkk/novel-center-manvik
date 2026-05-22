'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import AddChapterCommentModal from './AddChapterCommentModal';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';
import { buildCommentTree } from './commentUtils';

const PAGE_SIZE = 20;
const PANEL_W = 'min(100vw - 3.5rem, 22rem)';

function mergeById(existing, incoming) {
  const map = new Map(existing.map((c) => [c.id, c]));
  for (const c of incoming) map.set(c.id, c);
  return Array.from(map.values());
}

export default function ChapterCommentsPanel({
  chapterId,
  open,
  onClose,
  railPx = 56,
  onCountChange,
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState('liked'); // liked | newest
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalRoots, setTotalRoots] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [replyParentId, setReplyParentId] = useState(null);

  const sort = tab === 'liked' ? 'likes' : 'newest';

  const fetchPage = useCallback(
    async (pageNum, { append } = { append: false }) => {
      const data = await api.get('/comments', {
        query: { chapterId, pageSize: PAGE_SIZE, page: pageNum, sort },
      });
      const next = data.items || [];
      setItems((prev) => (append ? mergeById(prev, next) : next));
      setHasMore(Boolean(data.hasMore));
      const total = Number(data.totalRoots) || 0;
      setTotalRoots(total);
      onCountChange?.(total);
      setPage(pageNum);
      return data;
    },
    [chapterId, sort, onCountChange],
  );

  useEffect(() => {
    if (!open || !chapterId) return;
    let abort = false;
    setLoading(true);
    setPage(1);
    fetchPage(1, { append: false })
      .catch(() => { if (!abort) setItems([]); })
      .finally(() => { if (!abort) setLoading(false); });
    return () => { abort = true; };
  }, [open, chapterId, sort, fetchPage]);

  useEffect(() => {
    if (!chapterId) return;
    api
      .get('/comments', { query: { chapterId, pageSize: 1, page: 1, sort: 'newest' } })
      .then((d) => onCountChange?.(Number(d.totalRoots) || 0))
      .catch(() => {});
  }, [chapterId, onCountChange]);

  const tree = buildCommentTree(items);

  async function postComment({ body, parentId }) {
    try {
      const res = await api.post('/comments', {
        body,
        chapterId,
        parentId: parentId || null,
        isSpoiler: false,
      });
      if (!parentId) {
        await fetchPage(1, { append: false });
      } else {
        setItems((prev) => [...prev, res.comment]);
      }
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not post comment', message: err.message });
      throw err;
    }
  }

  async function voteComment(id, reaction) {
    if (!user) return;
    try {
      const out = await api.patch(`/comments/${id}/reaction`, { reaction });
      setItems((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, likeCount: out.likeCount, dislikeCount: out.dislikeCount, myReaction: out.myReaction }
            : c,
        ),
      );
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update reaction', message: err.message });
    }
  }

  function openComposer(parentId = null) {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setReplyParentId(parentId);
    setModalOpen(true);
  }

  async function handleLoadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(page + 1, { append: true });
    } finally {
      setLoadingMore(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed top-0 bottom-0 z-[48] flex flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        style={{ right: railPx, width: PANEL_W }}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="min-w-0">
            <h2 className="font-semibold text-[15px] text-ink-900 dark:text-neutral-100 truncate">
              Chapter comments
            </h2>
            <p className="text-[12px] text-ink-400 dark:text-neutral-500 tabular-nums">
              {totalRoots}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-ink-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close comments"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={() => openComposer(null)}
            className="w-full rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-left text-[14px] text-ink-400 hover:border-neutral-300 hover:bg-neutral-100 transition-colors dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:border-neutral-600"
          >
            What&apos;s your thought?
          </button>
        </div>

        <div className="flex border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          {[
            { id: 'liked', label: 'Liked' },
            { id: 'newest', label: 'Newest' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 py-2.5 text-[12px] font-semibold uppercase tracking-wider transition-colors',
                tab === id
                  ? 'text-[#2563eb] border-b-2 border-[#2563eb]'
                  : 'text-ink-400 border-b-2 border-transparent dark:text-neutral-500',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-ink-400 dark:text-neutral-500 py-8 text-center">Loading…</p>
          ) : tree.length === 0 ? (
            <p className="text-sm text-ink-400 dark:text-neutral-500 py-8 text-center">
              No comments yet. Be the first.
            </p>
          ) : (
            <ul className="space-y-5">
              {tree.map((node) => (
                <ChapterCommentRow
                  key={node.id}
                  node={node}
                  user={user}
                  onLike={voteComment}
                  onReply={openComposer}
                />
              ))}
            </ul>
          )}
          {hasMore && !loading && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-4 w-full py-2 text-[12px] font-semibold uppercase tracking-wider text-[#2563eb] disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      </div>

      <AddChapterCommentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setReplyParentId(null);
        }}
        title={replyParentId ? 'Add a reply' : 'Add a Chapter Comment'}
        onSubmit={({ body }) => postComment({ body, parentId: replyParentId })}
      />
    </>
  );
}

function ChapterCommentRow({ node, user, onLike, onReply, depth = 0 }) {
  const [showReplies, setShowReplies] = useState(false);
  const isHidden = node.status === 'hidden';

  if (node.status !== 'visible') return null;
  const likeCount = Number(node.likeCount) || 0;
  const myLike = node.myReaction === 'like';
  const replyCount = node.children?.length || 0;

  return (
    <li>
      <div className="flex gap-2.5">
        <Avatar name={node.author?.displayName} src={node.author?.avatarUrl} size={32} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[13px] text-ink-900 dark:text-neutral-100 truncate">
            {node.author?.displayName || 'Reader'}
          </p>
          <p className="mt-1 text-[14px] leading-snug text-ink-600 dark:text-neutral-400 whitespace-pre-line">
            {isHidden ? <em className="text-ink-400">[hidden]</em> : node.body}
          </p>
          <div className="mt-2 flex items-center gap-3 text-[12px] text-ink-400 dark:text-neutral-500">
            <span>{formatRelative(node.createdAt)}</span>
            <button
              type="button"
              disabled={!user}
              onClick={() => onLike(node.id, myLike ? null : 'like')}
              className={cn(
                'inline-flex items-center gap-1',
                myLike && 'text-[#2563eb] font-medium',
                !user && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Icon name="thumb_up" filled={myLike} size={14} />
              {likeCount > 0 ? likeCount : null}
            </button>
            <button
              type="button"
              disabled={!user}
              onClick={() => onReply(node.id)}
              className={cn('inline-flex items-center gap-1', !user && 'opacity-50 cursor-not-allowed')}
            >
              <Icon name="chat_bubble_outline" size={14} />
              Reply
            </button>
          </div>
          {replyCount > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies((v) => !v)}
              className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-[#2563eb]"
            >
              {showReplies ? 'Hide' : `View ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}`}
            </button>
          )}
          {showReplies && replyCount > 0 && (
            <ul className="mt-3 space-y-3 pl-2 border-l border-neutral-200 dark:border-neutral-700">
              {node.children.map((child) => (
                <ChapterCommentRow
                  key={child.id}
                  node={child}
                  user={user}
                  onLike={onLike}
                  onReply={onReply}
                  depth={depth + 1}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}
