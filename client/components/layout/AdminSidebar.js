'use client';

import { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import Logo from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { navItemsForUser } from '@/lib/adminPermissions';
import { DashboardThemeToggleSidebar } from '@/components/layout/DashboardThemeToggle';
import DashboardSiteHomeLink from '@/components/layout/DashboardSiteHomeLink';

// Every admin page mounts its own sidebar, so remember the nav's scroll offset
// between mounts instead of jumping back to the top on each tab change.
let savedNavScroll = 0;

export default function AdminSidebar() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navItems = navItemsForUser(user);
  const navRef = useRef(null);

  useLayoutEffect(() => {
    if (navRef.current) navRef.current.scrollTop = savedNavScroll;
  }, []);

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
            {user?.role === 'staff' ? 'Staff access' : 'System Control'}
          </p>
        </div>
      </div>

      <nav
        ref={navRef}
        onScroll={(e) => { savedNavScroll = e.currentTarget.scrollTop; }}
        className="flex-1 flex flex-col gap-1 overflow-y-auto"
      >
        <DashboardSiteHomeLink variant="admin-sidebar" />
        {navItems.map((it) => {
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
