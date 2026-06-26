import React from 'react';
import { View } from 'react-native';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';

export default function Pill({ label, tone = 'muted', style }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: t.radii.pill,
          borderWidth: 1,
          borderColor: t.colors.containerHigh,
          backgroundColor: t.colors.surfaceLowest,
        },
        style,
      ]}
    >
      <NCText variant="uiLabelXs" tone={tone}>
        {label}
      </NCText>
    </View>
  );
}
