'use client';

import { LogOut, Menu } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import DashboardSiteHomeLink from '@/components/layout/DashboardSiteHomeLink';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';

export default function DashboardTopbar({ title, subtitle, actions, onMenu }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/');
  }

  const titleText = typeof title === 'string' ? title : '';

  return (
    <header className="border-b border-surface-variant bg-background">
      <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-surface-variant">
        <Logo />
        <div className="flex items-center gap-2">
          <DashboardSiteHomeLink variant="topbar" className="!px-2 !py-1" />
          <button onClick={onMenu} aria-label="Open menu" className="text-on-surface p-2">
            <Menu size={20} />
          </button>
        </div>
      </div>
      <div className="px-4 md:px-edge py-5 md:py-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-8">
          <div className="min-w-0">
            {subtitle && <p className="label-sm uppercase text-on-surface-variant">{subtitle}</p>}
            <h1
              className="font-serif text-[26px] md:text-[32px] leading-[1.15] text-primary mt-1 line-clamp-2 break-words"
              title={titleText || undefined}
            >
              {title}
            </h1>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap',
              'overflow-x-auto md:overflow-visible md:justify-end',
            )}
          >
            <div className="hidden md:flex shrink-0">
              <DashboardSiteHomeLink variant="topbar" />
            </div>
            {actions}
            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <LogOut size={14} /> Sign out
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
