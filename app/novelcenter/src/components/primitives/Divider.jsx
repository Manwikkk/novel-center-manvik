import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';

export default function Divider({ style, vertical = false }) {
  const t = useTheme();
  return (
    <View
      style={[
        vertical
          ? { width: 1, alignSelf: 'stretch', backgroundColor: t.colors.containerHigh }
          : { height: 1, alignSelf: 'stretch', backgroundColor: t.colors.containerHigh },
        style,
      ]}
    />
  );
}
