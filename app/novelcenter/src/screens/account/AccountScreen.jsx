import React, { useEffect } from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import Avatar from '@/components/primitives/Avatar';
import Card from '@/components/primitives/Card';
import Button from '@/components/primitives/Button';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useReaderStore } from '@/stores/readerStore';

export default function AccountScreen({ navigation }) {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const readerTheme = useReaderStore((s) => s.theme);
  const fontSize = useReaderStore((s) => s.fontSize);

  useEffect(() => { if (user) refreshWallet(); }, [user, refreshWallet]);

  const isAuthor = user?.role === 'author' || user?.role === 'admin';

  const onLogout = () => {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { logout(); useWalletStore.getState().reset(); } },
    ]);
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 64, gap: 24 }}>
        <NCText variant="headlineXl">Account</NCText>

        <Card>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Avatar name={user?.displayName} source={user?.avatarUrl} size={56} />
            <View style={{ flex: 1 }}>
              <NCText variant="titleLg">{user?.displayName}</NCText>
              <NCText variant="uiLabelXs" tone="muted">{user?.email}</NCText>
              <NCText variant="uiLabelXs" tone="muted" style={{ marginTop: 4 }}>
                Role: {user?.role}
              </NCText>
            </View>
          </View>
        </Card>

        <Pressable onPress={() => navigation.navigate('Wallet')}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <NCText variant="uiLabelSm" tone="muted">Wallet</NCText>
                <NCText variant="headlineMd">{balance.toLocaleString()} tokens</NCText>
                <NCText variant="bodySm" tone="muted">Top up to unlock paid chapters.</NCText>
              </View>
              <Icon name="account-balance-wallet" size={28} color={t.colors.fg} />
            </View>
          </Card>
        </Pressable>

        <View style={{ gap: 0 }}>
          <Row
            icon="format-size"
            label="Reader preferences"
            sub={`${readerTheme} · ${fontSize}px`}
            onPress={() => navigation.navigate('ReaderPrefs')}
          />
          {isAuthor ? (
            <Row
              icon="edit-note"
              label="Author Studio"
              sub="Manage your books and chapters"
              onPress={() => navigation.navigate('AuthorStudio')}
            />
          ) : null}
          <Row icon="info-outline" label="About Novel Centre" sub="Version 1.0.0" />
          <Row icon="logout" label="Sign out" tone="error" onPress={onLogout} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({ icon, label, sub, onPress, tone }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderTopWidth: 1,
        borderTopColor: t.colors.containerHigh,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={22} color={tone === 'error' ? t.colors.error : t.colors.fg} />
      <View style={{ flex: 1 }}>
        <NCText variant="titleMd" style={{ color: tone === 'error' ? t.colors.error : t.colors.fg }}>{label}</NCText>
        {sub ? <NCText variant="uiLabelXs" tone="muted">{sub}</NCText> : null}
      </View>
      {onPress ? <NCText variant="titleLg" tone="muted">›</NCText> : null}
    </Pressable>
  );
}
