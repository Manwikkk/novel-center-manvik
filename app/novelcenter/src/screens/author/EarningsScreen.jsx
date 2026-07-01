import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, RefreshControl, Pressable } from 'react-native';
import NCText from '@/components/primitives/Text';
import Skeleton from '@/components/primitives/Skeleton';
import EmptyState from '@/components/primitives/EmptyState';
import ErrorView from '@/components/primitives/ErrorView';
import {
  StudioScreen,
  StudioHeader,
  StudioSectionLabel,
  StudioStatCard,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import { api } from '@/lib/api';


export default function EarningsScreen({ navigation }) {
  const { colors: C } = useAppTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await api.get('/author/earnings');
      setData(d);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <StudioScreen>
      <StudioHeader breadcrumb="Author Studio" title="Earnings" onBack={() => navigation.goBack()} />

      {error ? (
        <ErrorView error={error} onRetry={load} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, paddingBottom: 64, gap: 18 }}
          refreshControl={<RefreshControl tintColor={C.white} refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {loading || !data ? (
            <View style={{ gap: 12 }}>
              <Skeleton width="100%" height={92} radius={12} />
              <Skeleton width="100%" height={92} radius={12} />
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <StudioStatCard label="This month" value={Number(data.totals.monthTokens || 0).toLocaleString()} sub="tokens" />
                <StudioStatCard label="Lifetime" value={Number(data.totals.lifetimeTokens || 0).toLocaleString()} sub="tokens" />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <StudioStatCard label="Unlocks" value={Number(data.totals.unlocksTotal || 0).toLocaleString()} />
                <StudioStatCard label="Readers" value={Number(data.totals.uniqueReaders || 0).toLocaleString()} />
              </View>

              <StudioSectionLabel>BY BOOK</StudioSectionLabel>
              {data.byBook.length === 0 ? (
                <EmptyState
                  icon="bar-chart"
                  title="No earnings yet"
                  description="Earnings appear as readers unlock paid chapters."
                />
              ) : (
                <DarkSurface>
                  {data.byBook.map((b, i) => (
                    <Pressable
                      key={b.id}
                      onPress={() => navigation.navigate('AuthorBookEdit', { mode: 'edit', bookId: b.id })}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: C.inputBorder,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                        <NCText variant="titleMd" numberOfLines={2} style={{ color: C.white, flex: 1, fontSize: 15 }}>
                          {b.title}
                        </NCText>
                        <NCText variant="titleMd" style={{ color: C.white, fontSize: 15 }}>
                          {Number(b.tokens || 0).toLocaleString()} t
                        </NCText>
                      </View>
                      <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                        {b.chapterCount} chapters · {b.unlocks} unlocks · {b.status}
                      </NCText>
                    </Pressable>
                  ))}
                </DarkSurface>
              )}
            </>
          )}
        </ScrollView>
      )}
    </StudioScreen>
  );
}
