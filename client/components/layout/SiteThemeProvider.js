'use client';

import { useEffect } from 'react';
import { useSiteThemeStore } from '@/stores/siteThemeStore';

/**
 * Syncs persisted site theme to <html class="dark"> for Tailwind darkMode: 'class'.
 * Reader chapter colours stay on data-reader-theme; this only affects site chrome.
 */
export default function SiteThemeProvider({ children }) {
  const siteTheme = useSiteThemeStore((s) => s.siteTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', siteTheme === 'dark');
  }, [siteTheme]);

  return children;
}
