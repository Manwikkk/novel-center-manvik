import React from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import AuthStack from '@/navigation/AuthStack';
import RootTabs from '@/navigation/RootTabs';
import Spinner from '@/components/primitives/Spinner';
import { useTheme } from '@/theme';

export default function AuthGate() {
  const t = useTheme();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg }}>
        <Spinner />
      </View>
    );
  }

  return user ? <RootTabs /> : <AuthStack />;
}
