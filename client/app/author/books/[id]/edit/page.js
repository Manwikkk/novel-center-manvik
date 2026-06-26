'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { List } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import BookEditorForm from '@/components/author/BookEditorForm';
import BookPublishBar from '@/components/author/BookPublishBar';
import CoverUploader from '@/components/author/CoverUploader';
import { FormSection } from '@/components/author/BookFormFields';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

function BookEditInner() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const pushToast = useUiStore((s) => s.pushToast);
  const [book, setBook] = useState(null);

  useEffect(() => {
    if (searchParams.get('created') !== '1') return;
    pushToast({
      type: 'success',
      title: 'Book created',
      message: 'Save any edits, then open Chapters to start writing.',
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
      } catch (err) {
        if (!cancel) pushToast({ type: 'error', title: 'Could not load', message: err.message });
      }
    }
    load();
    return () => { cancel = true; };
  }, [id, pushToast]);

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
        subtitle="Book details"
        title={book.title}
        actions={
          <>
            <Link
              href={`/author/books/${id}/chapters`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-studio-accent text-studio-accent text-[12px] font-bold uppercase tracking-wider hover:bg-studio-accent/10 transition-colors"
            >
              <List size={14} />
              Chapters
            </Link>
            {book.status === 'published' ? (
              <Link
                href={`/books/${book.slug}`}
                className="text-[12px] font-bold uppercase tracking-wider text-studio-accent hover:underline"
              >
                View public page
              </Link>
            ) : null}
          </>
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
