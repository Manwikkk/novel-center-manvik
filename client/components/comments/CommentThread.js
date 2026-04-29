'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';

export default function CommentThread({ bookId, chapterId }) {
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

  return (
    <section className="mt-20 max-w-reading">
      <h2 className="font-serif text-[28px] text-ink-900">Discussion</h2>
      <p className="mt-2 text-[14px] text-ink-400">
        {items.length} {items.length === 1 ? 'comment' : 'comments'}
      </p>
      {user ? (
        <div className="mt-6">
          <CommentForm onSubmit={postComment} />
        </div>
      ) : (
        <p className="mt-6 text-[14px] text-ink-400">
          <a href="/auth/login" className="underline decoration-gold underline-offset-4 text-ink-900">Sign in</a>{' '}
          to join the discussion.
        </p>
      )}

      <div className="mt-10 space-y-8">
        {loading ? (
          <p className="text-ink-400">Loading discussion…</p>
        ) : tree.length === 0 ? (
          <p className="text-ink-400">Be the first to share your thoughts.</p>
        ) : (
          tree.map((node) => (
            <CommentItem
              key={node.id}
              node={node}
              currentUser={user}
              onReply={(parentId, body) => postComment({ body, parentId })}
              onDelete={removeComment}
            />
          ))
        )}
      </div>
    </section>
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
