'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

function NewChapterInner() {
  const { id } = useParams();
  const router = useRouter();
  const pushToast = useUiStore((s) => s.pushToast);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function createChapter() {
      try {
        const r = await api.post(`/books/${id}/chapters`, {
          title: 'Untitled chapter',
          contentHtml: '<p></p>',
          isPaid: false,
          tokenPrice: 0,
          status: 'draft',
        });
        pushToast({ type: 'success', title: 'Chapter created' });
        router.replace(`/author/books/${id}/chapters/${r.chapter.id}/edit`);
      } catch (err) {
        pushToast({ type: 'error', title: 'Could not create chapter', message: err.message });
        router.replace(`/author/books/${id}/chapters`);
      }
    }

    createChapter();
  }, [id, router, pushToast]);

  return (
    <DashboardShell kind="author">
      <DashboardTopbar subtitle="Author studio" title="Creating chapter…" />
      <div className="px-4 py-16 text-center text-[14px] text-on-surface-variant">
        Setting up your new chapter…
      </div>
    </DashboardShell>
  );
}

export default function NewChapterPage() {
  return (
    <AuthGuard roles={['author', 'admin']}>
      <NewChapterInner />
    </AuthGuard>
  );
}
