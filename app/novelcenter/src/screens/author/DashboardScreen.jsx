import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import NCText from '@/components/primitives/Text';
import AuthorGuard from '@/components/studio/AuthorGuard';
import BookDashboardPanel from '@/components/studio/BookDashboardPanel';
import StudioNavBar from '@/components/studio/StudioNavBar';
import {
  StudioScreen,
  StudioHeader,
  StudioSectionLabel,
  StudioStatCard,
  StudioMenuRow,
  StudioPrimaryButton,
  StudioPillTabs,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import { authorApi } from '@/lib/author';
import { exitAuthorStudioToProfile } from '@/lib/authorNavigation';
import { useAuthStore } from '@/stores/authStore';

const HEADER_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'stories', label: 'Stories' },
];

export default function DashboardScreen({ navigation }) {
  return (
    <AuthorGuard navigation={navigation} title="Author Studio">
      <DashboardContent navigation={navigation} />
    </AuthorGuard>
  );
}

function DashboardContent({ navigation }) {
  const { colors: C } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const [earnings, setEarnings] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [headerTab, setHeaderTab] = useState('overview');

  const load = useCallback(async () => {
    try {
      const [earn, bookData] = await Promise.all([
        authorApi.earnings(),
        authorApi.listBooks(user.id, { pageSize: 50 }),
      ]);
      setEarnings(earn);
      setBooks(bookData?.items || []);
    } catch (_e) {
      setEarnings(null);
      setBooks([]);
    }
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setBooksLoading(true);
    load().finally(() => active && (setLoading(false), setBooksLoading(false)));
    return () => { active = false; };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const t1 = earnings?.totals;

  return (
    <StudioScreen edges={['top']}>
      <StudioHeader breadcrumb="Author Studio" onBack={() => exitAuthorStudioToProfile(navigation)} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: STUDIO_LAYOUT.hPadding,
          paddingBottom: 16,
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

        <StudioPillTabs tabs={HEADER_TABS} activeKey={headerTab} onChange={setHeaderTab} />

        {headerTab === 'overview' ? (
          <>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <StudioStatCard
                  label="This month"
                  value={!loading && t1?.monthTokens != null ? Number(t1.monthTokens).toLocaleString() : '—'}
                  sub="tokens"
                />
                <StudioStatCard
                  label="Lifetime"
                  value={!loading && t1?.lifetimeTokens != null ? Number(t1.lifetimeTokens).toLocaleString() : '—'}
                  sub="tokens"
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <StudioStatCard label="Books" value={!loading && t1?.books != null ? `${t1.books}` : '—'} />
                <StudioStatCard label="Readers" value={!loading && t1?.uniqueReaders != null ? `${t1.uniqueReaders}` : '—'} />
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <StudioSectionLabel>WORKSPACE</StudioSectionLabel>
              <DarkSurface>
                <StudioMenuRow
                  first
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
          </>
        ) : (
          <View style={{ gap: 12 }}>
            <StudioSectionLabel>YOUR STORIES</StudioSectionLabel>
            <BookDashboardPanel books={books} loading={booksLoading} navigation={navigation} />
          </View>
        )}
      </ScrollView>

      <StudioNavBar navigation={navigation} activeRoute="AuthorDashboard" />
    </StudioScreen>
  );
}
