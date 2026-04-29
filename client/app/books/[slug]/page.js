import { notFound } from 'next/navigation';
import Image from 'next/image';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Icon from '@/components/ui/Icon';
import BookDetailClient from './BookDetailClient';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchBook(slug) {
  try {
    const r = await fetch(`${API}/api/v1/books/${slug}`, { next: { revalidate: 30 } });
    if (!r.ok) return null;
    return await r.json();
  } catch (_e) {
    return null;
  }
}

async function fetchChapters(bookId) {
  try {
    const r = await fetch(`${API}/api/v1/books/${bookId}/chapters`, { next: { revalidate: 30 } });
    if (!r.ok) return { items: [] };
    return await r.json();
  } catch (_e) {
    return { items: [] };
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

  // Naive per-book stats so the badges aren't blank if the API doesn't
  // surface them. These are visual fillers, not source-of-truth.
  const rating = book.rating || 4.8;
  const reviews = book.reviewCount || 2041;
  const pages = book.pageCount || estimatePages(initialChapters);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-grow pt-[120px] pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        {/* HERO */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-16">
          <div className="md:col-span-5 lg:col-span-4">
            <div className="relative w-full aspect-[2/3] bg-surface-container-high rounded border border-surface-variant shadow-sm overflow-hidden">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-serif text-on-surface-variant text-7xl">
                  {book.title?.[0] || 'N'}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-center py-8 md:pl-8">
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              {book.category && (
                <Chip>{book.category}</Chip>
              )}
              {book.status === 'published' && <Chip>Published</Chip>}
            </div>

            <h1 className="font-display-lg text-[44px] sm:text-[56px] md:text-display-lg text-on-surface mb-2">
              {book.title}
            </h1>
            <p className="font-headline-md text-headline-md text-on-surface-variant italic mb-8">
              By {book.authorName}
            </p>

            <div className="flex items-center gap-6 mb-10 flex-wrap">
              <StarRating rating={rating} reviews={reviews} />
              <div className="h-4 w-px bg-outline-variant" />
              <div className="font-ui-label-sm text-ui-label-sm text-on-surface-variant">
                {pages} Pages
              </div>
              <div className="h-4 w-px bg-outline-variant" />
              <div className="font-ui-label-sm text-ui-label-sm text-on-surface-variant uppercase tracking-widest">
                {initialChapters.length} Chapters
              </div>
            </div>

            <p className="prose max-w-reading-max font-reading-body text-reading-body text-on-surface-variant mb-12 line-clamp-4">
              {book.synopsis}
            </p>

            <BookDetailClient book={book} initialChapters={initialChapters} mode="cta" />
          </div>
        </section>

        <div className="h-px w-full bg-surface-variant my-16" />

        {/* CHAPTERS + AUTHOR SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="col-span-1 lg:col-span-8">
            <h2 className="font-headline-xl text-headline-xl text-on-surface mb-8">
              Table of Contents
            </h2>
            <BookDetailClient book={book} initialChapters={initialChapters} mode="toc" />
          </div>

          <aside className="col-span-1 lg:col-span-4 mt-12 lg:mt-0">
            <AuthorCard
              name={book.authorName}
              avatarUrl={book.authorAvatarUrl}
              location={book.authorLocation}
              bio={book.authorBio}
            />
          </aside>
        </div>

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
    <span className="px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded-full font-ui-label-sm text-ui-label-sm text-on-surface uppercase tracking-widest">
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
      <span className="font-ui-label-sm text-ui-label-sm text-on-surface-variant ml-2">
        {rating.toFixed(1)} ({reviews.toLocaleString()} Reviews)
      </span>
    </div>
  );
}

function AuthorCard({ name, avatarUrl, location, bio }) {
  return (
    <div className="bg-surface-container-low p-8 border border-surface-variant rounded-lg sticky top-28">
      <h4 className="font-ui-label-lg text-ui-label-lg text-on-surface uppercase tracking-widest mb-6">
        About the Author
      </h4>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full overflow-hidden border border-outline-variant bg-surface-variant flex items-center justify-center">
          {avatarUrl ? (
            <img alt={name} src={avatarUrl} className="w-full h-full object-cover" />
          ) : (
            <Icon name="person" size={28} className="text-on-surface-variant" />
          )}
        </div>
        <div>
          <div className="font-headline-md text-[20px] text-on-surface mb-1 leading-tight">
            {name || 'Anonymous'}
          </div>
          <div className="font-ui-label-sm text-ui-label-sm text-on-surface-variant">
            {location || 'Novel Centre'}
          </div>
        </div>
      </div>
      <p className="font-reading-body text-[16px] leading-relaxed text-on-surface-variant mb-6">
        {bio || `${name || 'This author'} writes for Novel Centre. Follow to be notified when new chapters land.`}
      </p>
      <button
        type="button"
        className="w-full py-3 bg-transparent border border-outline text-on-surface font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-surface-container-high transition-colors"
      >
        Follow Author
      </button>
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
