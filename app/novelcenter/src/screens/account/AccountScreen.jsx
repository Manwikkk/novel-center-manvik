import React, { useEffect, useState } from 'react';
import { View, Pressable, ScrollView, Alert, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import Avatar from '@/components/primitives/Avatar';
import SignInModal from '@/components/featured/SignInModal';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useReaderStore } from '@/stores/readerStore';
import { useAppTheme, DISCOVER_LAYOUT } from '@/theme/discoverColors';

export default function AccountScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors: C, statusBarStyle } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const readerTheme = useReaderStore((s) => s.theme);
  const fontSize = useReaderStore((s) => s.fontSize);

  const [signInOpen, setSignInOpen] = useState(false);
  const [signInMode, setSignInMode] = useState('login');

  useEffect(() => { if (user) refreshWallet(); }, [user, refreshWallet]);

  const isAuthor = user?.role === 'author' || user?.role === 'admin';

  const openSignIn = (mode = 'login') => {
    setSignInMode(mode);
    setSignInOpen(true);
  };

  const onLogout = () => {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { logout(); useWalletStore.getState().reset(); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={C.bg} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: DISCOVER_LAYOUT.hPadding,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 24) + 72,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <NCText variant="headlineXl" style={{ color: C.white, fontWeight: '700', fontSize: 28 }}>
          Profile
        </NCText>

        {!user ? (
          <DarkSurface style={{ padding: 18, gap: 14 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: C.inputBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="person-outline" size={28} color={C.muted} />
            </View>
            <NCText variant="titleLg" style={{ color: C.white }}>You are browsing as a guest</NCText>
            <NCText variant="bodySm" style={{ color: C.muted, lineHeight: 20 }}>
              Sign in to save books, track progress, and unlock chapters.
            </NCText>
            <Pressable
              onPress={() => openSignIn('login')}
              style={({ pressed }) => ({
                backgroundColor: C.white,
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: pressed ? 0.88 : 1,
              })}
            >
              <NCText variant="uiLabelSm" style={{ color: C.bg, fontWeight: '700' }}>Sign in</NCText>
            </Pressable>
            <Pressable onPress={() => openSignIn('register')} style={{ alignItems: 'center' }}>
              <NCText variant="uiLabelSm" style={{ color: C.white, borderBottomWidth: 1, borderBottomColor: C.white, paddingBottom: 1 }}>
                Create account
              </NCText>
            </Pressable>
          </DarkSurface>
        ) : (
          <>
            <DarkSurface style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <Avatar name={user?.displayName} source={user?.avatarUrl} size={56} />
                <View style={{ flex: 1, gap: 4 }}>
                  <NCText variant="titleLg" style={{ color: C.white }}>{user?.displayName}</NCText>
                  <NCText variant="uiLabelXs" style={{ color: C.muted, letterSpacing: 0, fontSize: 12 }}>
                    {user?.email}
                  </NCText>
                  <NCText variant="uiLabelXs" style={{ color: C.muted, letterSpacing: 0, fontSize: 11 }}>
                    Role: {user?.role}
                  </NCText>
                </View>
              </View>
            </DarkSurface>

            <Pressable onPress={() => navigation.navigate('Wallet')}>
              <DarkSurface style={{ padding: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ gap: 4 }}>
                    <NCText variant="uiLabelSm" style={{ color: C.muted, letterSpacing: 1, fontSize: 10 }}>
                      WALLET
                    </NCText>
                    <NCText variant="headlineMd" style={{ color: C.white, fontSize: 24 }}>
                      {balance.toLocaleString()} tokens
                    </NCText>
                    <NCText variant="bodySm" style={{ color: C.muted }}>
                      Top up to unlock paid chapters.
                    </NCText>
                  </View>
                  <Icon name="account-balance-wallet" size={28} color={C.white} />
                </View>
              </DarkSurface>
            </Pressable>
          </>
        )}

        <DarkSurface>
          <Row icon="format-size" label="Reader preferences" sub={`${readerTheme} · ${fontSize}px`} onPress={() => navigation.navigate('ReaderPrefs')} first />
          {user && isAuthor ? (
            <Row icon="edit-note" label="Author Studio" sub="Manage your books and chapters" onPress={() => navigation.navigate('AuthorStudio')} />
          ) : null}
          <Row icon="info-outline" label="About Novel Centre" sub="Version 1.0.0" onPress={() => Alert.alert('Novel Centre', 'Your home for serialized fiction — read, save, and write on mobile and web.')} />
          {user ? <Row icon="logout" label="Sign out" tone="error" onPress={onLogout} /> : null}
        </DarkSurface>
      </ScrollView>

      <SignInModal visible={signInOpen} onClose={() => setSignInOpen(false)} initialMode={signInMode} />
    </View>
  );
}

function Row({ icon, label, sub, onPress, tone, first }) {
  const { colors: C } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: C.inputBorder,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={22} color={tone === 'error' ? C.error : C.white} />
      <View style={{ flex: 1 }}>
        <NCText variant="titleMd" style={{ color: tone === 'error' ? C.error : C.white }}>{label}</NCText>
        {sub ? (
          <NCText variant="uiLabelXs" style={{ color: C.muted, letterSpacing: 0, fontSize: 11, marginTop: 2 }}>
            {sub}
          </NCText>
        ) : null}
      </View>
      {onPress ? <Icon name="chevron-right" size={22} color={C.muted} /> : null}
    </Pressable>
  );
}
