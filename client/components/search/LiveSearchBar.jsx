'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const DEBOUNCE_MS = 320;

function Inner({ basePath, placeholder, className }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const path = basePath || pathname;
  const qInUrl = searchParams.get('q') || '';

  const [value, setValue] = useState(qInUrl);
  const skipUrlSyncRef = useRef(false);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }
    setValue(qInUrl);
  }, [qInUrl]);

  const buildQuery = useCallback((trimmed) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete('page');
    if (trimmed) qs.set('q', trimmed);
    else qs.delete('q');
    return qs;
  }, [searchParams]);

  const pushQuery = useCallback(
    (trimmed) => {
      const urlQ = (searchParams.get('q') || '').trim();
      if (trimmed === urlQ) return;

      const qs = buildQuery(trimmed);
      const next = qs.toString() ? `${pathname}?${qs.toString()}` : pathname;

      const cur = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      if (next === cur) return;

      skipUrlSyncRef.current = true;
      router.replace(next, { scroll: false });
    },
    [buildQuery, pathname, router, searchParams],
  );

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      pushQuery(value.trim());
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value, pushQuery]);

  function handleClear() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setValue('');
    const hasUrlQ = Boolean(searchParams.get('q'));
    if (!hasUrlQ && !value.trim()) return;
    skipUrlSyncRef.current = true;
    const qs = buildQuery('');
    const next = qs.toString() ? `${pathname}?${qs.toString()}` : pathname;
    router.replace(next, { scroll: false });
  }

  const showClear = Boolean(value.trim() || searchParams.get('q'));

  return (
    <div className={className}>
      <label htmlFor="live-search-q" className="sr-only">
        Search books by title or author
      </label>
      <div className="relative min-w-0 flex-1">
        <svg
          className="pointer-events-none absolute left-0 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-on-surface-variant dark:text-neutral-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          id="live-search-q"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          placeholder={placeholder}
          className="w-full border-b border-surface-variant bg-transparent py-2.5 pl-5 font-ui-label-lg text-ui-label-lg text-on-surface placeholder-on-surface-variant transition-colors duration-200 hover:border-on-surface-variant focus:border-on-surface focus:outline-none dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-600 dark:hover:border-neutral-500 dark:focus:border-neutral-200"
        />
      </div>
      {showClear ? (
        <button
          type="button"
          onClick={handleClear}
          className="whitespace-nowrap font-ui-label-sm text-ui-label-sm text-on-surface-variant transition-colors hover:text-on-surface dark:text-neutral-500 dark:hover:text-neutral-200"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function Fallback({ className }) {
  return <div className={`mt-8 h-11 max-w-md rounded-md bg-surface-container-low dark:bg-neutral-900 ${className || ''}`} aria-hidden />;
}

/**
 * Debounced live search: updates the URL query `q` while typing so the RSC page refetches filtered results.
 * `basePath` is the route used in `router.replace` (usually the same as `usePathname()` for that page).
 */
export default function LiveSearchBar({
  /** Listing route, e.g. `/discover` or `/sections/recommended` — used for router.replace targets */
  basePath,
  placeholder = 'Search titles or authors…',
  className = 'mt-8 flex w-full max-w-md flex-wrap items-center gap-3',
}) {
  return (
    <Suspense fallback={<Fallback className={className} />}>
      <Inner basePath={basePath} placeholder={placeholder} className={className} />
    </Suspense>
  );
}
