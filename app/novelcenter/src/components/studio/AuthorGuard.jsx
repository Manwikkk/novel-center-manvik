import React, { useState } from 'react';
import { View } from 'react-native';
import NCText from '@/components/primitives/Text';
import SignInModal from '@/components/featured/SignInModal';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import {
  StudioScreen,
  StudioHeader,
  StudioPrimaryButton,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { exitAuthorStudioToProfile } from '@/lib/authorNavigation';
import { useAuthStore } from '@/stores/authStore';

export default function AuthorGuard({ navigation, title, children }) {
  const { colors: C } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const [signInOpen, setSignInOpen] = useState(false);
  const isAuthor = user?.role === 'author' || user?.role === 'admin';

  if (!user) {
    return (
      <StudioScreen>
        <StudioHeader breadcrumb="Author Studio" title={title || 'Sign in required'} onBack={() => exitAuthorStudioToProfile(navigation)} />
        <View style={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, gap: 16 }}>
          <DarkSurface style={{ padding: 20, gap: 12 }}>
            <NCText variant="bodySm" style={{ color: C.muted, lineHeight: 22 }}>
              Sign in with an author account to manage books, chapters, and earnings.
            </NCText>
            <StudioPrimaryButton label="Sign in" onPress={() => setSignInOpen(true)} />
          </DarkSurface>
        </View>
        <SignInModal visible={signInOpen} onClose={() => setSignInOpen(false)} />
      </StudioScreen>
    );
  }

  if (!isAuthor) {
    return (
      <StudioScreen>
        <StudioHeader breadcrumb="Author Studio" title={title || 'Author access'} onBack={() => exitAuthorStudioToProfile(navigation)} />
        <View style={{ paddingHorizontal: STUDIO_LAYOUT.hPadding }}>
          <DarkSurface style={{ padding: 20, gap: 10 }}>
            <NCText variant="titleMd" style={{ color: C.white }}>This area is for authors</NCText>
            <NCText variant="bodySm" style={{ color: C.muted, lineHeight: 22 }}>
              Register as an author when creating your account, or contact support to publish on Novel Centre.
            </NCText>
          </DarkSurface>
        </View>
      </StudioScreen>
    );
  }

  return children;
}
