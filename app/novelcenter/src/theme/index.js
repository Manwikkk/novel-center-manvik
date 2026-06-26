import { useMemo } from 'react';
import { palettes } from '@/theme/palette';
import { typography, fontFamily } from '@/theme/typography';
import { spacing, radii } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';
import { useReaderStore } from '@/stores/readerStore';

export { palettes } from '@/theme/palette';
export { typography, fontFamily } from '@/theme/typography';
export { spacing, radii } from '@/theme/spacing';
export { shadows } from '@/theme/shadows';

/**
 * Returns the theme bundle. By default we use cream — only the reader
 * surfaces opt into `{ readerScope: true }` to mirror the reader theme.
 */
export function useTheme({ readerScope = false } = {}) {
  const readerTheme = useReaderStore((s) => s.theme);
  const fontSize = useReaderStore((s) => s.fontSize);
  const fontFamilyKind = useReaderStore((s) => s.fontFamily);
  const paletteKey = readerScope ? readerTheme : 'cream';

  return useMemo(() => {
    const colors = palettes[paletteKey] || palettes.cream;
    return {
      paletteKey,
      colors,
      typography,
      fontFamily,
      spacing,
      radii,
      shadows,
      reader: {
        fontSize,
        fontFamily: fontFamilyKind === 'sans' ? fontFamily.sans : fontFamily.serif,
      },
    };
  }, [paletteKey, fontSize, fontFamilyKind]);
}
