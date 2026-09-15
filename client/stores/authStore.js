'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api, setTokens, clearTokens, getAccessToken } from '@/lib/api';

function isSameUser(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (_e) {
    return false;
  }
}

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

      loginWithGoogle: async (credential) => {
        const data = await api.post('/auth/google', { credential });
        setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        set({ user: data.user, hydrated: true });
        return data;
      },

      // Accepts an experience ('reader' | 'creator' | 'both') or a legacy role.
      completeOnboarding: async (choice) => {
        const body = typeof choice === 'object' && choice
          ? choice
          : ['reader', 'creator', 'both'].includes(choice)
            ? { experience: choice }
            : { role: choice };
        const data = await api.post('/auth/onboarding', body);
        if (data.accessToken) {
          setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        }
        set({ user: data.user, hydrated: true });
        return data.user;
      },

      becomeAuthor: async () => {
        const data = await api.post('/auth/become-author');
        if (data.accessToken) {
          setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        }
        set({ user: data.user, hydrated: true });
        return data.user;
      },

      // Switch between reader / creator / both. Moving a reader account to a
      // creator experience also makes it an author, so tokens are reissued.
      setExperience: async (experience) => {
        const data = await api.patch('/auth/me', { experience });
        let user = data.user;
        if (user && user.role === 'author' && get().user?.role === 'user') {
          const upgraded = await api.post('/auth/become-author');
          if (upgraded.accessToken) {
            setTokens({ accessToken: upgraded.accessToken, refreshToken: upgraded.refreshToken });
          }
          user = upgraded.user;
        }
        set({ user, hydrated: true });
        return user;
      },

      logout: () => {
        clearTokens();
        set({ user: null });
      },

      // Session polling re-sends the same profile every 30s; skip identical
      // payloads so effects keyed on `user` don't refetch and reset their UI.
      setUser: (user) => set((s) => (isSameUser(s.user, user) ? {} : { user })),

      hasRole: (...roles) => {
        const u = get().user;
        return !!(u && roles.includes(u.role));
      },

      hasAdminPermission: (permission) => {
        const u = get().user;
        if (!u) return false;
        if (u.role === 'admin') return true;
        if (u.role !== 'staff') return false;
        return (u.adminPermissions || []).includes(permission);
      },

      canAccessAdminPanel: () => {
        const u = get().user;
        return u?.role === 'admin' || u?.role === 'staff';
      },
    }),
    {
      name: 'nc.auth',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? undefined : localStorage)),
      partialize: (s) => ({ user: s.user }),
    },
  ),
);
