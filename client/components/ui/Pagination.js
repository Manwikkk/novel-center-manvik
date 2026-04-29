'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import Icon from '@/components/ui/Icon';

function buildRange(current, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set([1, totalPages, current, current - 1, current + 1]);
  const sorted = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('...');
    out.push(sorted[i]);
  }
  return out;
}

const baseBtn =
  'inline-flex items-center justify-center min-w-[40px] h-10 px-3 font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded transition-colors';
const inactiveCls = 'border border-outline-variant text-on-surface hover:bg-surface-container-low';
const activeCls = 'bg-on-surface text-surface border border-on-surface';

/**
 * Pagination controls — supports two modes:
 *
 *   • client mode: pass `onPageChange(p)` (renders &lt;button&gt;).
 *   • link mode (RSC-safe): pass `pathname` + optional `pageParam` — URLs are built on the client;
 *     do not pass functions from a Server Component.
 *   • link mode (client-only): `hrefBuilder(p) => string` still works when the parent is a Client Component.
 */
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  hrefBuilder,
  /** e.g. "/authors" — used with `pageParam` instead of `hrefBuilder` from RSC */
  pathname,
  pageParam = 'page',
  /** When true (default), page 1 uses `pathname` with no query string. */
  omitFirstPageQuery = true,
  className,
  disabled = false,
}) {
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeSize = Math.max(1, Math.floor(Number(pageSize) || 20));
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / safeSize));
  if (totalPages <= 1) return null;

  const range = buildRange(safePage, totalPages);

  function hrefForTargetPage(targetPage) {
    const targetClamped = Math.min(totalPages, Math.max(1, targetPage));
    if (pathname) {
      if (omitFirstPageQuery && targetClamped <= 1) return pathname;
      const qs = new URLSearchParams();
      qs.set(pageParam, String(targetClamped));
      return `${pathname}?${qs.toString()}`;
    }
    if (hrefBuilder) return hrefBuilder(targetClamped);
    return '#';
  }

  const useLinks = Boolean(pathname || hrefBuilder);

  function NavItem({ targetPage, children, ariaLabel, isCurrent }) {
    const cls = cn(
      baseBtn,
      isCurrent ? activeCls : inactiveCls,
      disabled && 'opacity-40 cursor-not-allowed',
    );
    if (useLinks) {
      const targetClamped = Math.min(totalPages, Math.max(1, targetPage));
      const isDisabled = disabled || targetClamped === safePage;
      return (
        <Link
          href={hrefForTargetPage(targetClamped)}
          aria-label={ariaLabel}
          aria-current={isCurrent ? 'page' : undefined}
          aria-disabled={isDisabled || undefined}
          tabIndex={isDisabled ? -1 : undefined}
          className={cn(cls, 'gap-1')}
        >
          {children}
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          const next = Math.min(totalPages, Math.max(1, targetPage));
          if (next !== safePage) onPageChange?.(next);
        }}
        aria-label={ariaLabel}
        aria-current={isCurrent ? 'page' : undefined}
        disabled={disabled}
        className={cn(cls, 'gap-1')}
      >
        {children}
      </button>
    );
  }

  const prevDisabled = disabled || safePage <= 1;
  const nextDisabled = disabled || safePage >= totalPages;

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-4 flex-wrap', className)}
    >
      <p className="font-ui-label-sm text-ui-label-sm text-on-surface-variant">
        Page <span className="text-on-surface">{safePage}</span> of{' '}
        <span className="text-on-surface">{totalPages}</span>
        {total != null ? (
          <span className="hidden sm:inline">
            {' '}
            &middot; {Number(total).toLocaleString()} total
          </span>
        ) : null}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {prevDisabled && !useLinks ? (
          <button
            type="button"
            disabled
            className={cn(baseBtn, inactiveCls, 'gap-1 opacity-40 cursor-not-allowed')}
            aria-label="Previous page"
          >
            <Icon name="chevron_left" size={18} />
            <span className="hidden sm:inline">Prev</span>
          </button>
        ) : (
          <NavItem targetPage={safePage - 1} ariaLabel="Previous page">
            <Icon name="chevron_left" size={18} />
            <span className="hidden sm:inline">Prev</span>
          </NavItem>
        )}

        {range.map((p, i) =>
          p === '...' ? (
            <span
              key={`gap-${i}`}
              className="font-ui-label-sm text-ui-label-sm text-on-surface-variant px-1"
            >
              &hellip;
            </span>
          ) : (
            <NavItem key={p} targetPage={p} ariaLabel={`Page ${p}`} isCurrent={p === safePage}>
              {p}
            </NavItem>
          ),
        )}

        {nextDisabled && !useLinks ? (
          <button
            type="button"
            disabled
            className={cn(baseBtn, inactiveCls, 'gap-1 opacity-40 cursor-not-allowed')}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <Icon name="chevron_right" size={18} />
          </button>
        ) : (
          <NavItem targetPage={safePage + 1} ariaLabel="Next page">
            <span className="hidden sm:inline">Next</span>
            <Icon name="chevron_right" size={18} />
          </NavItem>
        )}
      </div>
    </nav>
  );
}
