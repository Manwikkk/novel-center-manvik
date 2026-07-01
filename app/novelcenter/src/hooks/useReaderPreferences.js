import { useMemo } from 'react';
import { useReaderStore } from '@/stores/readerStore';
import { palettes } from '@/theme/palette';
import { fontFamily as fontFamilies } from '@/theme/typography';

/** Resolved reader typography + palette for use anywhere in the app. */
export function useReaderPreferences() {
  const fontSize = useReaderStore((s) => s.fontSize);
  const fontFamilyKind = useReaderStore((s) => s.fontFamily);
  const theme = useReaderStore((s) => s.theme);
  const setFontSize = useReaderStore((s) => s.setFontSize);
  const setFontFamily = useReaderStore((s) => s.setFontFamily);
  const setTheme = useReaderStore((s) => s.setTheme);
  const bumpFont = useReaderStore((s) => s.bumpFont);

  return useMemo(() => {
    const colors = palettes[theme] || palettes.cream;
    const familyName = fontFamilyKind === 'sans' ? fontFamilies.sans : fontFamilies.serif;

    return {
      fontSize,
      fontFamily: fontFamilyKind,
      fontFamilyName: familyName,
      theme,
      colors,
      setFontSize,
      setFontFamily,
      setTheme,
      bumpFont,
      bodyStyle: {
        color: colors.fg,
        fontFamily: familyName,
        fontSize,
        lineHeight: Math.round(fontSize * 1.6),
      },
      titleStyle: {
        color: colors.fg,
        fontFamily: familyName,
        fontSize: Math.max(22, Math.round(fontSize * 1.35)),
        lineHeight: Math.max(28, Math.round(fontSize * 1.45)),
        fontWeight: '700',
      },
    };
  }, [fontSize, fontFamilyKind, theme, setFontSize, setFontFamily, setTheme, bumpFont]);
}
