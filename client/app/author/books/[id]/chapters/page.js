'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import BookChaptersSection from '@/components/author/BookChaptersSection';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

function BookChaptersInner() {
  const { id } = useParams();
  const pushToast = useUiStore((s) => s.pushToast);
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      try {
        const data = await api.get(`/books/by-id/${id}`);
        if (cancel) return;
        setBook(data.book || null);
        if (data.book) {
          const ch = await api.get(`/books/${id}/chapters`);
          if (!cancel) setChapters(ch.items || []);
        }
      } catch (err) {
        if (!cancel) pushToast({ type: 'error', title: 'Could not load', message: err.message });
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => { cancel = true; };
  }, [id, pushToast]);

  async function deleteChapter(ch) {
    if (!confirm(`Delete "${ch.title}"? It moves to the recycle bin, where an admin can restore it.`)) return;
    try {
      await api.delete(`/chapters/${ch.id}`);
      setChapters((prev) => prev.filter((c) => c.id !== ch.id));
      pushToast({ type: 'success', title: 'Chapter moved to recycle bin' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  }

  if (loading) {
    return (
      <DashboardShell kind="author">
        <DashboardTopbar subtitle="Author studio" title="Loading chapters…" />
      </DashboardShell>
    );
  }

  if (!book) {
    return (
      <DashboardShell kind="author">
        <DashboardTopbar subtitle="Author studio" title="Book not found" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell kind="author">
      <DashboardTopbar
        subtitle="Novels"
        title={book.title}
        actions={
          <Link
            href="/author/books"
            className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-colors"
          >
            All novels
          </Link>
        }
      />
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto w-full">
        <BookChaptersSection
          bookId={id}
          bookTitle={book.title}
          chapters={chapters}
          onDeleteChapter={deleteChapter}
        />
      </div>
    </DashboardShell>
  );
}

export default function BookChaptersPage() {
  return (
    <AuthGuard roles={['author', 'admin']}>
      <BookChaptersInner />
    </AuthGuard>
  );
}
