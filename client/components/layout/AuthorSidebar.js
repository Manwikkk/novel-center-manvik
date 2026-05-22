'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LayoutGrid,
  CircleDollarSign,
  Rocket,
  Award,
  GraduationCap,
  HelpCircle,
  LogOut,
  ChevronRight,
  X,
  Menu,
  BookOpen,
  MessageCircle,
  Globe,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { useDashboardSidebarStore } from '@/stores/dashboardSidebarStore';
import { DashboardThemeToggleSidebar } from '@/components/layout/DashboardThemeToggle';
import Avatar from '@/components/ui/Avatar';

export const AUTHOR_NAV = [
  { href: '/author', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/author/books', label: 'Workspace', icon: LayoutGrid, showChevron: true },
  { href: '/author/earnings', label: 'Income', icon: CircleDollarSign },
  { href: '/author/books', label: 'Promote', icon: Rocket, disabled: true },
  { href: '#', label: 'Privilege', icon: Award, disabled: true },
  { href: '/about', label: 'Academy', icon: GraduationCap },
];

function StudioClock() {
  const [time, setTime] = useStateClock();
  return (
    <span className="tabular-nums text-[11px] text-on-surface-variant font-normal normal-case tracking-normal">
      {time}
    </span>
  );
}

function useStateClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function NavItem({ item, pathname, collapsed }) {
  const active = item.exact
    ? pathname === item.href
    : item.href !== '#' && pathname.startsWith(item.href);
  const Icon = item.icon;

  const content = (
    <>
      <span
        className={cn(
          'shrink-0 flex items-center justify-center rounded-md transition-colors',
          collapsed ? 'h-10 w-10' : 'h-9 w-9',
          active && 'bg-surface-container-high text-on-surface',
          !active && 'text-on-surface-variant',
        )}
      >
        <Icon size={collapsed ? 20 : 18} strokeWidth={1.75} />
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left normal-case tracking-normal font-semibold text-[13px]">
            {item.label}
          </span>
          {item.showChevron && <ChevronRight size={14} className="text-on-surface-variant opacity-60" />}
        </>
      )}
    </>
  );

  const className = cn(
    'flex items-center gap-3 transition-colors rounded-lg mx-2',
    collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2.5',
    active && !collapsed && 'bg-surface-container-high text-on-surface',
    !active && 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
    item.disabled && 'opacity-40 pointer-events-none',
  );

  if (item.disabled || item.href === '#') {
    return (
      <div className={className} title={collapsed ? item.label : undefined}>
        {content}
      </div>
    );
  }

  return (
    <Link href={item.href} className={className} title={collapsed ? item.label : undefined}>
      {content}
    </Link>
  );
}

export default function AuthorSidebar() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const collapsed = useDashboardSidebarStore((s) => s.collapsed);
  const toggle = useDashboardSidebarStore((s) => s.toggle);

  return (
    <aside
      className={cn(
        'bg-surface-container-low text-on-surface border-r border-surface-variant',
        'hidden lg:flex flex-col sticky top-0 h-screen shrink-0 transition-[width] duration-200 ease-out',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      {/* Header: logo mark + collapse (X) / expand (menu) */}
      <div
        className={cn(
          'border-b border-surface-variant shrink-0',
          collapsed ? 'flex flex-col items-center gap-3 py-4 px-2' : 'flex items-center justify-between gap-2 px-4 py-4',
        )}
      >
        {collapsed ? (
          <>
            <button
              type="button"
              onClick={toggle}
              className="p-2 rounded-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              aria-label="Expand sidebar"
            >
              <Menu size={20} strokeWidth={1.75} />
            </button>
            <Link
              href="/author"
              className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-sm bg-cream-100 dark:bg-cream-100 p-1.5 shrink-0"
              title="Novel Centre"
            >
              <Image
                src="/images/Novel_Center_Logo.png"
                alt="Novel Centre"
                width={28}
                height={28}
                className="object-contain"
                priority
              />
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/author"
              className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-sm bg-cream-100 dark:bg-cream-100 p-1.5 shrink-0"
              title="Novel Centre"
            >
              <Image
                src="/images/Novel_Center_Logo.png"
                alt="Novel Centre"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              aria-label="Collapse sidebar"
            >
              <X size={20} strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {AUTHOR_NAV.map((it) => (
          <NavItem key={`${it.href}-${it.label}`} item={it} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-surface-variant py-3 space-y-1">
        <Link
          href="/author/settings"
          className={cn(
            'flex items-center gap-3 mx-2 rounded-lg hover:bg-surface-container transition-colors',
            collapsed ? 'justify-center p-2' : 'px-3 py-2',
          )}
          title={collapsed ? user?.displayName || 'Profile' : undefined}
        >
          <Avatar name={user?.displayName} src={user?.avatarUrl} size={collapsed ? 36 : 32} />
          {!collapsed && (
            <>
              <span className="flex-1 min-w-0 text-left normal-case tracking-normal">
                <span className="block text-[13px] font-semibold text-on-surface truncate">
                  {user?.displayName || 'Author'}
                </span>
              </span>
              <ChevronRight size={14} className="text-on-surface-variant shrink-0" />
            </>
          )}
        </Link>

        {!collapsed && (
          <div className="px-4 py-2 flex items-center justify-between text-[11px] text-on-surface-variant normal-case tracking-normal font-medium">
            <span>GMT+8</span>
            <StudioClock />
          </div>
        )}

        <div className={cn('mx-2', collapsed ? 'flex flex-col items-center gap-1' : 'px-1')}>
          <DashboardThemeToggleSidebar collapsed={collapsed} />
          <Link
            href="/about"
            className={cn(
              'flex items-center gap-3 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors',
              collapsed ? 'p-2 justify-center' : 'px-3 py-2',
            )}
            title="Help"
          >
            <HelpCircle size={18} />
            {!collapsed && <span className="text-[13px] normal-case tracking-normal font-medium">Help</span>}
          </Link>
          <button
            type="button"
            onClick={async () => { await logout(); router.push('/'); }}
            className={cn(
              'w-full flex items-center gap-3 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors',
              collapsed ? 'p-2 justify-center' : 'px-3 py-2',
            )}
            title="Logout"
          >
            <LogOut size={18} />
            {!collapsed && <span className="text-[13px] normal-case tracking-normal font-medium">Logout</span>}
          </button>
        </div>

        <div
          className={cn(
            'flex items-center border-t border-surface-variant pt-3 mt-2',
            collapsed ? 'flex-col gap-2 px-2' : 'justify-around px-4',
          )}
        >
          <Link href="/author/books" className="p-2 text-on-surface-variant hover:text-tertiary" title="Books">
            <BookOpen size={18} />
          </Link>
          <Link href="/about" className="p-2 text-on-surface-variant hover:text-tertiary" title="Community">
            <MessageCircle size={18} />
          </Link>
          <Link href="/" className="p-2 text-on-surface-variant hover:text-tertiary" title="Site">
            <Globe size={18} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
