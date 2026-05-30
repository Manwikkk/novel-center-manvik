'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import CommentForm from './CommentForm';
import ReportCommentModal from './ReportCommentModal';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';
import { openAuthModal } from '@/lib/authModal';
import Icon from '@/components/ui/Icon';
import { StarRatingDisplay, averageRating } from './StarRatingInput';

export default function CommentItem({
  node,
  currentUser,
  onReply,
  onDelete,
  onVote,
  onEdit,
  onEditReview,
  onReport,
  depth = 0,
  reader = false,
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [spoilerOpen, setSpoilerOpen] = useState(false);
  const isOwner = currentUser && currentUser.id === node.author?.id;
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isHidden = node.status === 'hidden';

  if (node.status === 'deleted') return null;
  const isReview = Boolean(node.reviewRatings);
  const reviewScore = isReview ? averageRating(node.reviewRatings) : 0;

  const likeCount = Number(node.likeCount) || 0;
  const dislikeCount = Number(node.dislikeCount) || 0;
  const my = node.myReaction || null;

  const nestBorder = reader
    ? 'border-l border-[var(--reader-rule)]'
    : 'border-l border-ink-200/60 dark:border-neutral-800';

  function nextReaction(clicked) {
    if (clicked === 'like') return my === 'like' ? null : 'like';
    return my === 'dislike' ? null : 'dislike';
  }

  const btnBase = reader
    ? 'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium transition-colors'
    : 'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium transition-colors';

  const likeCls =
    my === 'like'
      ? reader
        ? 'bg-[var(--reader-accent)]/25 text-[var(--reader-fg)]'
        : 'bg-gold/20 text-ink-900 dark:bg-gold/15 dark:text-gold'
      : reader
        ? 'text-[var(--reader-muted)] hover:bg-[var(--reader-fg)]/[0.06] hover:text-[var(--reader-fg)]'
        : 'text-ink-500 hover:bg-cream-200/80 dark:text-neutral-500 dark:hover:bg-neutral-800/80';

  const dislikeCls =
    my === 'dislike'
      ? reader
        ? 'bg-rose-500/20 text-[var(--reader-fg)]'
        : 'bg-rose-500/15 text-rose-800 dark:text-rose-200'
      : reader
        ? 'text-[var(--reader-muted)] hover:bg-[var(--reader-fg)]/[0.06] hover:text-[var(--reader-fg)]'
        : 'text-ink-500 hover:bg-cream-200/80 dark:text-neutral-500 dark:hover:bg-neutral-800/80';

  const spoilerShell = reader
    ? 'rounded-lg border border-[var(--reader-rule)] bg-[var(--reader-fg)]/[0.04] p-4'
    : 'rounded-lg border border-ink-200/70 bg-cream-100/50 dark:border-neutral-800 dark:bg-neutral-900/40 p-4';

  const actionLink = cn(
    'label-sm',
    reader
      ? 'text-[var(--reader-muted)] hover:text-[var(--reader-fg)]'
      : 'text-ink-400 dark:text-neutral-500 hover:text-ink-900 dark:hover:text-neutral-200',
  );

  function startEdit() {
    if (isReview) {
      onEditReview?.(node);
      return;
    }
    setEditing(true);
    setReplying(false);
  }

  function openReport() {
    if (!currentUser) {
      openAuthModal({ message: 'Sign in to report this comment.' });
      return;
    }
    setReportOpen(true);
  }

  return (
    <div className={depth > 0 ? cn('pl-6', nestBorder) : ''}>
      <div className="flex gap-3">
        <Avatar name={node.author?.displayName} src={node.author?.avatarUrl} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                'font-serif text-[16px]',
                reader ? 'text-[var(--reader-fg)]' : 'text-ink-900 dark:text-neutral-100',
              )}
            >
              {node.author?.displayName || 'Reader'}
            </p>
            {isReview && !isHidden && (
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  reader
                    ? 'bg-[#ff8a00]/20 text-[var(--reader-fg)]'
                    : 'bg-[#ff8a00]/15 text-ink-800 dark:text-[#ff8a00]',
                )}
              >
                Review · {reviewScore.toFixed(1)}
              </span>
            )}
            {node.isSpoiler && !isHidden && (
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  reader
                    ? 'bg-[var(--reader-accent)]/20 text-[var(--reader-fg)]'
                    : 'bg-ink-900 text-cream-50 dark:bg-neutral-700 dark:text-neutral-200',
                )}
              >
                Spoiler
              </span>
            )}
            <span
              className={cn(
                'text-[12px]',
                reader ? 'text-[var(--reader-muted)]' : 'text-ink-400 dark:text-neutral-500',
              )}
            >
              {formatRelative(node.createdAt)}
            </span>
          </div>

          {isReview && !isHidden && (node.isSpoiler ? spoilerOpen : true) && (
            <div className="mt-2 mb-2">
              <StarRatingDisplay value={reviewScore} size={16} />
            </div>
          )}

          <div
            className={cn(
              'mt-2 text-[15px] whitespace-pre-line',
              reader ? 'text-[var(--reader-fg)]' : 'text-ink-700 dark:text-neutral-300',
            )}
          >
            {editing && !isReview ? (
              <div>
                <CommentForm
                  compact
                  reader={reader}
                  initialBody={node.body || ''}
                  initialIsSpoiler={Boolean(node.isSpoiler)}
                  submitLabel="Save"
                  placeholder="Edit your comment…"
                  onSubmit={async ({ body, isSpoiler }) => {
                    await onEdit?.(node.id, { body, isSpoiler });
                    setEditing(false);
                  }}
                />
                <button type="button" onClick={() => setEditing(false)} className={cn('mt-2', actionLink)}>
                  Cancel
                </button>
              </div>
            ) : isHidden ? (
              <em className={reader ? 'text-[var(--reader-muted)]' : 'text-ink-400 dark:text-neutral-500'}>
                [hidden by moderator]
              </em>
            ) : node.isSpoiler && !spoilerOpen ? (
              <div className={spoilerShell}>
                <p className={cn('text-sm', reader ? 'text-[var(--reader-muted)]' : 'text-ink-600 dark:text-neutral-400')}>
                  This message may contain spoilers.
                </p>
                <button
                  type="button"
                  onClick={() => setSpoilerOpen(true)}
                  className={cn(
                    'mt-3 text-[12px] font-semibold uppercase tracking-widest underline underline-offset-4',
                    reader
                      ? 'text-[var(--reader-fg)] decoration-[var(--reader-accent)]'
                      : 'text-ink-900 decoration-gold dark:text-neutral-100',
                  )}
                >
                  Show comment
                </button>
              </div>
            ) : (
              node.body
            )}
          </div>

          {!isHidden && !editing && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1 tabular-nums">
                <button
                  type="button"
                  disabled={!currentUser || !onVote}
                  title={currentUser ? (my === 'like' ? 'Remove like' : 'Like') : 'Sign in to react'}
                  onClick={() => onVote?.(node.id, nextReaction('like'))}
                  className={cn(btnBase, likeCls, !currentUser && 'cursor-not-allowed opacity-50')}
                >
                  <Icon name="thumb_up" filled={my === 'like'} size={16} />
                  <span>{likeCount}</span>
                </button>
                <button
                  type="button"
                  disabled={!currentUser || !onVote}
                  title={currentUser ? (my === 'dislike' ? 'Remove dislike' : 'Dislike') : 'Sign in to react'}
                  onClick={() => onVote?.(node.id, nextReaction('dislike'))}
                  className={cn(btnBase, dislikeCls, !currentUser && 'cursor-not-allowed opacity-50')}
                >
                  <Icon name="thumb_down" filled={my === 'dislike'} size={16} />
                  <span>{dislikeCount}</span>
                </button>
              </div>
              {currentUser && (
                <button
                  type="button"
                  onClick={() => setReplying((v) => !v)}
                  className={actionLink}
                >
                  {replying ? 'Cancel' : 'Reply'}
                </button>
              )}
              {isOwner && (
                <button type="button" onClick={startEdit} className={actionLink}>
                  Edit
                </button>
              )}
              <button type="button" onClick={openReport} className={actionLink}>
                Report
              </button>
              {(isOwner || isAdmin) && (
                <button
                  type="button"
                  onClick={() => onDelete?.(node.id)}
                  className={cn('label-sm hover:text-danger', actionLink)}
                >
                  Delete
                </button>
              )}
            </div>
          )}
          {replying && (
            <div className="mt-3">
              <CommentForm
                placeholder="Write a thoughtful reply…"
                onSubmit={async ({ body, isSpoiler }) => {
                  await onReply?.(node.id, body, isSpoiler);
                  setReplying(false);
                }}
                compact
                reader={reader}
              />
            </div>
          )}
          <ReportCommentModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            reader={reader}
            onSubmit={async (payload) => {
              await onReport?.(node.id, payload);
            }}
          />
        </div>
      </div>

      {node.children?.length > 0 && (
        <div className="mt-6 ml-12 space-y-6">
          {node.children.map((c) => (
            <CommentItem
              key={c.id}
              node={c}
              currentUser={currentUser}
              onReply={onReply}
              onDelete={onDelete}
              onVote={onVote}
              onEdit={onEdit}
              onEditReview={onEditReview}
              onReport={onReport}
              depth={depth + 1}
              reader={reader}
            />
          ))}
        </div>
      )}
    </div>
  );
}
