import { useMemo } from 'react';
import { useReaderStore } from '@/stores/readerStore';
import { palettes } from '@/theme/palette';
import { fontFamily as fontFamilies } from '@/theme/typography';

export const DISCOVER_LAYOUT = {
  gutter: 12,
  hPadding: 16,
  cardRadius: 16,
};

/** Shell colors used by Home, Discover, Library, Profile, Studio, etc. */
export function buildAppColors(theme = 'dark') {
  if (theme === 'dark') {
    return {
      bg: '#000000',
      sheet: '#111111',
      sheetBorder: '#2A2A2A',
      pillBg: '#2A2A2A',
      inputBg: '#1A1A1A',
      inputBorder: '#333333',
      white: '#FFFFFF',
      muted: '#9CA3AF',
      error: '#F87171',
      accent: '#C2A878',
      overlay: 'rgba(0,0,0,0.78)',
    };
  }

  const p = palettes[theme] || palettes.cream;
  return {
    bg: p.bg,
    sheet: p.surface,
    sheetBorder: p.rule,
    pillBg: p.containerHigh,
    inputBg: p.surfaceLow,
    inputBorder: p.outline,
    white: p.fg,
    muted: p.muted,
    error: p.error,
    accent: p.accent,
    overlay: theme === 'cream' ? 'rgba(30,27,21,0.72)' : 'rgba(42,35,22,0.72)',
  };
}

/**
 * Global app theme driven by Reader Preferences (theme, size, family).
 * Use this instead of static DISCOVER_COLORS so changes apply on every screen.
 */
export function useAppTheme() {
  const theme = useReaderStore((s) => s.theme);
  const fontSize = useReaderStore((s) => s.fontSize);
  const fontFamilyKind = useReaderStore((s) => s.fontFamily);

  return useMemo(() => {
    const colors = buildAppColors(theme);
    const isDark = theme === 'dark';
    const fontScale = fontSize / 20;
    const readingFont = fontFamilyKind === 'sans' ? fontFamilies.sans : fontFamilies.serif;
    const uiFont = fontFamilyKind === 'sans' ? fontFamilies.sans : fontFamilies.sans;

    return {
      colors,
      layout: DISCOVER_LAYOUT,
      theme,
      fontSize,
      fontFamily: fontFamilyKind,
      readingFont,
      uiFont,
      fontScale,
      isDark,
      statusBarStyle: isDark ? 'light-content' : 'dark-content',
    };
  }, [theme, fontSize, fontFamilyKind]);
}

/** @deprecated Use useAppTheme().colors inside components */
export const DISCOVER_COLORS = buildAppColors('dark');
