'use client';

import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

// Route error boundary: shown when a page's server data cannot be loaded
// (for example when the API is unreachable) instead of a blank screen.
export default function RouteError({ error, reset }) {
  const unreachable = /could not be reached|fetch failed|ECONNREFUSED/i.test(error?.message || '');
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader />
      <main className="mx-auto max-w-shell w-full px-4 md:px-edge pt-32 pb-24 flex-1">
        <p className="label-sm uppercase text-ink-400 dark:text-neutral-500">Something went wrong</p>
        <h1 className="mt-3 font-serif text-[40px] md:text-[56px] leading-[1.1] tracking-tightDisplay text-ink-900 dark:text-neutral-100 max-w-2xl">
          {unreachable ? 'The library is not answering right now.' : 'This page could not be loaded.'}
        </h1>
        <p className="mt-6 max-w-xl font-serif text-[18px] text-ink-700 dark:text-neutral-300">
          {unreachable
            ? 'The Novel Centre service could not be reached. Please try again in a moment.'
            : 'An unexpected error interrupted this page. Please try again.'}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center rounded-full bg-ink-900 px-6 py-3 text-[12px] font-semibold uppercase tracking-widest text-white hover:bg-ink-700 dark:bg-neutral-100 dark:text-black dark:hover:bg-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-ink-900 dark:text-neutral-100 underline decoration-gold underline-offset-4"
          >
            Return home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
