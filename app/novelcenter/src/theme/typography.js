// Typography scale mirrors the web tokens (display-lg, headline-xl/md,
// ui-label-lg/sm, reading-body). On RN we ship Newsreader (serif) and
// Manrope (sans) when bundled; we fall back to the system serif/sans via
// the platform `serif` / `System` family when those fonts aren't linked
// yet, so the app still boots before `npx react-native-asset` runs.
import { Platform } from 'react-native';

const SERIF = Platform.select({
  ios: 'Newsreader-Regular',
  android: 'Newsreader-Regular',
  default: 'serif',
});
const SERIF_MEDIUM = Platform.select({
  ios: 'Newsreader-Medium',
  android: 'Newsreader-Medium',
  default: 'serif',
});
const SANS = Platform.select({
  ios: 'Manrope-Regular',
  android: 'Manrope-Regular',
  default: 'System',
});
const SANS_BOLD = Platform.select({
  ios: 'Manrope-Bold',
  android: 'Manrope-Bold',
  default: 'System',
});

export const fontFamily = {
  serif: SERIF,
  serifMedium: SERIF_MEDIUM,
  sans: SANS,
  sansBold: SANS_BOLD,
};

export const typography = {
  displayLg:   { fontFamily: SERIF_MEDIUM, fontSize: 40, lineHeight: 44, letterSpacing: -0.5 },
  headlineXl:  { fontFamily: SERIF_MEDIUM, fontSize: 32, lineHeight: 36, letterSpacing: -0.3 },
  headlineMd:  { fontFamily: SERIF_MEDIUM, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  headlineSm:  { fontFamily: SERIF_MEDIUM, fontSize: 20, lineHeight: 26 },
  titleLg:     { fontFamily: SERIF,        fontSize: 18, lineHeight: 24 },
  titleMd:     { fontFamily: SANS_BOLD,    fontSize: 16, lineHeight: 22 },
  body:        { fontFamily: SANS,         fontSize: 15, lineHeight: 22 },
  bodySm:      { fontFamily: SANS,         fontSize: 13, lineHeight: 18 },
  uiLabelLg:   { fontFamily: SANS_BOLD,    fontSize: 13, lineHeight: 16, letterSpacing: 1.6, textTransform: 'uppercase' },
  uiLabelSm:   { fontFamily: SANS_BOLD,    fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  uiLabelXs:   { fontFamily: SANS_BOLD,    fontSize: 10, lineHeight: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  readingBody: { fontFamily: SERIF,        fontSize: 17, lineHeight: 28 },
};
