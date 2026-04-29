'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import CommentForm from './CommentForm';
import { formatRelative } from '@/lib/format';

export default function CommentItem({ node, currentUser, onReply, onDelete, depth = 0 }) {
  const [replying, setReplying] = useState(false);
  const isOwner = currentUser && currentUser.id === node.author?.id;
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isDeleted = node.status === 'deleted';
  const isHidden = node.status === 'hidden';

  return (
    <div className={depth > 0 ? 'pl-6 border-l border-ink-200/60' : ''}>
      <div className="flex gap-3">
        <Avatar name={node.author?.displayName} src={node.author?.avatarUrl} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[16px] text-ink-900">
              {node.author?.displayName || 'Reader'}
            </p>
            <span className="text-[12px] text-ink-400">{formatRelative(node.createdAt)}</span>
          </div>
          <div className="mt-2 text-[15px] text-ink-700 whitespace-pre-line">
            {isDeleted ? <em className="text-ink-400">[comment removed]</em>
              : isHidden ? <em className="text-ink-400">[hidden by moderator]</em>
              : node.body}
          </div>
          {!isDeleted && !isHidden && (
            <div className="mt-3 flex items-center gap-4">
              {currentUser && (
                <button onClick={() => setReplying((v) => !v)} className="label-sm text-ink-400 hover:text-ink-900">
                  {replying ? 'Cancel' : 'Reply'}
                </button>
              )}
              {(isOwner || isAdmin) && (
                <button onClick={() => onDelete?.(node.id)} className="label-sm text-ink-400 hover:text-danger">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
