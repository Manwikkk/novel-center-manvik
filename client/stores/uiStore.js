'use client';

import { create } from 'zustand';

export const useUiStore = create((set) => ({
  drawerOpen: false,
  toasts: [],

  setDrawerOpen: (v) => set({ drawerOpen: !!v }),
  pushToast: (t) => set((s) => ({ toasts: [...s.toasts, { id: Date.now() + Math.random(), ...t }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
