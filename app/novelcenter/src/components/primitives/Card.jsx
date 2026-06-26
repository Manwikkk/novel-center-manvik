import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';

export default function Card({
  children,
  style,
  tone = 'surfaceLow',
  padded = true,
  elevated = false,
  border = true,
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.colors[tone] || tone,
          borderRadius: t.radii.lg,
          borderWidth: border ? 1 : 0,
          borderColor: t.colors.containerHigh,
          padding: padded ? 20 : 0,
        },
        elevated ? t.shadows.card : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
