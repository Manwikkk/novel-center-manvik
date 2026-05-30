import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import HomeBookGrid from '@/components/book/HomeBookGrid';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import Pagination from '@/components/ui/Pagination';

export const revalidate = 60;

const PAGE_SIZE = 21;

async function fetchAuthor(id, { booksPage }) {
  const qs = new URLSearchParams({ booksPage: String(booksPage), booksPageSize: String(PAGE_SIZE) }).toString();
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/authors/${id}?${qs}`,
      { next: { revalidate: 60 } },
    );
    if (r.status === 404) return { notFound: true };
    if (!r.ok) return { error: true };
    return await r.json();
  } catch (_e) {
    return { error: true };
  }
}

export default async function AuthorProfilePage({ params, searchParams }) {
  const { id } = params ? await params : {};
  const sp = searchParams ? await searchParams : {};
  const booksPage = Math.max(1, Number(sp.booksPage || sp.page || '1') || 1);

  const data = await fetchAuthor(id, { booksPage });
  if (!data || data.notFound) notFound();

  const author = data.author;
  const books = (data.books && data.books.items) || [];
  const total = (data.books && data.books.total) || 0;
  const pageSize = (data.books && data.books.pageSize) || PAGE_SIZE;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader variant="solid" />
      <main className="flex-grow pt-[120px] pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        <Link
          href="/authors"
          className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-ink-400 hover:text-ink-900 dark:text-neutral-500 dark:hover:text-neutral-100 mb-8"
        >
          <Icon name="arrow_back" size={16} />
          All authors
        </Link>

        <header className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 pb-10 border-b border-neutral-200 dark:border-neutral-800">
          <Avatar name={author.displayName} src={author.avatarUrl} size={88} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400 dark:text-neutral-500 mb-1">
              {author.role === 'admin' ? 'Editor at the Centre' : 'Author'}
            </p>
            <h1 className="font-serif text-[28px] md:text-[32px] leading-tight text-ink-900 dark:text-neutral-100">
              {author.displayName}
            </h1>
            {author.bio ? (
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600 dark:text-neutral-400 max-w-2xl">
                {author.bio}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500 dark:text-neutral-500">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="menu_book" size={16} />
                {author.bookCount} published {author.bookCount === 1 ? 'book' : 'books'}
              </span>
              {author.latestPublishedAt ? (
                <span>
                  Latest update{' '}
                  {new Date(author.latestPublishedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-10 md:mt-12">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="font-headline-md text-headline-md text-ink-900 dark:text-neutral-100">
              Published Books
            </h2>
            <span className="text-[12px] font-semibold uppercase tracking-widest text-ink-400 dark:text-neutral-500 shrink-0">
              {total} {total === 1 ? 'book' : 'books'}
            </span>
          </div>

          {books.length === 0 ? (
            <p className="text-ink-500 dark:text-neutral-400 py-16 text-center">
              {author.displayName} has not published any books yet.
            </p>
          ) : (
            <>
              <HomeBookGrid books={books} />
              <div className="mt-12">
                <Pagination
                  page={booksPage}
                  pageSize={pageSize}
                  total={total}
                  pathname={`/authors/${author.id}`}
                  pageParam="booksPage"
                />
              </div>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
