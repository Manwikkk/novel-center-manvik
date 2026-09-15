'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { openAuthModal } from '@/lib/authModal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import AddChapterCommentModal from './AddChapterCommentModal';
import ReportCommentModal from './ReportCommentModal';
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
  const [editNode, setEditNode] = useState(null);

  const sort = tab === 'liked' ? 'likes' : 'newest';

  // Latest count callback without making it a fetch dependency (a parent re-render
  // with a fresh callback must not refetch the thread).
  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => { onCountChangeRef.current = onCountChange; }, [onCountChange]);

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
      onCountChangeRef.current?.(total);
      setPage(pageNum);
      return data;
    },
    [chapterId, sort],
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
      .then((d) => onCountChangeRef.current?.(Number(d.totalRoots) || 0))
      .catch(() => {});
  }, [chapterId]);

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
    if (!user) {
      openAuthModal({ message: 'Sign in to react to comments.' });
      return;
    }
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

  async function editComment(id, payload) {
    try {
      const res = await api.patch(`/comments/${id}`, payload);
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...res.comment } : c)));
      pushToast({ type: 'success', title: 'Comment updated' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update comment', message: err.message });
      throw err;
    }
  }

  async function removeComment(id) {
    try {
      await api.delete(`/comments/${id}`);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not delete comment', message: err.message });
    }
  }

  async function reportComment(id, { reason, details }) {
    try {
      await api.post(`/comments/${id}/report`, { reason, details });
      pushToast({
        type: 'success',
        title: 'Report submitted',
        message: 'Thank you for helping keep the community safe.',
      });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not submit report', message: err.message });
      throw err;
    }
  }

  function openEdit(node) {
    if (!user) {
      openAuthModal({
        message: 'Sign in to edit your comment.',
        onSuccess: () => openEdit(node),
      });
      return;
    }
    setEditNode(node);
    setModalOpen(true);
  }

  function closeComposer() {
    setModalOpen(false);
    setReplyParentId(null);
    setEditNode(null);
  }

  function openComposer(parentId = null) {
    if (!user) {
      openAuthModal({
        message: 'Sign in to join the discussion.',
        onSuccess: () => openComposer(parentId),
      });
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
      {/* The panel lives inside the reader, so it follows the reader theme
          (cream / sepia / dark) rather than the site-wide dark mode. */}
      <div
        className="fixed top-0 bottom-0 z-[48] flex flex-col border-l border-[var(--reader-rule)] bg-[var(--reader-bg)] text-[var(--reader-fg)] shadow-2xl"
        style={{ right: railPx, width: PANEL_W }}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--reader-rule)] shrink-0">
          <div className="min-w-0">
            <h2 className="font-semibold text-[15px] text-[var(--reader-fg)] truncate">
              Chapter comments
            </h2>
            <p className="text-[12px] text-[var(--reader-muted)] tabular-nums">
              {totalRoots}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--reader-muted)] hover:bg-[var(--reader-fg)]/[0.06] hover:text-[var(--reader-fg)]"
            aria-label="Close comments"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <div className="px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={() => openComposer(null)}
            className="w-full rounded-full border border-[var(--reader-rule)] bg-[var(--reader-fg)]/[0.04] px-4 py-2.5 text-left text-[14px] text-[var(--reader-muted)] hover:bg-[var(--reader-fg)]/[0.08] transition-colors"
          >
            What&apos;s your thought?
          </button>
        </div>

        <div className="flex border-b border-[var(--reader-rule)] shrink-0">
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
                  : 'text-[var(--reader-muted)] border-b-2 border-transparent',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-[var(--reader-muted)] py-8 text-center">Loading…</p>
          ) : tree.length === 0 ? (
            <p className="text-sm text-[var(--reader-muted)] py-8 text-center">
              No comments yet. Be the first.
            </p>
          ) : (
            <ul className="space-y-5">
              {tree.map((node) => (
                <ChapterCommentRow
                  key={node.id}
                  node={node}
                  user={user}
                  onVote={voteComment}
                  onReply={openComposer}
                  onEdit={openEdit}
                  onDelete={removeComment}
                  onReport={reportComment}
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
        onClose={closeComposer}
        title={editNode ? 'Edit comment' : replyParentId ? 'Add a reply' : 'Add a Chapter Comment'}
        initialBody={editNode?.body || ''}
        submitLabel={editNode ? 'Save' : 'Add'}
        onSubmit={async ({ body }) => {
          if (editNode) {
            await editComment(editNode.id, { body });
            closeComposer();
          } else {
            await postComment({ body, parentId: replyParentId });
          }
        }}
      />
    </>
  );
}

function ChapterCommentRow({
  node,
  user,
  onVote,
  onReply,
  onEdit,
  onDelete,
  onReport,
  replyToName = null,
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const isHidden = node.status === 'hidden';
  const isOwner = user && user.id === node.author?.id;
  const isAdmin = user && user.role === 'admin';

  if (node.status !== 'visible') return null;
  const likeCount = Number(node.likeCount) || 0;
  const dislikeCount = Number(node.dislikeCount) || 0;
  const my = node.myReaction || null;
  const replyCount = node.children?.length || 0;

  function nextReaction(clicked) {
    if (clicked === 'like') return my === 'like' ? null : 'like';
    return my === 'dislike' ? null : 'dislike';
  }

  function openReport() {
    if (!user) {
      openAuthModal({ message: 'Sign in to report this comment.' });
      return;
    }
    setReportOpen(true);
  }

  const actionLink = 'hover:text-[var(--reader-fg)]';
  // Readers cannot react to their own comments (the API rejects it too).
  const reactTitle = isOwner ? "You can't react to your own comment" : undefined;

  return (
    <li>
      <div className="flex gap-2.5">
        <Avatar name={node.author?.displayName} src={node.author?.avatarUrl} size={32} />
        <div className="flex-1 min-w-0">
          {replyToName ? (
            <p className="mb-1 text-[11px] text-[var(--reader-muted)]">
              Replied to{' '}
              <span className="font-medium text-[var(--reader-fg)]">{replyToName}</span>
            </p>
          ) : null}
          <p className="font-semibold text-[13px] text-[var(--reader-fg)] truncate">
            {node.author?.displayName || 'Reader'}
          </p>
          <p className="mt-1 text-[14px] leading-snug text-[var(--reader-fg)] opacity-85 whitespace-pre-line">
            {isHidden ? <em className="text-[var(--reader-muted)]">[hidden]</em> : node.body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--reader-muted)]">
            <span>{formatRelative(node.createdAt)}</span>
            <button
              type="button"
              disabled={isOwner}
              title={reactTitle}
              onClick={() => onVote(node.id, nextReaction('like'))}
              className={cn(
                'inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-60',
                my === 'like' && 'text-[#2563eb] font-medium',
              )}
            >
              <Icon name="thumb_up" filled={my === 'like'} size={14} />
              {likeCount > 0 ? likeCount : null}
            </button>
            <button
              type="button"
              disabled={isOwner}
              title={reactTitle}
              onClick={() => onVote(node.id, nextReaction('dislike'))}
              className={cn(
                'inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-60',
                my === 'dislike' && 'text-rose-500 font-medium',
              )}
            >
              <Icon name="thumb_down" filled={my === 'dislike'} size={14} />
              {dislikeCount > 0 ? dislikeCount : null}
            </button>
            <button
              type="button"
              onClick={() => onReply(node.id)}
              className={cn('inline-flex items-center gap-1', actionLink)}
            >
              <Icon name="chat_bubble_outline" size={14} />
              Reply
            </button>
            {isOwner && (
              <button type="button" onClick={() => onEdit(node)} className={actionLink}>
                Edit
              </button>
            )}
            {(isOwner || isAdmin) && (
              <button
                type="button"
                onClick={() => onDelete(node.id)}
                className={cn(actionLink, 'hover:text-rose-500')}
              >
                Delete
              </button>
            )}
            <button type="button" onClick={openReport} className={actionLink}>
              Report
            </button>
          </div>
          <ReportCommentModal
            open={reportOpen}
            reader
            onClose={() => setReportOpen(false)}
            onSubmit={async (payload) => {
              await onReport?.(node.id, payload);
            }}
          />
          {replyCount > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies((v) => !v)}
              className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-[#2563eb]"
            >
              {showReplies ? 'Hide' : `View ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}`}
            </button>
          )}
        </div>
      </div>
      {showReplies && replyCount > 0 && (
        <ul className="mt-3 space-y-5">
          {node.children.map((child) => (
            <ChapterCommentRow
              key={child.id}
              node={child}
              user={user}
              onVote={onVote}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReport={onReport}
              replyToName={node.author?.displayName || 'Reader'}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
