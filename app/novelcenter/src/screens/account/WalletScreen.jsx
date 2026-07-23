import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import EmptyState from '@/components/primitives/EmptyState';
import {
  StudioScreen,
  StudioHeader,
  StudioSectionLabel,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import { api } from '@/lib/api';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';
import { usePagedQuery } from '@/hooks/usePagedQuery';
import { formatRelative } from '@/lib/format';


export default function WalletScreen({ navigation }) {
  const { colors: C } = useAppTheme();
  const balance = useWalletStore((s) => s.balance);
  const refresh = useWalletStore((s) => s.refresh);
  const setBalance = useWalletStore((s) => s.setBalance);
  const pushToast = useUiStore((s) => s.pushToast);
  const [packs, setPacks] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
    api.get('/wallet')
      .then((data) => {
        if (data?.packs) setPacks(data.packs);
      })
      .catch(() => {});
  }, [refresh]);

  const loader = useCallback(({ page, pageSize }) => api.get('/wallet/transactions', { query: { page, pageSize } }), []);
  const paged = usePagedQuery(loader, { pageSize: 20 });

  const purchase = async (packKey) => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await api.post('/wallet/purchase', { pack: packKey });
      if (data?.balance != null) setBalance(data.balance);
      pushToast({ type: 'success', title: 'Top-up complete', message: `+${data.creditedTokens} tokens` });
      paged.refresh();
      refresh();
    } catch (err) {
      pushToast({ type: 'error', title: 'Top-up failed', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const packEntries = Object.entries(packs).sort(([, a], [, b]) => (a?.price || 0) - (b?.price || 0));

  return (
    <StudioScreen>
      <StudioHeader breadcrumb="Profile" title="Wallet" onBack={() => navigation.goBack()} />

      <FlatList
        data={paged.items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, paddingBottom: 64 }}
        ListHeaderComponent={
          <View style={{ gap: 20, paddingBottom: 8 }}>
            <View style={{ gap: 4 }}>
              <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 13 }}>Your wallet</NCText>
              <NCText variant="headlineXl" style={{ color: C.white, fontWeight: '700', fontSize: 26, lineHeight: 32 }}>
                Tokens for unlocking chapters.
              </NCText>
            </View>

            <DarkSurface style={{ padding: 18, gap: 6 }}>
              <NCText variant="uiLabelSm" style={{ color: C.muted, letterSpacing: 1, fontSize: 10 }}>
                CURRENT BALANCE
              </NCText>
              <NCText variant="headlineXl" style={{ color: C.white, fontWeight: '700', fontSize: 40 }}>
                {balance.toLocaleString()}
              </NCText>
              <NCText variant="bodySm" style={{ color: C.muted }}>tokens</NCText>
            </DarkSurface>

            <View style={{ gap: 12 }}>
              <StudioSectionLabel>TOP UP</StudioSectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {packEntries.map(([key, pack]) => {
                  const totalCoins = (pack?.tokens || 0) + (pack?.bonus || 0);
                  const price = pack?.price != null ? `₹${Number(pack.price).toLocaleString('en-IN')}` : '';
                  return (
                    <Pressable
                      key={key}
                      onPress={() => purchase(key)}
                      disabled={busy}
                      style={({ pressed }) => ({
                        width: '47%',
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: C.inputBorder,
                        backgroundColor: C.sheet,
                        alignItems: 'center',
                        gap: 4,
                        opacity: busy ? 0.6 : pressed ? 0.88 : 1,
                      })}
                    >
                      <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 9, letterSpacing: 0.5, textAlign: 'center' }}>
                        {(pack?.name || key).toUpperCase()}
                      </NCText>
                      <NCText variant="titleLg" style={{ color: C.white, fontSize: 22 }}>
                        {totalCoins}
                      </NCText>
                      <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 10 }}>coins</NCText>
                      {pack?.bonus ? (
                        <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 9, textAlign: 'center' }}>
                          {`${pack.tokens} + ${pack.bonus} bonus`}
                        </NCText>
                      ) : null}
                      {price ? (
                        <NCText variant="uiLabelSm" style={{ color: C.white, fontSize: 12, marginTop: 4 }}>
                          {price}
                        </NCText>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <StudioSectionLabel>RECENT ACTIVITY</StudioSectionLabel>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.inputBorder, marginVertical: 4 }} />}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
            <Icon
              name={item.type === 'unlock' ? 'lock-open' : item.type === 'purchase' ? 'add-circle-outline' : 'sync'}
              size={22}
              color={C.white}
            />
            <View style={{ flex: 1 }}>
              <NCText variant="titleMd" style={{ color: C.white, textTransform: 'capitalize', fontSize: 15 }}>
                {item.type}
              </NCText>
              <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 11 }}>
                {formatRelative(item.createdAt)}
              </NCText>
            </View>
            <NCText
              variant="titleMd"
              style={{ color: item.tokensDelta > 0 ? '#6ee7a0' : C.error, fontSize: 15 }}
            >
              {item.tokensDelta > 0 ? '+' : ''}{item.tokensDelta}
            </NCText>
          </View>
        )}
        refreshControl={
          <RefreshControl tintColor={C.white} refreshing={paged.loading && paged.items.length > 0} onRefresh={paged.refresh} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={paged.loadMore}
        ListEmptyComponent={
          paged.loading ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator color={C.white} />
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
              <ActivityIndicator color={C.white} />
            </View>
          ) : null
        }
      />
    </StudioScreen>
  );
}
