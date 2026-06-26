import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import NCText from '@/components/primitives/Text';
import Skeleton from '@/components/primitives/Skeleton';
import EmptyState from '@/components/primitives/EmptyState';
import CommentItem from '@/components/comments/CommentItem';
import CommentComposer from '@/components/comments/CommentComposer';
import { api } from '@/lib/api';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

/** True for top-level comments (no parent). */
function isRootComment(c) {
  const p = c.parentId;
  return p == null || p === undefined;
}

function directChildren(comments, parentId) {
  return comments
    .filter((c) => {
      const pid = c.parentId;
      if (pid == null || pid === undefined) return false;
      return Number(pid) === Number(parentId);
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Renders one comment and all nested replies (unlimited depth).
 * Previous UI only listed direct children of roots, so replies-to-replies never appeared.
 */
function CommentSubtree({ comment, comments, depth, onReply }) {
  const children = directChildren(comments, comment.id);
  return (
    <View style={{ gap: 12 }}>
      <CommentItem comment={comment} onReply={onReply} depth={depth} />
      {children.length > 0 ? (
        <View style={{ gap: 12 }}>
          {children.map((child) => (
            <CommentSubtree
              key={child.id}
              comment={child}
              comments={comments}
              depth={depth + 1}
              onReply={onReply}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Hierarchical comment thread for a chapter or book.
 * The API returns flat comments; we group by parentId on the client.
 */
export default function CommentThread({ chapterId, bookId }) {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = chapterId
        ? { chapterId, pageSize: 100 }
        : { bookId, pageSize: 100 };
      const data = await api.get('/comments', { query });
      setComments(data?.items || []);
    } catch (_e) {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [chapterId, bookId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (body) => {
    if (!user) {
      pushToast({ type: 'info', title: 'Sign in to comment' });
      return;
    }
    setBusy(true);
    try {
      const payload = chapterId ? { chapterId } : { bookId };
      payload.body = body;
      if (replyingTo) payload.parentId = replyingTo.id;
      await api.post('/comments', payload);
      setReplyingTo(null);
      load();
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not post', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  // Flat list from API — build an arbitrary-depth tree by walking parentId links.
  const roots = comments.filter(isRootComment).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return (
    <View style={{ gap: 16 }}>
      <NCText variant="uiLabelSm" tone="muted">DISCUSSION</NCText>

      {loading ? (
        <View style={{ gap: 12 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <Skeleton width={32} height={32} radius={16} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton height={12} width="40%" />
                <Skeleton height={14} width="80%" />
                <Skeleton height={14} width="60%" />
              </View>
            </View>
          ))}
        </View>
      ) : roots.length === 0 ? (
        <EmptyState
          icon="chat-bubble-outline"
          title="Be the first to comment"
          description="Share a passage that landed, or a quiet thought."
        />
      ) : (
        <View style={{ gap: 18 }}>
          {roots.map((root) => (
            <CommentSubtree key={root.id} comment={root} comments={comments} depth={0} onReply={setReplyingTo} />
          ))}
        </View>
      )}

      <View style={{ height: 1, backgroundColor: t.colors.containerHigh, marginTop: 8 }} />

      {user ? (
        <CommentComposer
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onSubmit={submit}
          busy={busy}
        />
      ) : (
        <View style={{ padding: 14, borderWidth: 1, borderColor: t.colors.containerHigh, borderRadius: t.radii.md }}>
          <NCText variant="bodySm" tone="muted">Sign in to share your thoughts.</NCText>
        </View>
      )}
    </View>
  );
}
