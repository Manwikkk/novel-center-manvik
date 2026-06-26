import React, { useCallback, useEffect } from 'react';
import { View, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import Card from '@/components/primitives/Card';
import IconButton from '@/components/primitives/IconButton';
import Button from '@/components/primitives/Button';
import EmptyState from '@/components/primitives/EmptyState';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';
import { usePagedQuery } from '@/hooks/usePagedQuery';
import { formatRelative } from '@/lib/format';

const PACKS = [
  { id: 'small',  tokens: 100,  price: '$1.99' },
  { id: 'medium', tokens: 500,  price: '$8.99' },
  { id: 'large',  tokens: 1200, price: '$18.99' },
];

export default function WalletScreen({ navigation }) {
  const t = useTheme();
  const balance = useWalletStore((s) => s.balance);
  const refresh = useWalletStore((s) => s.refresh);
  const setBalance = useWalletStore((s) => s.setBalance);
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => { refresh(); }, [refresh]);

  const loader = useCallback(({ page, pageSize }) => api.get('/wallet/transactions', { query: { page, pageSize } }), []);
  const paged = usePagedQuery(loader, { pageSize: 20 });

  const purchase = async (pack) => {
    try {
      const data = await api.post('/wallet/purchase', { pack });
      if (data?.balance != null) setBalance(data.balance);
      pushToast({ type: 'success', title: 'Top-up complete', message: `+${data.creditedTokens} tokens` });
      paged.refresh();
    } catch (err) {
      pushToast({ type: 'error', title: 'Top-up failed', message: err.message });
    }
  };

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <NCText variant="uiLabelSm" tone="muted">Account</NCText>
      </View>

      <FlatList
        data={paged.items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64 }}
        ListHeaderComponent={
          <View style={{ gap: 18 }}>
            <NCText variant="headlineXl">Wallet</NCText>
            <Card padded>
              <NCText variant="uiLabelSm" tone="muted">Current balance</NCText>
              <NCText variant="displayLg" style={{ marginTop: 4 }}>{balance.toLocaleString()}</NCText>
              <NCText variant="bodySm" tone="muted">tokens</NCText>
            </Card>

            <View style={{ gap: 12 }}>
              <NCText variant="uiLabelSm" tone="muted">TOP UP</NCText>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {PACKS.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => purchase(p.id)}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: t.colors.containerHigh,
                      borderRadius: t.radii.md,
                      alignItems: 'center',
                      backgroundColor: t.colors.surfaceLow,
                      gap: 4,
                    }}
                  >
                    <NCText variant="titleLg">{p.tokens}</NCText>
                    <NCText variant="uiLabelXs" tone="muted">tokens</NCText>
                    <NCText variant="uiLabelSm">{p.price}</NCText>
                  </Pressable>
                ))}
              </View>
            </View>

            <NCText variant="uiLabelSm" tone="muted" style={{ marginTop: 12 }}>
              RECENT ACTIVITY
            </NCText>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: t.colors.containerHigh, marginVertical: 4 }} />
        )}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
            <Icon
              name={item.type === 'unlock' ? 'lock-open' : item.type === 'purchase' ? 'add-circle-outline' : 'sync'}
              size={22}
              color={t.colors.fg}
            />
            <View style={{ flex: 1 }}>
              <NCText variant="titleMd" style={{ textTransform: 'capitalize' }}>{item.type}</NCText>
              <NCText variant="uiLabelXs" tone="muted">{formatRelative(item.createdAt)}</NCText>
            </View>
            <NCText
              variant="titleMd"
              style={{ color: item.tokensDelta > 0 ? '#2c7a3a' : t.colors.error, fontVariant: ['tabular-nums'] }}
            >
              {item.tokensDelta > 0 ? '+' : ''}{item.tokensDelta}
            </NCText>
          </View>
        )}
        refreshControl={<RefreshControl tintColor={t.colors.fg} refreshing={paged.loading && paged.items.length > 0} onRefresh={paged.refresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={paged.loadMore}
        ListEmptyComponent={
          paged.loading ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator color={t.colors.fg} />
            </View>
          ) : (
            <EmptyState
              icon="receipt-long"
              title="No activity yet"
              description="Top up to start unlocking chapters."
            />
          )
        }
        ListFooterComponent={
          paged.items.length > 0 && paged.items.length < paged.total ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color={t.colors.fg} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
