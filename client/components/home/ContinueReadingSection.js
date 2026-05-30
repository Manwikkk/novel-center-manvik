'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BookCard from '@/components/book/BookCard';
import Icon from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { openAuthModal } from '@/lib/authModal';
import { readingApi } from '@/lib/reading';

/**
 * Drives the "Continue Reading" + "Recently Opened" block on the landing page.
 *
 *   • Logged-out: same section frame, but the bento card becomes a sign-in
 *     CTA so the layout doesn't collapse.
 *   • Logged-in: pulls /api/v1/reading/recent for the user's most recently
 *     read book per book, renders the freshest one as a featured card with
 *     real percent + minutes-left, and lists up to three more in the rail.
 */
export default function ContinueReadingSection() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      setItems([]);
      return;
    }
    let cancel = false;
    setItems(null);
    readingApi
      .recent(4)
      .then((res) => {
        if (cancel) return;
        setItems(Array.isArray(res?.items) ? res.items : []);
      })
      .catch((err) => {
        if (cancel) return;
        setError(err);
        setItems([]);
      });
    return () => {
      cancel = true;
    };
  }, [hydrated, user]);

  const loading = items === null;
  const featured = items?.[0] || null;
  const recent = items?.slice(1, 4) || [];

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-edge mb-24">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="font-headline-md text-headline-md text-ink-900 dark:text-neutral-100 mb-2">
            Continue Reading
          </h2>
          <p className="font-ui-label-sm text-ui-label-sm text-ink-600 dark:text-neutral-400 uppercase tracking-widest">
            Pick up where you left off
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {loading ? (
          <FeaturedSkeleton />
        ) : !user ? (
          <SignInCta />
        ) : featured ? (
          <FeaturedReadCard entry={featured} />
        ) : (
          <EmptyFeatured />
        )}

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h4 className="font-ui-label-sm text-ui-label-sm text-ink-600 dark:text-neutral-400 uppercase tracking-widest border-b border-neutral-200 dark:border-neutral-800 pb-2">
              Recently Opened
            </h4>
            {loading ? (
              <RecentSkeleton />
            ) : !user ? (
              <p className="text-ink-600 dark:text-neutral-400 text-sm">
                Your most recently opened books will land here once you sign in.
              </p>
            ) : recent.length === 0 ? (
              <p className="text-ink-600 dark:text-neutral-400 text-sm">
                Your recent reads will appear here.
              </p>
            ) : (
              recent.map((entry) => (
                <Link
                  key={entry.book.id}
                  href={`/read/${entry.chapter.id}`}
                  className="block"
                >
                  <BookCard
                    book={entry.book}
                    layout="horizontal"
                    kicker={`${Math.round(entry.percent)}%`}
                  />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-error">
          Couldn&rsquo;t load reading history. {error.message || ''}
        </p>
      )}
    </section>
  );
}

