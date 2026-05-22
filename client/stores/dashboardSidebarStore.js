'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useDashboardSidebarStore = create(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed: !!collapsed }),
    }),
    { name: 'nc.authorSidebar' },
  ),
);
