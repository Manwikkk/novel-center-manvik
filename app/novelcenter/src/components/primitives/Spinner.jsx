import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/theme';

export default function Spinner({ size = 'large', center = false, style }) {
  const t = useTheme();
  if (center) {
    return (
      <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, style]}>
        <ActivityIndicator size={size} color={t.colors.fg} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={t.colors.fg} style={style} />;
}
