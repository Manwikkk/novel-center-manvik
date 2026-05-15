import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import BookCard from '@/components/book/BookCard';
import Pagination from '@/components/ui/Pagination';
import LiveSearchBar from '@/components/search/LiveSearchBar';

export const dynamicParams = false;
export const revalidate = 60;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/** Match Discover: enough per page to feel rich while keeping pagination meaningful */
const PAGE_SIZE = 48;

const SECTION_CONFIG = {
  recommended: {
    tag: 'new_arrivals',
    title: 'Recommended',
    description: 'Titles we surface in Recommended — search and page through the full tagged list.',
  },
  ranking: {
    tag: 'ranking',
    title: 'Ranking Novels',
    description:
      'Most read, trending, and highly rated picks from the home ranking rails — search and browse the full set.',
  },
  'updated-today': {
    tag: 'cheering_reads',
    title: 'Updated Today',
    description: 'Books tagged for Updated Today — filter by title or synopsis, then flip pages.',
  },
  'editors-choice': {
    tag: 'editors_choice',
    title: "Editors' Choice",
    description: 'The Editors’ Choice catalogue — same compact layout and search as Discover.',
  },
};

export async function generateStaticParams() {
  return Object.keys(SECTION_CONFIG).map((section) => ({ section }));
}

export async function generateMetadata({ params }) {
  const cfg = SECTION_CONFIG[params.section];
  if (!cfg) return { title: 'Section | Novel Center' };
  return {
    title: `${cfg.title} | Novel Center`,
    description: cfg.description,
  };
}

async function fetchSectionBooks(tag, page, q) {
  const qs = new URLSearchParams({
    pageSize: String(PAGE_SIZE),
    page: String(page),
    tag,
    status: 'published',
  });
  if (q) qs.set('q', q);
  try {
    const r = await fetch(`${API_BASE}/api/v1/books?${qs}`, { next: { revalidate: 60 } });
    if (!r.ok) return { items: [], total: 0, page: 1, pageSize: PAGE_SIZE };
    return await r.json();
  } catch (_e) {
    return { items: [], total: 0, page: 1, pageSize: PAGE_SIZE };
  }
}

export default async function HomeSectionBrowsePage({ params, searchParams }) {
  const cfg = SECTION_CONFIG[params.section];
  if (!cfg) notFound();

  const q = typeof searchParams?.q === 'string' ? searchParams.q.trim() : '';
  const page = Math.max(1, Number.parseInt(String(searchParams?.page || '1'), 10) || 1);
  const data = await fetchSectionBooks(cfg.tag, page, q);
  const books = (data.items || []).filter((b) => b && b.slug);
  const total = Number(data.total) || 0;
  const basePath = `/sections/${params.section}`;
  const paginationExtra = q ? { q } : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader variant="solid" />
      <main className="mx-auto max-w-shell w-full px-4 md:px-edge pt-24 md:pt-28 pb-16 md:pb-20">
        <nav className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant dark:text-neutral-500">
          <Link href="/" className="hover:text-on-surface dark:hover:text-neutral-200 transition-colors">
            Home
          </Link>
          <span className="mx-2 opacity-60">/</span>
          <span className="text-on-surface dark:text-neutral-300">{cfg.title}</span>
        </nav>

        <h1 className="mt-6 font-headline-md text-on-surface dark:text-neutral-100 text-[38px] md:text-[52px] leading-[1.08] tracking-tight">
          {cfg.title}
        </h1>
        <p className="mt-4 max-w-2xl font-reading-body text-reading-body text-on-surface-variant dark:text-neutral-400">
          {cfg.description}
        </p>

        <LiveSearchBar basePath={basePath} />

        <div className="mt-8 mb-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-surface-variant dark:bg-neutral-800" />
          <p className="whitespace-nowrap font-ui-label-sm text-ui-label-sm text-on-surface-variant dark:text-neutral-500">
            {total > 0
              ? `${total.toLocaleString()} match${total !== 1 ? 'es' : ''}${q ? ` · “${q}”` : ''}`
              : q
                ? `No matches for “${q}”`
                : 'No books in this shelf yet'}
          </p>
          <div className="h-px flex-1 bg-surface-variant dark:bg-neutral-800" />
        </div>

        {books.length > 0 ? (
          <div className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-x-4 gap-y-10 sm:gap-x-5 sm:gap-y-11">
            {books.map((b) => (
              <BookCard key={b.id} book={b} layout="compact" />
            ))}
          </div>
        ) : null}

        {books.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <svg
              className="h-10 w-10 text-on-surface-variant/40 dark:text-neutral-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="font-ui-label-lg text-ui-label-lg text-on-surface-variant dark:text-neutral-500">
              {q
                ? 'Try a shorter keyword, or clear search to see every title on this shelf.'
                : 'Nothing is tagged for this shelf yet.'}
            </p>
            <Link
              href="/discover"
              className="font-ui-label-sm text-ui-label-sm text-primary underline underline-offset-2 transition-opacity hover:opacity-70 dark:text-neutral-300"
            >
              Browse all books
            </Link>
          </div>
        ) : null}

        <Pagination
          className="mt-14"
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          pathname={basePath}
          extraQuery={paginationExtra}
        />

        <Link
          href="/discover"
          className="mt-10 inline-flex border-b border-on-surface pb-1 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface transition-opacity hover:opacity-80 dark:border-neutral-100 dark:text-neutral-100"
        >
          Open full Discover
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
