'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import CommentForm from './CommentForm';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

export default function CommentItem({ node, currentUser, onReply, onDelete, depth = 0, reader = false }) {
  const [replying, setReplying] = useState(false);
  const isOwner = currentUser && currentUser.id === node.author?.id;
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isDeleted = node.status === 'deleted';
  const isHidden = node.status === 'hidden';

  const nestBorder = reader
    ? 'border-l border-[var(--reader-rule)]'
    : 'border-l border-ink-200/60 dark:border-neutral-800';

  return (
    <div className={depth > 0 ? cn('pl-6', nestBorder) : ''}>
      <div className="flex gap-3">
        <Avatar name={node.author?.displayName} src={node.author?.avatarUrl} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                'font-serif text-[16px]',
                reader ? 'text-[var(--reader-fg)]' : 'text-ink-900 dark:text-neutral-100',
              )}
            >
              {node.author?.displayName || 'Reader'}
            </p>
            <span
              className={cn(
                'text-[12px]',
                reader ? 'text-[var(--reader-muted)]' : 'text-ink-400 dark:text-neutral-500',
              )}
            >
              {formatRelative(node.createdAt)}
            </span>
          </div>
          <div
            className={cn(
              'mt-2 text-[15px] whitespace-pre-line',
              reader ? 'text-[var(--reader-fg)]' : 'text-ink-700 dark:text-neutral-300',
            )}
          >
            {isDeleted ? (
              <em className={reader ? 'text-[var(--reader-muted)]' : 'text-ink-400 dark:text-neutral-500'}>
                [comment removed]
              </em>
            ) : isHidden ? (
              <em className={reader ? 'text-[var(--reader-muted)]' : 'text-ink-400 dark:text-neutral-500'}>
                [hidden by moderator]
              </em>
            ) : (
              node.body
            )}
          </div>
          {!isDeleted && !isHidden && (
            <div className="mt-3 flex items-center gap-4">
              {currentUser && (
                <button
                  type="button"
                  onClick={() => setReplying((v) => !v)}
                  className={cn(
                    'label-sm',
                    reader
                      ? 'text-[var(--reader-muted)] hover:text-[var(--reader-fg)]'
                      : 'text-ink-400 dark:text-neutral-500 hover:text-ink-900 dark:hover:text-neutral-200',
                  )}
                >
                  {replying ? 'Cancel' : 'Reply'}
                </button>
              )}
              {(isOwner || isAdmin) && (
                <button
                  type="button"
                  onClick={() => onDelete?.(node.id)}
                  className={cn(
                    'label-sm hover:text-danger',
                    reader ? 'text-[var(--reader-muted)]' : 'text-ink-400 dark:text-neutral-500',
                  )}
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
                onSubmit={async ({ body }) => {
                  await onReply?.(node.id, body);
                  setReplying(false);
                }}
                compact
                reader={reader}
              />
            </div>
          )}
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
              depth={depth + 1}
              reader={reader}
            />
          ))}
        </div>
      )}
    </div>
  );
}
