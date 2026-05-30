'use client';

import { create } from 'zustand';

export const useUiStore = create((set, get) => ({
  drawerOpen: false,
  toasts: [],
  authModal: { open: false, tab: 'login', message: null },
  _authOnSuccess: null,

  setDrawerOpen: (v) => set({ drawerOpen: !!v }),
  pushToast: (t) => set((s) => ({ toasts: [...s.toasts, { id: Date.now() + Math.random(), ...t }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  openAuthModal: ({ tab = 'login', message, onSuccess } = {}) => {
    set({
      authModal: { open: true, tab, message: message || null },
      _authOnSuccess: typeof onSuccess === 'function' ? onSuccess : null,
    });
  },

  closeAuthModal: () => {
    set({
      authModal: { open: false, tab: 'login', message: null },
      _authOnSuccess: null,
    });
  },

  setAuthModalTab: (tab) => {
    set((s) => ({ authModal: { ...s.authModal, tab } }));
  },

  finishAuthModal: () => {
    const cb = get()._authOnSuccess;
    set({
      authModal: { open: false, tab: 'login', message: null },
      _authOnSuccess: null,
    });
    if (typeof cb === 'function') cb();
  },
}));
