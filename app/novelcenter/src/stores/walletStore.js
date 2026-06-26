import { create } from 'zustand';
import { api } from '@/lib/api';

export const useWalletStore = create((set, get) => ({
  balance: 0,
  loading: false,

  setBalance: (n) => set({ balance: Number(n) || 0 }),

  refresh: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const data = await api.get('/wallet');
      set({ balance: Number(data?.balance) || 0 });
    } catch (_e) {
      // ignore — wallet refresh can fail silently when not logged in
    } finally {
      set({ loading: false });
    }
  },

  reset: () => set({ balance: 0 }),
}));
