'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import Logo from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { DashboardThemeToggleSidebar } from '@/components/layout/DashboardThemeToggle';

/**
 * Stitch "Author Studio" side navigation.  Full-height fixed sidebar
 * (264px wide), italic serif brand at the top, primary CTA, then a
 * stack of Material-icon nav links with a left-border accent on the
 * active item.  Help / Logout sit pinned to the bottom.
 */

export const AUTHOR_NAV = [
  { href: '/author',          label: 'Dashboard',     icon: 'dashboard',              exact: true },
  { href: '/author/books',    label: 'My Manuscripts', icon: 'book_2' },
  { href: '/author/earnings', label: 'Earnings',      icon: 'insights' },
  { href: '/author/settings', label: 'Settings',      icon: 'settings' },
];

export default function AuthorSidebar() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="bg-surface-container-low text-on-surface font-sans uppercase tracking-widest text-xs font-bold w-64 border-r border-surface-container-high hidden md:flex flex-col py-8 sticky top-0 h-screen shrink-0">
      <div className="px-6 mb-8">
        <Logo className="normal-case" size={84} label={false} />
        <p className="text-on-surface-variant mt-1 lowercase font-normal tracking-normal text-[11px]">
          Manage your works
        </p>
      </div>

      <div className="px-6 mb-8">
        <Link
          href="/author/books/new"
          className="block w-full text-center bg-primary text-on-primary py-3 rounded uppercase font-bold tracking-widest text-[11px] hover:opacity-80 transition-opacity"
        >
          New Book
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {AUTHOR_NAV.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'px-6 py-4 flex items-center gap-3 transition-all duration-200 ease-in-out text-[11px]',
                active
                  ? 'bg-surface-container-high text-on-surface border-l-4 border-on-surface'
                  : 'text-on-surface-variant hover:bg-surface-container',
              )}
            >
              <Icon name={it.icon} size={20} />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-surface-container-high pt-4">
        <DashboardThemeToggleSidebar />
        <Link
          href="/about"
          className="px-6 py-4 flex items-center gap-3 text-on-surface-variant hover:bg-surface-container transition-all duration-200 ease-in-out text-[11px]"
        >
          <Icon name="help" size={20} />
          Help
        </Link>
        <button
          type="button"
          onClick={async () => { await logout(); router.push('/'); }}
          className="w-full px-6 py-4 flex items-center gap-3 text-on-surface-variant hover:bg-surface-container transition-all duration-200 ease-in-out text-[11px] uppercase tracking-widest"
        >
          <Icon name="logout" size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}
