'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

export default function MobileNavStrip({ items }) {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden border-b border-ink-200/60 bg-cream-100">
      <div className="flex overflow-x-auto no-scrollbar gap-1 px-3 py-2">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname?.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded label-sm uppercase whitespace-nowrap',
                active ? 'bg-ink-900 text-cream-100' : 'text-ink-700 hover:bg-cream-300',
              )}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
