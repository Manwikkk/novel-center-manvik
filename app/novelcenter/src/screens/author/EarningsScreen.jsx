import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import IconButton from '@/components/primitives/IconButton';
import Card from '@/components/primitives/Card';
import Skeleton from '@/components/primitives/Skeleton';
import EmptyState from '@/components/primitives/EmptyState';
import ErrorView from '@/components/primitives/ErrorView';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';

export default function EarningsScreen({ navigation }) {
  const t = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await api.get('/author/earnings');
      setData(d);
    } catch (err) { setError(err); }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <NCText variant="uiLabelSm" tone="muted">Studio</NCText>
      </View>

      {error ? (
        <ErrorView error={error} onRetry={load} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64, gap: 18 }}
          refreshControl={<RefreshControl tintColor={t.colors.fg} refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <NCText variant="headlineXl">Earnings</NCText>

          {loading || !data ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={92} radius={t.radii.lg} />
              <Skeleton height={92} radius={t.radii.lg} />
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Stat label="This month" value={data.totals.monthTokens} sub="tokens" />
                <Stat label="Lifetime" value={data.totals.lifetimeTokens} sub="tokens" />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Stat label="Unlocks" value={data.totals.unlocksTotal} />
                <Stat label="Readers" value={data.totals.uniqueReaders} />
              </View>

              <NCText variant="uiLabelSm" tone="muted" style={{ marginTop: 8 }}>BY BOOK</NCText>
              {data.byBook.length === 0 ? (
                <EmptyState icon="bar-chart" title="No unlocks yet" description="Earnings will appear as readers unlock paid chapters." />
              ) : (
                <View style={{ gap: 0 }}>
                  {data.byBook.map((b, i) => (
                    <View
                      key={b.id}
                      style={{
                        paddingVertical: 14,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: t.colors.containerHigh,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <NCText variant="titleMd" numberOfLines={1} style={{ flex: 1, paddingRight: 12 }}>
                          {b.title}
                        </NCText>
                        <NCText variant="titleMd">{b.tokens} t</NCText>
                      </View>
                      <NCText variant="uiLabelXs" tone="muted">
                        {b.chapterCount} chapters · {b.unlocks} unlocks · {b.status}
                      </NCText>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function Stat({ label, value, sub }) {
  return (
    <Card style={{ flex: 1 }}>
      <NCText variant="uiLabelSm" tone="muted">{label}</NCText>
      <NCText variant="headlineMd" style={{ marginTop: 4 }}>{Number(value || 0).toLocaleString()}</NCText>
      {sub ? <NCText variant="uiLabelXs" tone="muted">{sub}</NCText> : null}
    </Card>
  );
}
