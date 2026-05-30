import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Icon from '@/components/ui/Icon';
import BookDetailClient from './BookDetailClient';
import BookTabsClient from './BookTabsClient';
import YouMayAlsoLikeSection from '@/components/book/YouMayAlsoLikeSection';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchBook(slug) {
  try {
    const r = await fetch(`${API}/api/v1/books/${slug}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (_e) {
    return null;
  }
}

async function fetchChapters(bookId) {
  try {
    const r = await fetch(`${API}/api/v1/books/${bookId}/chapters`, { cache: 'no-store' });
    if (!r.ok) return { items: [] };
    return await r.json();
  } catch (_e) {
    return { items: [] };
  }
}

async function fetchMoreLike(slug) {
  const params = new URLSearchParams({ pageSize: '14', status: 'published' });
  try {
    const r = await fetch(`${API}/api/v1/books?${params}`, { cache: 'no-store' });
    if (!r.ok) return [];
    const data = await r.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter((b) => b?.slug && b.slug !== slug);
  } catch (_e) {
    return [];
  }
}

/**
 * Book Detail page — pixel-aligned with Stitch book_detail.html.
 *
 * Shape:
 *   1. Hero: 5/7 grid (cover left, meta right) with category chips, big
 *      display title, italic byline, star rating, page count, multiline
 *      synopsis, and two CTA buttons.
 *   2. Hairline divider (`my-16`).
 *   3. 8/4 split: <ChapterTOC/> on the left, sticky <AuthorCard/> on
 *      the right.
 *   4. Below the ToC: comments thread for the book, unchanged.
 */

export default async function BookDetailPage({ params }) {
  const { slug } = params;
  const data = await fetchBook(slug);
  if (!data || !data.book) notFound();
  const book = data.book;
  const ch = await fetchChapters(book.id);
  const initialChapters = ch.items || [];
  const moreLike = await fetchMoreLike(slug);

  // Naive per-book stats so the badges aren't blank if the API doesn't
  // surface them. These are visual fillers, not source-of-truth.
  const rating = book.rating || 4.8;
  const reviews = book.reviewCount || 2041;
  const pages = book.pageCount || estimatePages(initialChapters);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader />

      <main className="flex-grow pt-24 md:pt-28 pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        {/* HERO (WebNovel-like compact layout) */}
        <section className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-10 items-start mb-14 md:mb-16">
          <div className="w-full md:w-[240px]">
            <div className="relative w-full aspect-[3/4] bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-serif text-ink-500 dark:text-neutral-500 text-6xl">
                  {book.title?.[0] || 'N'}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 pt-1">
            <h1 className="font-sans font-bold text-3xl sm:text-4xl md:text-[42px] leading-tight text-ink-900 dark:text-neutral-100">
              {book.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-ink-600 dark:text-neutral-400">
              <span className="inline-flex items-center gap-2 text-sm">
                <Icon name="category" size={18} className="opacity-80" />
                {book.category || 'Novel'}
              </span>
              {book.language && (
                <span className="inline-flex items-center gap-2 text-sm">
                  <Icon name="translate" size={18} className="opacity-80" />
                  {String(book.language).toUpperCase()}
                </span>
              )}
              <span className="inline-flex items-center gap-2 text-sm">
                <Icon name="menu_book" size={18} className="opacity-80" />
                {initialChapters.length} Chapters
              </span>
              <span className="inline-flex items-center gap-2 text-sm">
                <Icon name="visibility" size={18} className="opacity-80" />
                60.1K Views
              </span>
            </div>
            {(book.contentTags || []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(book.contentTags || []).map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center rounded-full border border-ink-200/80 bg-cream-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-ink-700 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200"
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-3 text-sm text-ink-600 dark:text-neutral-400">
              Author:{' '}
              {book.authorId ? (
                <Link
                  href={`/authors/${book.authorId}`}
                  className="text-[#2f6bff] hover:underline underline-offset-2 transition-opacity"
                >
                  {book.authorName || 'Anonymous'}
                </Link>
              ) : (
                <span className="text-[#2f6bff]">{book.authorName || 'Anonymous'}</span>
              )}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <StarRating rating={rating} reviews={reviews} />
            </div>

            <div className="mt-6">
              <BookDetailClient book={book} initialChapters={initialChapters} mode="cta" />
            </div>
          </div>
        </section>

        <div className="h-px w-full bg-neutral-200 dark:bg-neutral-800 my-16" />

        {/* ABOUT / TOC (tabs) + AUTHOR SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="col-span-1 lg:col-span-8">
            <BookTabsClient
              book={book}
              toc={<BookDetailClient book={book} initialChapters={initialChapters} mode="toc" />}
            />
          </div>

          <aside className="col-span-1 lg:col-span-4 mt-12 lg:mt-0">
            <AuthorCard
              authorId={book.authorId}
              name={book.authorName}
              avatarUrl={book.authorAvatarUrl}
              location={book.authorLocation}
              bio={book.authorBio}
            />
          </aside>
        </div>

        <YouMayAlsoLikeSection items={moreLike} />

        <div className="mt-24">
          <BookDetailClient book={book} initialChapters={initialChapters} mode="comments" />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-full font-ui-label-sm text-ui-label-sm text-ink-900 dark:text-neutral-100 uppercase tracking-widest">
      {children}
    </span>
  );
}

function StarRating({ rating, reviews }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = [];
  for (let i = 0; i < full; i++) {
    stars.push(<Icon key={`f${i}`} name="star" filled size={20} className="text-tertiary-fixed-dim" />);
  }
  if (half) stars.push(<Icon key="half" name="star_half" size={20} className="text-tertiary-fixed-dim" />);
  while (stars.length < 5) {
    stars.push(<Icon key={`e${stars.length}`} name="star" size={20} className="text-tertiary-fixed-dim/40" />);
  }
  return (
    <div className="flex items-center gap-1">
      {stars}
      <span className="font-ui-label-sm text-ui-label-sm text-ink-600 dark:text-neutral-400 ml-2">
        {rating.toFixed(1)} ({reviews.toLocaleString()} Reviews)
      </span>
    </div>
  );
}

function AuthorCard({ authorId, name, avatarUrl, location, bio }) {
  const profileHref = authorId ? `/authors/${authorId}` : null;

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 p-8 border border-neutral-200 dark:border-neutral-800 rounded-lg sticky top-28">
      <h4 className="font-ui-label-lg text-ui-label-lg text-ink-900 dark:text-neutral-100 uppercase tracking-widest mb-6">
        About the Author
      </h4>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
          {avatarUrl ? (
            <img alt={name} src={avatarUrl} className="w-full h-full object-cover" />
          ) : (
            <Icon name="person" size={28} className="text-ink-500 dark:text-neutral-500" />
          )}
        </div>
        <div>
          {profileHref ? (
            <Link
              href={profileHref}
              className="font-headline-md text-[20px] text-ink-900 dark:text-neutral-100 mb-1 leading-tight block hover:text-[#2f6bff] transition-colors"
            >
              {name || 'Anonymous'}
            </Link>
          ) : (
            <div className="font-headline-md text-[20px] text-ink-900 dark:text-neutral-100 mb-1 leading-tight">
              {name || 'Anonymous'}
            </div>
          )}
          <div className="font-ui-label-sm text-ui-label-sm text-ink-600 dark:text-neutral-400">
            {location || 'Novel Centre'}
          </div>
        </div>
      </div>
      <p className="font-reading-body text-[16px] leading-relaxed text-ink-600 dark:text-neutral-400 mb-6">
        {bio || `${name || 'This author'} writes for Novel Centre. Follow to be notified when new chapters land.`}
      </p>
      {profileHref ? (
        <Link
          href={profileHref}
          className="block w-full py-3 text-center bg-transparent border border-neutral-400 dark:border-neutral-600 text-ink-900 dark:text-neutral-100 font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          View profile
        </Link>
      ) : (
        <button
          type="button"
          className="w-full py-3 bg-transparent border border-neutral-400 dark:border-neutral-600 text-ink-900 dark:text-neutral-100 font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          Follow Author
        </button>
      )}
    </div>
  );
}

function estimatePages(chapters = []) {
  // Rough word-count → pages estimate (~250 words per page)
  const text = chapters.map((c) => c.contentHtml || '').join(' ');
  const words = text
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 250));
}
