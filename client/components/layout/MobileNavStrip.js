'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { DashboardThemeToggleCompact } from '@/components/layout/DashboardThemeToggle';
import DashboardSiteHomeLink from '@/components/layout/DashboardSiteHomeLink';

export default function MobileNavStrip({ items }) {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden border-b border-surface-variant bg-surface-container-low">
      <div className="flex items-center gap-2 px-3 py-2">
        <DashboardSiteHomeLink variant="mobile" />
        <div className="flex flex-1 overflow-x-auto no-scrollbar gap-1 min-w-0">
        {items.filter((it) => !it.disabled && it.href !== '#').map((it) => {
          const active = it.exact ? pathname === it.href : pathname?.startsWith(it.href);
          return (
            <Link
              key={`${it.href}-${it.label}`}
              href={it.href}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded label-sm uppercase whitespace-nowrap',
                active
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {it.label}
            </Link>
          );
        })}
        </div>
        <DashboardThemeToggleCompact />
      </div>
    </nav>
  );
}
