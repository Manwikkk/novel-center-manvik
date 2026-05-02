import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import BookCard from '@/components/book/BookCard';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import Pagination from '@/components/ui/Pagination';

export const revalidate = 60;

const PAGE_SIZE = 12;

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
    <div className="min-h-screen flex flex-col bg-background dark:bg-black">
      <SiteHeader variant="solid" />
      <main className="flex-grow pt-[120px] pb-32">
        <section className="bg-surface-container-low border-b border-surface-container-high py-16 md:py-24 mb-16">
          <div className="max-w-[1280px] mx-auto px-4 md:px-edge">
            <Link
              href="/authors"
              className="inline-flex items-center gap-2 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant hover:text-on-surface mb-8"
            >
              <Icon name="arrow_back" size={16} />
              All authors
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
              <div className="md:col-span-3 flex justify-center md:justify-start">
                <div className="rounded-full overflow-hidden border border-outline-variant shadow-book bg-surface">
                  <Avatar name={author.displayName} src={author.avatarUrl} size={200} />
                </div>
              </div>

              <div className="md:col-span-9">
                <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant mb-2">
                  {author.role === 'admin' ? 'Editor at the Centre' : 'Author Profile'}
                </p>
                <h1 className="font-display-lg text-[40px] md:text-display-lg text-on-surface leading-tight mb-4">
                  {author.displayName}
                </h1>
                {author.bio ? (
                  <p className="font-reading-body text-reading-body text-on-surface-variant max-w-2xl mb-6">
                    {author.bio}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface-container-lowest border border-surface-container-high rounded-full font-ui-label-sm text-ui-label-sm text-on-surface-variant">
                    <Icon name="menu_book" size={16} />
                    {author.bookCount} published {author.bookCount === 1 ? 'book' : 'books'}
                  </span>
                  {author.latestPublishedAt ? (
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface-container-lowest border border-surface-container-high rounded-full font-ui-label-sm text-ui-label-sm text-on-surface-variant">
                      Latest update {new Date(author.latestPublishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1280px] mx-auto px-4 md:px-edge">
          <div className="flex items-end justify-between mb-12 border-b border-surface-container-high dark:border-neutral-800 pb-6">
            <div>
              <h2 className="font-headline-xl text-headline-xl text-on-surface dark:text-neutral-100 mb-2">Published Books</h2>
              <p className="font-reading-body text-reading-body text-on-surface-variant dark:text-neutral-400">
                Every chapter from {author.displayName}, in publication order.
              </p>
            </div>
            <span className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-on-surface-variant dark:text-neutral-400">
              {total} {total === 1 ? 'volume' : 'volumes'}
            </span>
          </div>

          {books.length === 0 ? (
            <p className="text-on-surface-variant dark:text-neutral-400 py-24 text-center">
              {author.displayName} has not published any books yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-gutter gap-y-12">
                {books.map((b) => <BookCard key={b.id} book={b} />)}
              </div>
              <div className="mt-16">
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
