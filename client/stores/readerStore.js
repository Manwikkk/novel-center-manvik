'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const FONT_SIZES = [16, 18, 20, 22, 24, 28];
const THEMES = ['cream', 'sepia', 'dark'];
const FAMILIES = ['serif', 'sans'];

function applyToDom(state) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.readerTheme = state.theme;
  root.style.setProperty('--reader-font-size', `${state.fontSize}px`);
  root.style.setProperty(
    '--reader-font-family',
    state.fontFamily === 'sans'
      ? "var(--font-manrope), 'Manrope', system-ui, sans-serif"
      : "var(--font-newsreader), 'Newsreader', Georgia, serif",
  );
}

export const useReaderStore = create(
  persist(
    (set, get) => ({
      fontSize: 20,
      fontFamily: 'serif',
      theme: 'cream',
      controlsOpen: false,

      apply: () => applyToDom(get()),
      setControlsOpen: (open) => set({ controlsOpen: !!open }),

      bumpFont: (delta) => {
        const i = FONT_SIZES.indexOf(get().fontSize);
        const next = FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, i + delta))];
        set({ fontSize: next });
        applyToDom({ ...get(), fontSize: next });
      },
      setFontFamily: (family) => {
        if (!FAMILIES.includes(family)) return;
        set({ fontFamily: family });
        applyToDom({ ...get(), fontFamily: family });
      },
      setTheme: (theme) => {
        if (!THEMES.includes(theme)) return;
        set({ theme });
        applyToDom({ ...get(), theme });
      },
    }),
    {
      name: 'nc.reader',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? undefined : localStorage)),
      partialize: (s) => ({ fontSize: s.fontSize, fontFamily: s.fontFamily, theme: s.theme }),
      onRehydrateStorage: () => (state) => { if (state) applyToDom(state); },
    },
  ),
);

export const READER_FONT_SIZES = FONT_SIZES;
export const READER_THEMES = THEMES;
