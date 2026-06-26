import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useReaderStore } from '@/stores/readerStore';
import { useAuthStore } from '@/stores/authStore';
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

  // Navigation theme — non-reader screens stay cream; this only colours
  // headers/tab strips so they match the Stitch surface.
  const navTheme = readerTheme === 'dark'
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: palettes.cream.bg,
          card: palettes.cream.surface,
          text: palettes.cream.fg,
          border: palettes.cream.containerHigh,
          primary: palettes.cream.fg,
          notification: palettes.cream.accent,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: palettes.cream.bg,
          card: palettes.cream.surface,
          text: palettes.cream.fg,
          border: palettes.cream.containerHigh,
          primary: palettes.cream.fg,
          notification: palettes.cream.accent,
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
