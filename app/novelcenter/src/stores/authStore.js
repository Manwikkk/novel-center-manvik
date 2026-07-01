import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setTokens, clearTokens, getAccessToken } from '@/lib/api';

const USER_KEY = 'nc.user';

export const useAuthStore = create((set, get) => ({
  user: null,
  hydrated: false,
  busy: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      try {
        const cachedRaw = await AsyncStorage.getItem(USER_KEY);
        if (cachedRaw) set({ user: JSON.parse(cachedRaw) });
      } catch (_e) {}

      const token = await getAccessToken();
      if (!token) {
        set({ user: null, hydrated: true });
        return;
      }
      try {
        const data = await api.get('/auth/me');
        set({ user: data.user, hydrated: true });
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch (_err) {
        await clearTokens();
        await AsyncStorage.removeItem(USER_KEY);
        set({ user: null, hydrated: true });
      }
    } catch (_err) {
      set({ user: null, hydrated: true });
    }
  },

  login: async ({ email, password }) => {
    set({ busy: true });
    try {
      const data = await api.post('/auth/login', { email, password });
      await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      set({ user: data.user, hydrated: true });
      return data.user;
    } finally {
      set({ busy: false });
    }
  },

  register: async (payload) => {
    set({ busy: true });
    try {
      const data = await api.post('/auth/register', payload);
      await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      set({ user: data.user, hydrated: true });
      return data.user;
    } finally {
      set({ busy: false });
    }
  },

  logout: async () => {
    await clearTokens();
    await AsyncStorage.removeItem(USER_KEY);
    set({ user: null, hydrated: true });
  },

  refreshMe: async () => {
    try {
      const data = await api.get('/auth/me');
      set({ user: data.user });
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch (_e) {
      return null;
    }
  },

  setUser: (user) => {
    set({ user });
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)).catch(() => {});
  },

  hasRole: (...roles) => {
    const u = get().user;
    return !!(u && roles.includes(u.role));
  },
}));
