'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import BookEditorForm from '@/components/author/BookEditorForm';
import BookPublishBar from '@/components/author/BookPublishBar';
import CoverUploader from '@/components/author/CoverUploader';
import { FormSection } from '@/components/author/BookFormFields';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { formatDate } from '@/lib/format';
function BookEditInner() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const pushToast = useUiStore((s) => s.pushToast);
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [creatingChapter, setCreatingChapter] = useState(false);

  useEffect(() => {
    if (searchParams.get('created') !== '1') return;
    pushToast({
      type: 'success',
      title: 'Book created',
      message: 'Save any edits and add your first chapter below.',
    });
    window.history.replaceState(null, '', `/author/books/${id}/edit`);
  }, [searchParams, id, pushToast]);

  useEffect(() => {
    let cancel = false;
    async function load() {
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
      }
    }
    load();
    return () => { cancel = true; };
  }, [id, pushToast]);

  async function addChapter() {
    if (!book) return;
    setCreatingChapter(true);
    try {
      const r = await api.post(`/books/${book.id}/chapters`, {
        title: 'Untitled chapter',
        contentHtml: '<p></p>',
        isPaid: false,
        tokenPrice: 0,
        status: 'draft',
      });
      setChapters((prev) => [...prev, r.chapter]);
      pushToast({ type: 'success', title: 'Chapter created' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not create chapter', message: err.message });
    } finally {
      setCreatingChapter(false);
    }
  }

  async function deleteChapter(ch) {
    if (!confirm(`Delete "${ch.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/chapters/${ch.id}`);
      setChapters((prev) => prev.filter((c) => c.id !== ch.id));
    } catch (err) {
      pushToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  }

  if (!book) {
    return (
      <DashboardShell kind="author">
        <DashboardTopbar subtitle="Author studio" title="Loading book…" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell kind="author">
      <DashboardTopbar
        subtitle="Author studio"
        title={book.title}
        actions={
          book.status === 'published' ? (
            <Link
              href={`/books/${book.slug}`}
              className="text-[12px] font-bold uppercase tracking-wider text-studio-accent hover:underline"
            >
              View public page
            </Link>
          ) : null
        }
      />
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto w-full space-y-8">
        <BookPublishBar book={book} onUpdated={setBook} />

        <div className="grid xl:grid-cols-[1fr_280px] gap-6 items-start">
          <BookEditorForm book={book} onSaved={setBook} />
          <FormSection title="Cover" className="xl:sticky xl:top-6">
            <CoverUploader book={book} onUpdated={setBook} />
          </FormSection>
        </div>

        <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-surface-variant">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-on-surface">Chapters</h2>
            <button
              type="button"
              onClick={addChapter}
              disabled={creatingChapter}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-[12px] font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
            >
              <Plus size={14} />
              {creatingChapter ? 'Adding…' : 'New chapter'}
            </button>
          </div>

          {chapters.length === 0 ? (
            <p className="text-[14px] text-on-surface-variant py-6 text-center">
              No chapters yet. Click <span className="text-on-surface font-semibold">New chapter</span> to start writing.
            </p>
          ) : (
            <ul className="divide-y divide-surface-variant border border-surface-variant rounded-lg overflow-hidden">
              {chapters.map((c) => (
                <li
                  key={c.id}
                  className="px-4 py-3 flex items-center gap-4 bg-surface-container-lowest hover:bg-surface-container/50 transition-colors"
                >
                  <span className="label-sm tabular-nums w-10 text-on-surface-variant shrink-0">
                    {String(c.idx).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] text-on-surface truncate">{c.title}</p>
                    <p className="text-[12px] text-on-surface-variant mt-0.5">
                      {c.isPaid && c.tokenPrice > 0 ? `Paid · ${c.tokenPrice} tokens` : 'Free'}
                      {' · '}
                      <span className="capitalize">{c.status}</span>
                      {' · '}
                      {formatDate(c.updatedAt)}
                    </p>
                  </div>
                  <Link
                    href={`/author/books/${book.id}/chapters/${c.id}/edit`}
                    className="p-2 text-on-surface-variant hover:text-studio-accent transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteChapter(c)}
                    className="p-2 text-on-surface-variant hover:text-error transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

export default function BookEditPage() {
  return (
    <AuthGuard roles={['author', 'admin']}>
      <BookEditInner />
    </AuthGuard>
  );
}
