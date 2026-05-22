'use client';

import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useSiteThemeStore } from '@/stores/siteThemeStore';

/**
 * Theme control for author/admin dashboard chrome (uses nc.siteTheme + .dark on <html>).
 */
export function DashboardThemeToggleSidebar({ className, collapsed = false }) {
  const siteTheme = useSiteThemeStore((s) => s.siteTheme);
  const toggleSiteTheme = useSiteThemeStore((s) => s.toggleSiteTheme);
  const isDark = siteTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => toggleSiteTheme()}
      className={cn(
        'flex items-center gap-3 text-on-surface-variant',
        'hover:bg-surface-container transition-colors rounded-lg',
        collapsed ? 'p-2 justify-center w-full' : 'w-full px-3 py-2',
        className,
      )}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={18} />
      {!collapsed && (
        <span className="text-[13px] normal-case tracking-normal font-medium">
          {isDark ? 'Light theme' : 'Dark theme'}
        </span>
      )}
    </button>
  );
}

/** Icon button for mobile dashboard nav strip. */
export function DashboardThemeToggleCompact({ className }) {
  const siteTheme = useSiteThemeStore((s) => s.siteTheme);
  const toggleSiteTheme = useSiteThemeStore((s) => s.toggleSiteTheme);
  const isDark = siteTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => toggleSiteTheme()}
      className={cn(
        'shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded',
        'border border-outline/40 text-on-surface-variant',
        'hover:bg-surface-container transition-colors',
        className,
      )}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={18} />
      <span className="text-[10px] font-bold uppercase tracking-widest hidden min-[400px]:inline">
        {isDark ? 'Light' : 'Dark'}
      </span>
    </button>
  );
}
