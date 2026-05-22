'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import BookCreateForm from '@/components/author/BookCreateForm';

function NewBookInner() {
  return (
    <DashboardShell kind="author">
      <DashboardTopbar subtitle="Author studio" title="Create new book" />
      <div className="px-4 md:px-8 py-6 md:py-8">
        <BookCreateForm />
      </div>
    </DashboardShell>
  );
}

export default function NewBookPage() {
  return (
    <AuthGuard roles={['author', 'admin']}>
      <NewBookInner />
    </AuthGuard>
  );
}
