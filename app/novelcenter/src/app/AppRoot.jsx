import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useReaderStore } from '@/stores/readerStore';
import { useAuthStore } from '@/stores/authStore';
import { buildAppColors } from '@/theme/discoverColors';
import { palettes } from '@/theme/palette';
import AuthGate from '@/app/AuthGate';
import ToastHost from '@/components/primitives/ToastHost';

export default function AppRoot() {
  const hydrateReader = useReaderStore((s) => s.hydrate);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const readerTheme = useReaderStore((s) => s.theme);

  useEffect(() => {
    hydrateReader();
    hydrateAuth();
  }, [hydrateReader, hydrateAuth]);

  const shell = buildAppColors(readerTheme);
  const p = palettes[readerTheme] || palettes.cream;

  const navTheme = readerTheme === 'dark'
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: shell.bg,
          card: shell.sheet,
          text: shell.white,
          border: shell.sheetBorder,
          primary: shell.white,
          notification: shell.accent,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: p.bg,
          card: p.surface,
          text: p.fg,
          border: p.rule,
          primary: p.fg,
          notification: p.accent,
        },
      };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <AuthGate />
          <ToastHost />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
