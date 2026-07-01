import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import DiscoverStack from '@/navigation/DiscoverStack';
import RootTabs from '@/navigation/RootTabs';
import Spinner from '@/components/primitives/Spinner';
import { useAppTheme } from '@/theme/discoverColors';
import { View } from 'react-native';

export default function AuthGate() {
  const { colors: C } = useAppTheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <Spinner />
      </View>
    );
  }

  // Guests browse Discover + book details without the bottom tab bar.
  return user ? <RootTabs /> : <DiscoverStack />;
}
