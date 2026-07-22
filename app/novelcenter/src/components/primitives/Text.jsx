import React from 'react';
import { Text as RNText } from 'react-native';
import { useTheme } from '@/theme';
import { useReaderStore } from '@/stores/readerStore';

/**
 * Themed Text. Pass `variant` for one of the typography presets, `tone` for
 * a colour from the active palette (`fg`, `muted`, `accent`, `error`, ...).
 *
 *   <NCText variant="headlineMd">Title</NCText>
 *   <NCText variant="uiLabelSm" tone="muted">Subtitle</NCText>
 */
export default function NCText({
  variant = 'body',
  tone = 'fg',
  align = 'auto',
  reading = false,
  children,
  style,
  numberOfLines,
  ellipsizeMode,
  selectable,
  onPress,
  ...rest
}) {
  const t = useTheme({ readerScope: reading });
  const fontSize = useReaderStore((s) => s.fontSize);
  const fontFamilyKind = useReaderStore((s) => s.fontFamily);
  const fontScale = fontSize / 20;
  const readingFont = fontFamilyKind === 'sans' ? t.fontFamily.sans : t.fontFamily.serif;

  const base = t.typography[variant] || t.typography.body;
  const color = t.colors[tone] || tone;

  const readingStyle = reading
    ? {
        fontFamily: t.reader.fontFamily,
        fontSize: t.reader.fontSize,
        lineHeight: Math.round(t.reader.fontSize * 1.6),
        color: t.colors.fg,
      }
    : {
        fontFamily: readingFont,
        ...(base.fontSize
          ? {
              fontSize: Math.round(base.fontSize * fontScale),
              lineHeight: base.lineHeight ? Math.round(base.lineHeight * fontScale) : undefined,
            }
          : {}),
      };

  return (
    <RNText
      style={[
        reading ? null : base,
        readingStyle,
        { color: reading ? t.colors.fg : color, textAlign: align },
        style,
      ]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      selectable={selectable}
      onPress={onPress}
      {...rest}
    >
      {children}
    </RNText>
  );
}
