import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import IconButton from '@/components/primitives/IconButton';
import Card from '@/components/primitives/Card';
import Button from '@/components/primitives/Button';
import Skeleton from '@/components/primitives/Skeleton';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function DashboardScreen({ navigation }) {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/author/earnings');
      setEarnings(data);
    } catch (_e) {
      setEarnings(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const t1 = earnings?.totals;

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <NCText variant="uiLabelSm" tone="muted">Account</NCText>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64, gap: 24 }}
        refreshControl={<RefreshControl tintColor={t.colors.fg} refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View>
          <NCText variant="uiLabelSm" tone="muted">Author Studio</NCText>
          <NCText variant="headlineXl">Hi, {user?.displayName?.split(' ')[0]}.</NCText>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat
            loading={loading}
            label="This month"
            value={t1?.monthTokens != null ? `${t1.monthTokens}` : '—'}
            sub="tokens"
          />
          <Stat
            loading={loading}
            label="Lifetime"
            value={t1?.lifetimeTokens != null ? `${t1.lifetimeTokens}` : '—'}
            sub="tokens"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat
            loading={loading}
            label="Books"
            value={t1?.books != null ? `${t1.books}` : '—'}
          />
          <Stat
            loading={loading}
            label="Readers"
            value={t1?.uniqueReaders != null ? `${t1.uniqueReaders}` : '—'}
          />
        </View>

        <View style={{ gap: 0 }}>
          <Row icon="library-books" label="My books" sub="Edit and publish books" onPress={() => navigation.navigate('AuthorBooks')} />
          <Row icon="trending-up" label="Earnings" sub="See unlocks and totals" onPress={() => navigation.navigate('AuthorEarnings')} />
          <Row icon="settings" label="Settings" sub="Profile and bio" onPress={() => navigation.navigate('AuthorSettings')} />
        </View>

        <Button
          label="New book"
          full
          icon={<Icon name="add" size={20} color={t.colors.cream100} />}
          onPress={() => navigation.navigate('AuthorBookEdit', { mode: 'create' })}
        />
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, sub, loading }) {
  return (
    <Card style={{ flex: 1 }} padded>
      <NCText variant="uiLabelSm" tone="muted">{label}</NCText>
      {loading ? (
        <Skeleton height={28} width="60%" style={{ marginTop: 6 }} />
      ) : (
        <NCText variant="headlineMd" style={{ marginTop: 4 }}>{value}</NCText>
      )}
      {sub ? <NCText variant="uiLabelXs" tone="muted">{sub}</NCText> : null}
    </Card>
  );
}

function Row({ icon, label, sub, onPress }) {
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
      <Icon name={icon} size={22} color={t.colors.fg} />
      <View style={{ flex: 1 }}>
        <NCText variant="titleMd">{label}</NCText>
        {sub ? <NCText variant="uiLabelXs" tone="muted">{sub}</NCText> : null}
      </View>
      <NCText variant="titleLg" tone="muted">›</NCText>
    </Pressable>
  );
}
