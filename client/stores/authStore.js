'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api, setTokens, clearTokens, getAccessToken } from '@/lib/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,

      hydrate: async () => {
        if (get().hydrated) return;
        if (!getAccessToken()) {
          set({ user: null, hydrated: true });
          return;
        }
        try {
          const data = await api.get('/auth/me');
          set({ user: data.user, hydrated: true });
        } catch (_err) {
          clearTokens();
          set({ user: null, hydrated: true });
        }
      },

      login: async ({ email, password }) => {
        const data = await api.post('/auth/login', { email, password });
        setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        set({ user: data.user, hydrated: true });
        return data.user;
      },

      register: async (payload) => {
        const data = await api.post('/auth/register', payload);
        setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        set({ user: data.user, hydrated: true });
        return data.user;
      },

      logout: () => {
        clearTokens();
        set({ user: null });
      },

      setUser: (user) => set({ user }),

      hasRole: (...roles) => {
        const u = get().user;
        return !!(u && roles.includes(u.role));
      },
    }),
    {
      name: 'nc.auth',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? undefined : localStorage)),
      partialize: (s) => ({ user: s.user }),
    },
  ),
);
