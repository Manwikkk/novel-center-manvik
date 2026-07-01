import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import Skeleton from '@/components/primitives/Skeleton';
import SignInModal from '@/components/featured/SignInModal';
import {
  StudioScreen,
  StudioHeader,
  StudioSectionLabel,
  StudioStatCard,
  StudioMenuRow,
  StudioPrimaryButton,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function DashboardScreen({ navigation }) {
  const { colors: C } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const isAuthor = user?.role === 'author' || user?.role === 'admin';

  const load = useCallback(async () => {
    if (!isAuthor) return;
    try {
      const data = await api.get('/author/earnings');
      setEarnings(data);
    } catch (_e) {
      setEarnings(null);
    }
  }, [isAuthor]);

  useEffect(() => {
    if (!isAuthor) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    load().finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [isAuthor, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const t1 = earnings?.totals;

  if (!user) {
    return (
      <StudioScreen>
        <StudioHeader breadcrumb="Author Studio" title="Sign in required" onBack={() => navigation.goBack()} />
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
        <StudioHeader breadcrumb="Author Studio" title="Author access" onBack={() => navigation.goBack()} />
        <View style={{ paddingHorizontal: STUDIO_LAYOUT.hPadding }}>
          <DarkSurface style={{ padding: 20, gap: 10 }}>
            <NCText variant="titleMd" style={{ color: C.white }}>This area is for authors</NCText>
            <NCText variant="bodySm" style={{ color: C.muted, lineHeight: 22 }}>
              Register as an author on the website or contact support to publish on Novel Centre.
            </NCText>
          </DarkSurface>
        </View>
      </StudioScreen>
    );
  }

  return (
    <StudioScreen>
      <StudioHeader breadcrumb="Author Studio" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: STUDIO_LAYOUT.hPadding,
          paddingBottom: 64,
          gap: 24,
        }}
        refreshControl={<RefreshControl tintColor={C.white} refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 4 }}>
          <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 13 }}>Overview</NCText>
          <NCText variant="headlineXl" style={{ color: C.white, fontWeight: '700', fontSize: 28 }}>
            Hi, {user?.displayName?.split(' ')[0] || 'author'}.
          </NCText>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {loading ? (
              <>
                <Skeleton width="48%" height={88} radius={12} />
                <Skeleton width="48%" height={88} radius={12} />
              </>
            ) : (
              <>
                <StudioStatCard
                  label="This month"
                  value={t1?.monthTokens != null ? Number(t1.monthTokens).toLocaleString() : '—'}
                  sub="tokens"
                />
                <StudioStatCard
                  label="Lifetime"
                  value={t1?.lifetimeTokens != null ? Number(t1.lifetimeTokens).toLocaleString() : '—'}
                  sub="tokens"
                />
              </>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {loading ? (
              <>
                <Skeleton width="48%" height={88} radius={12} />
                <Skeleton width="48%" height={88} radius={12} />
              </>
            ) : (
              <>
                <StudioStatCard label="Books" value={t1?.books != null ? `${t1.books}` : '—'} />
                <StudioStatCard label="Readers" value={t1?.uniqueReaders != null ? `${t1.uniqueReaders}` : '—'} />
              </>
            )}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <StudioSectionLabel>WORKSPACE</StudioSectionLabel>
          <DarkSurface>
            <StudioMenuRow
              first
              icon="library-books"
              label="My books"
              sub="Create, edit, and publish novels"
              onPress={() => navigation.navigate('AuthorBooks')}
            />
            <StudioMenuRow
              icon="trending-up"
              label="Earnings"
              sub="Unlocks and token income"
              onPress={() => navigation.navigate('AuthorEarnings')}
            />
            <StudioMenuRow
              icon="settings"
              label="Settings"
              sub="Public profile and bio"
              onPress={() => navigation.navigate('AuthorSettings')}
            />
          </DarkSurface>
        </View>

        <StudioPrimaryButton
          label="New book"
          icon="add"
          onPress={() => navigation.navigate('AuthorBookEdit', { mode: 'create' })}
        />
      </ScrollView>
    </StudioScreen>
  );
}
