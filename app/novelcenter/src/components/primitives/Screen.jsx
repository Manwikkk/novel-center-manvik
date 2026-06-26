import React from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

/**
 * Screen background + safe-area aware container. Pass `readerScope` for the
 * reader so it follows the cream/sepia/dark palette.
 */
export default function Screen({ children, padded = true, readerScope = false, style }) {
  const t = useTheme({ readerScope });
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: t.colors.bg,
          paddingTop: insets.top,
        },
        style,
      ]}
    >
      <StatusBar
        barStyle={t.paletteKey === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={Platform.OS === 'android' ? t.colors.bg : undefined}
      />
      <View style={{ flex: 1, paddingHorizontal: padded ? 20 : 0 }}>{children}</View>
    </View>
  );
}
