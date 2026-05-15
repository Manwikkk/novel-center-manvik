'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import Logo from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';

/**
 * Stitch "Admin" side navigation.  Same shape as the Author sidebar
 * but anchored by an admin profile chip and a different nav set.
 */

export const ADMIN_NAV = [
  { href: '/admin',                     label: 'Dashboard',          icon: 'dashboard',  exact: true },
  { href: '/admin/page-configuration', label: 'Page Configuration', icon: 'tune' },
  { href: '/admin/catalog',           label: 'Catalog',              icon: 'label' },
  { href: '/admin/users',               label: 'User Management',    icon: 'group' },
  { href: '/admin/comments',            label: 'Moderation',         icon: 'gavel' },
  { href: '/admin/transactions',        label: 'Transactions',       icon: 'monitoring' },
  { href: '/admin/books',               label: 'Books',              icon: 'menu_book' },
];

export default function AdminSidebar() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="bg-surface-container-low text-on-surface font-sans uppercase tracking-widest text-xs font-bold w-64 border-r border-surface-container-high hidden md:flex flex-col py-8 sticky top-0 h-screen shrink-0"
    >
      <div className="px-6 mb-8">
        <Logo className="normal-case" size={84} label={false} />
      </div>

      <div className="px-6 mb-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user?.displayName || 'Admin'} className="w-full h-full object-cover" />
          ) : (
            <Icon name="admin_panel_settings" size={20} className="text-on-surface-variant" />
          )}
        </div>
        <div>
          <p className="font-headline-md text-sm text-on-surface normal-case tracking-tight">
            {user?.displayName || 'Admin'}
          </p>
          <p className="font-ui-label-sm text-ui-label-sm text-on-surface-variant lowercase">
            System Control
          </p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {ADMIN_NAV.map((it) => {
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

      <div className="mt-auto flex flex-col gap-1 border-t border-surface-container-high pt-4">
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
