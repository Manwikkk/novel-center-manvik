'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/**
 * Consistent escape hatch from author/admin dashboards back to the public site.
 */
export default function DashboardSiteHomeLink({
  variant = 'topbar',
  className,
  collapsed = false,
}) {
  if (variant === 'sidebar') {
    return (
      <Link
        href="/"
        className={cn(
          'flex items-center gap-3 mx-2 rounded-lg transition-colors',
          collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2.5',
          'text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-transparent hover:border-surface-variant/60',
          className,
        )}
        title={collapsed ? 'Back to home' : undefined}
      >
        <span
          className={cn(
            'shrink-0 flex items-center justify-center rounded-md text-studio-accent',
            collapsed ? 'h-10 w-10' : 'h-9 w-9',
          )}
        >
          <Home size={collapsed ? 20 : 18} strokeWidth={1.75} />
        </span>
        {!collapsed && (
          <span className="flex-1 text-left normal-case tracking-normal font-semibold text-[13px]">
            Reader site
          </span>
        )}
      </Link>
    );
  }

  if (variant === 'admin-sidebar') {
    return (
      <Link
        href="/"
        className={cn(
          'px-6 py-4 flex items-center gap-3 transition-all duration-200 ease-in-out text-[11px]',
          'text-on-surface-variant hover:bg-surface-container border-b border-surface-container-high mb-1',
          className,
        )}
      >
        <Icon name="home" size={20} />
        Reader site
      </Link>
    );
  }

  if (variant === 'mobile') {
    return (
      <Link
        href="/"
        className={cn(
          'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md',
          'border border-surface-variant bg-surface-container text-[11px] font-bold uppercase tracking-wider',
          'text-on-surface hover:bg-surface-container-high transition-colors',
          className,
        )}
      >
        <Home size={14} strokeWidth={2} />
        Home
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md shrink-0 whitespace-nowrap',
        'text-[12px] font-bold uppercase tracking-wider text-on-surface-variant',
        'hover:text-on-surface hover:bg-surface-container transition-colors',
        className,
      )}
    >
      <Home size={14} strokeWidth={2} />
      Reader site
    </Link>
  );
}
