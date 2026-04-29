'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';

export const useWalletStore = create((set) => ({
  balance: 0,
  packs: null,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const data = await api.get('/wallet');
      set({ balance: data.wallet.balance, packs: data.packs, loading: false });
    } catch (_err) {
      set({ loading: false });
    }
  },

  setBalance: (n) => set({ balance: Number(n) || 0 }),

  purchase: async (pack) => {
    const data = await api.post('/wallet/purchase', { pack });
    set({ balance: data.balance });
    return data;
  },
}));
