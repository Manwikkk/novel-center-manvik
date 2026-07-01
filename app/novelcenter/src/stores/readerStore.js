import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_SIZES = [16, 18, 20, 22, 24, 28];
const THEMES = ['cream', 'sepia', 'dark'];
const FAMILIES = ['serif', 'sans'];

const KEY = 'nc.reader';

export const useReaderStore = create((set, get) => ({
  fontSize: 20,
  fontFamily: 'serif',
  theme: 'cream',
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          fontSize: FONT_SIZES.includes(parsed.fontSize) ? parsed.fontSize : 20,
          fontFamily: FAMILIES.includes(parsed.fontFamily) ? parsed.fontFamily : 'serif',
          theme: THEMES.includes(parsed.theme) ? parsed.theme : 'cream',
        });
      }
    } catch (_e) {}
    set({ hydrated: true });
  },

  bumpFont: (delta) => {
    const i = FONT_SIZES.indexOf(get().fontSize);
    const next = FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, i + delta))];
    set({ fontSize: next });
    persist(get());
  },
  setFontSize: (size) => {
    if (!FONT_SIZES.includes(size)) return;
    set({ fontSize: size });
    persist(get());
  },
  setFontFamily: (family) => {
    if (!FAMILIES.includes(family)) return;
    set({ fontFamily: family });
    persist(get());
  },
  setTheme: (theme) => {
    if (!THEMES.includes(theme)) return;
    set({ theme });
    persist(get());
  },
}));

function persist(state) {
  const { fontSize, fontFamily, theme } = state;
  AsyncStorage.setItem(KEY, JSON.stringify({ fontSize, fontFamily, theme })).catch(() => {});
}

export const READER_FONT_SIZES = FONT_SIZES;
export const READER_THEMES = THEMES;
export const READER_FAMILIES = FAMILIES;
