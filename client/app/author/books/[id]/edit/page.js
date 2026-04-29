'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import BookEditorForm from '@/components/author/BookEditorForm';
import CoverUploader from '@/components/author/CoverUploader';
import Button from '@/components/ui/Button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { formatDate } from '@/lib/format';

function BookEditInner() {
  const { id } = useParams();
  const pushToast = useUiStore((s) => s.pushToast);
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [creatingChapter, setCreatingChapter] = useState(false);

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
        actions={<Button href={`/books/${book.slug}`} variant="ghost" size="sm">View public page</Button>}
      />
      <div className="px-4 md:px-edge py-8 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <BookEditorForm book={book} onSaved={(b) => setBook(b)} />
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-[24px] text-ink-900">Chapters</h2>
              <Button onClick={addChapter} variant="secondary" size="sm" disabled={creatingChapter}>
                <Plus size={14} className="mr-2" /> New chapter
              </Button>
            </div>
            {chapters.length === 0 ? (
              <p className="text-ink-400">No chapters yet.</p>
            ) : (
              <ul className="border border-ink-200/60 rounded-md divide-y divide-ink-200/60">
                {chapters.map((c) => (
                  <li key={c.id} className="px-4 py-3 flex items-center gap-4">
                    <span className="label-sm tabular-nums w-10 text-ink-400">{String(c.idx).padStart(2,'0')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-[16px] text-ink-900 truncate">{c.title}</p>
                      <p className="text-[12px] text-ink-400">
                        {c.isPaid && c.tokenPrice > 0 ? `Paid · ${c.tokenPrice} tokens` : 'Free'} · {c.status} · {formatDate(c.updatedAt)}
                      </p>
                    </div>
                    <Link href={`/author/books/${book.id}/chapters/${c.id}/edit`} className="p-2 text-ink-400 hover:text-ink-900" title="Edit">
                      <Pencil size={16} />
                    </Link>
                    <button onClick={() => deleteChapter(c)} className="p-2 text-ink-400 hover:text-danger" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div>
          <CoverUploader book={book} onUpdated={(b) => setBook(b)} />
        </div>
      </div>
    </DashboardShell>
  );
}

export default function BookEditPage() {
  return <AuthGuard roles={['author','admin']}><BookEditInner /></AuthGuard>;
}
