'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import BookEditorForm from '@/components/author/BookEditorForm';

function NewBookInner() {
  return (
    <DashboardShell kind="author">
      <DashboardTopbar subtitle="Author studio" title="Start a new book" />
      <div className="px-4 md:px-edge py-8">
        <BookEditorForm />
      </div>
    </DashboardShell>
  );
}

export default function NewBookPage() {
  return <AuthGuard roles={['author','admin']}><NewBookInner /></AuthGuard>;
}
