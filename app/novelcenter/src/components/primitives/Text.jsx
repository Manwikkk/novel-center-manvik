import React from 'react';
import { Text as RNText } from 'react-native';
import { useTheme } from '@/theme';

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
  children,
  style,
  numberOfLines,
  ellipsizeMode,
  selectable,
  onPress,
  ...rest
}) {
  const t = useTheme();
  const base = t.typography[variant] || t.typography.body;
  const color = t.colors[tone] || tone;

  return (
    <RNText
      style={[base, { color, textAlign: align }, style]}
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
