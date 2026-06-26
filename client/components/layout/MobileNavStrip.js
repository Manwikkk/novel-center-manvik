'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { DashboardThemeToggleCompact } from '@/components/layout/DashboardThemeToggle';
import DashboardSiteHomeLink from '@/components/layout/DashboardSiteHomeLink';

function flattenNavItems(items) {
  const out = [];
  for (const it of items || []) {
    if (it.disabled || it.href === '#') continue;
    if (Array.isArray(it.children) && it.children.length) {
      for (const child of it.children) {
        if (child.href) out.push(child);
      }
      continue;
    }
    if (it.href) out.push(it);
  }
  return out;
}

export default function MobileNavStrip({ items }) {
  const pathname = usePathname();
  const navItems = flattenNavItems(items);
  return (
    <nav className="lg:hidden border-b border-surface-variant bg-surface-container-low">
      <div className="flex items-center gap-2 px-3 py-2">
        <DashboardSiteHomeLink variant="mobile" />
        <div className="flex flex-1 overflow-x-auto no-scrollbar gap-1 min-w-0">
        {navItems.map((it) => {
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
