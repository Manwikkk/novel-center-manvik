import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import BookCard from '@/components/book/BookCard';
import LiveSearchBar from '@/components/search/LiveSearchBar';

async function fetchBooks(q) {
  const params = new URLSearchParams({ pageSize: '48', status: 'published' });
  if (q) params.set('q', q);
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/books?${params}`,
      { next: { revalidate: 30 } },
    );
    if (!r.ok) return { items: [] };
    return await r.json();
  } catch {
    return { items: [] };
  }
}

export default async function DiscoverPage({ searchParams }) {
  const q = typeof searchParams?.q === 'string' ? searchParams.q.trim() : '';
  const data = await fetchBooks(q);
  const books = (data.items || []).filter((b) => b && b.slug);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader variant="solid" />

      <main className="mx-auto max-w-shell w-full px-4 md:px-edge pt-24 md:pt-28 pb-16 md:pb-20">

        {/* ── Page heading ───────────────────────────────────────────── */}
        <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant dark:text-neutral-500">
          Discover
        </p>
        <h1 className="mt-1.5 font-headline-md text-on-surface dark:text-neutral-100 text-[38px] md:text-[52px] leading-[1.08] tracking-tight">
          Books worth your<br className="hidden md:block" /> slow attention.
        </h1>

        <LiveSearchBar basePath="/discover" />

        {/* ── Divider + count ────────────────────────────────────────── */}
        <div className="mt-8 mb-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-surface-variant dark:bg-neutral-800" />
          <p className="font-ui-label-sm text-ui-label-sm text-on-surface-variant dark:text-neutral-500 whitespace-nowrap">
            {books.length > 0
              ? `${books.length} title${books.length !== 1 ? 's' : ''}${q ? ` · "${q}"` : ''}`
              : q
              ? `No results for "${q}"`
              : 'No books yet'}
          </p>
          <div className="flex-1 h-px bg-surface-variant dark:bg-neutral-800" />
        </div>

        {/* ── Compact grid ───────────────────────────────────────────── */}
        {books.length > 0 && (
          <div className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-x-4 gap-y-10 sm:gap-x-5 sm:gap-y-11">
            {books.map((b) => (
              <BookCard key={b.id} book={b} layout="compact" />
            ))}
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────── */}
        {books.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <svg
              className="w-10 h-10 text-on-surface-variant/40 dark:text-neutral-700"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="font-ui-label-lg text-ui-label-lg text-on-surface-variant dark:text-neutral-500">
              No books match your search yet.
            </p>
            <a
              href="/discover"
              className="font-ui-label-sm text-ui-label-sm text-primary dark:text-neutral-300 underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              Browse all books
            </a>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}