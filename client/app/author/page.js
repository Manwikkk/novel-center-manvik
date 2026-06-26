'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import AuthorDashboardHeader from '@/components/author/dashboard/AuthorDashboardHeader';
import BooksSection from '@/components/author/dashboard/BooksSection';
import NewsInboxPanel from '@/components/author/dashboard/NewsInboxPanel';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

function AuthorOverview() {
  const user = useAuthStore((s) => s.user);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [headerTab, setHeaderTab] = useState('dashboard');
  const booksRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    setLoading(true);
    api
      .get('/books', { query: { author: user.id, pageSize: 50, status: undefined } })
      .then((d) => {
        if (!cancelled) setBooks(d.items || []);
      })
      .catch(() => {
        if (!cancelled) setBooks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  function handleHeaderTab(tab) {
    setHeaderTab(tab);
    if (tab === 'stories' && booksRef.current) {
      booksRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <DashboardShell kind="author">
      <main className="flex-1 overflow-y-auto min-h-screen">
        <div className="px-4 md:px-8 py-6 md:py-8 max-w-[1200px] mx-auto w-full">
          <AuthorDashboardHeader activeTab={headerTab} onTabChange={handleHeaderTab} />

          <section ref={booksRef} className="mb-6">
            <BooksSection books={books} loading={loading} />
          </section>

          {headerTab === 'dashboard' && (
            <section>
              <NewsInboxPanel />
            </section>
          )}

          {headerTab === 'stories' && books.length > 0 && (
            <p className="mt-6 text-center text-[13px] text-on-surface-variant">
              <Link href="/author/books" className="text-studio-accent font-semibold hover:underline">
                Open workspace
              </Link>
              {' '}to manage all manuscripts.
            </p>
          )}
        </div>
      </main>
    </DashboardShell>
  );
}

export default function AuthorDashboardPage() {
  return (
    <AuthGuard roles={['author', 'admin']}>
      <AuthorOverview />
    </AuthGuard>
  );
}
