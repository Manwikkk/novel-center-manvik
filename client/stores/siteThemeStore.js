'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const STORAGE_KEY = 'nc.siteTheme';

export const useSiteThemeStore = create(
  persist(
    (set) => ({
      siteTheme: 'light',
      setSiteTheme: (mode) => set({ siteTheme: mode === 'dark' ? 'dark' : 'light' }),
      toggleSiteTheme: () =>
        set((s) => ({ siteTheme: s.siteTheme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? undefined : localStorage,
      ),
      partialize: (s) => ({ siteTheme: s.siteTheme }),
    },
  ),
);