function FeaturedReadCard({ entry }) {
  const { book, chapter, percent, minutesLeft } = entry;
  const cover = book.coverUrl || '/stitch/book-architecture-silence.jpg';
  const pct = Math.max(0, Math.min(100, Math.round(percent || 0)));

  return (
    <div className="lg:col-span-8 bg-neutral-50 dark:bg-neutral-950 rounded-lg p-8 relative overflow-hidden group border border-neutral-200 dark:border-neutral-800 transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      <div className="absolute top-0 left-0 h-[2px] bg-tertiary-fixed w-full">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex flex-col md:flex-row gap-8 relative z-10 h-full items-center md:items-start">
        <Link href={`/read/${chapter.id}`} className="w-48 shrink-0 relative block">
          <img
            alt={book.title}
            src={cover}
            className="w-full aspect-[2/3] object-cover rounded shadow-book"
          />
          <div className="absolute -bottom-3 -right-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full p-2 shadow-sm">
            <Icon name="menu_book" filled size={18} className="text-primary dark:text-neutral-100" />
          </div>
        </Link>

        <div className="flex flex-col justify-between h-full py-4 flex-grow">
          <div>
            <span className="inline-block px-3 py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full font-ui-label-sm text-ui-label-sm text-ink-600 dark:text-neutral-400 mb-4">
              Chapter {chapter.idx}
            </span>
            <h3 className="font-display-lg text-[40px] md:text-display-lg text-ink-900 dark:text-neutral-100 leading-tight mb-2">
              {book.title}
            </h3>
            <p className="font-ui-label-lg text-ui-label-lg text-ink-600 dark:text-neutral-400 mb-6">
              by {book.authorName}
            </p>
            <p className="font-reading-body text-reading-body text-ink-600/90 dark:text-neutral-400 line-clamp-3 mb-8 max-w-lg">
              {book.synopsis ||
                'Pick up the thread where you left off.'}
            </p>
          </div>

          <div className="flex items-center gap-6 mt-auto">
            <Link
              href={`/read/${chapter.id}`}
              className="px-8 py-3 bg-ink-900 text-white dark:bg-white dark:text-black font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              Read Now
              <Icon name="arrow_forward" size={16} />
            </Link>
            <div className="font-ui-label-sm text-ui-label-sm text-ink-600 dark:text-neutral-400">
              {pct}% Complete
              {minutesLeft != null && minutesLeft > 0
                ? ` · ~${minutesLeft} min remaining`
                : pct >= 99
                  ? ' · finished this chapter'
                  : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyFeatured() {
  return (
    <div className="lg:col-span-8 bg-neutral-50 dark:bg-neutral-950 rounded-lg p-10 border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
      <h3 className="font-headline-md text-ink-900 dark:text-neutral-100 mb-2">
        No reading history yet
      </h3>
      <p className="font-reading-body text-ink-600 dark:text-neutral-400 mb-6">
        Open any chapter and we&rsquo;ll save your spot here automatically.
      </p>
      <Link
        href="/discover"
        className="inline-flex items-center gap-2 rounded-sm bg-ink-900 px-6 py-3 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-white dark:bg-white dark:text-black shadow-sm transition-opacity hover:opacity-90"
      >
        Browse the catalogue
        <Icon name="arrow_forward" size={16} />
      </Link>
    </div>
  );
}

function SignInCta() {
  return (
    <div className="lg:col-span-8 bg-neutral-50 dark:bg-neutral-950 rounded-lg p-10 border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
      <span className="inline-block px-3 py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full font-ui-label-sm text-ui-label-sm text-ink-600 dark:text-neutral-400 mb-4 uppercase tracking-widest">
        Sign in
      </span>
      <h3 className="font-headline-md text-ink-900 dark:text-neutral-100 mb-2">
        Track your reading across devices
      </h3>
      <p className="font-reading-body text-ink-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
        Sign in to save your progress, build a library, and pick up exactly where you left off &mdash; on any device.
      </p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => openAuthModal({ tab: 'login' })}
          className="inline-flex items-center gap-2 rounded-sm bg-ink-900 px-6 py-3 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-white dark:bg-white dark:text-black shadow-sm transition-opacity hover:opacity-90"
        >
          Sign in
          <Icon name="arrow_forward" size={16} />
        </button>
        <button
          type="button"
          onClick={() => openAuthModal({ tab: 'register' })}
          className="inline-flex items-center gap-2 rounded-sm border border-ink-300 dark:border-neutral-600 bg-transparent px-6 py-3 font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-900 dark:text-neutral-100 transition-colors hover:border-ink-900 dark:hover:border-neutral-400 hover:bg-ink-900/5 dark:hover:bg-white/10"
        >
          Create an account
        </button>
      </div>
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="lg:col-span-8 bg-neutral-50 dark:bg-neutral-950 rounded-lg p-8 border border-neutral-200 dark:border-neutral-800">
      <div className="flex flex-col md:flex-row gap-8">
        <Skeleton className="w-48 aspect-[2/3] rounded" />
        <div className="flex-grow space-y-4">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="flex items-center gap-6 mt-6">
            <Skeleton className="h-11 w-40" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg border border-transparent"
        >
          <Skeleton className="w-12 aspect-[2/3]" />
          <div className="flex-grow space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </>
  );
}
