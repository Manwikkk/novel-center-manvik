import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NCText from '@/components/primitives/Text';
import Skeleton from '@/components/primitives/Skeleton';
import ErrorView from '@/components/primitives/ErrorView';
import WeeklyBookHero, { MeetNovelCentre } from '@/components/home/mobile/WeeklyBookHero';
import DarkRankingSection, {
  BecomeAuthorCTA,
  DarkContinueReading,
} from '@/components/home/mobile/HomeSections';
import { SectionHeader, DarkBookCarousel } from '@/components/discover/DiscoverTheme';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { readingApi } from '@/lib/reading';
import { useAppTheme, DISCOVER_LAYOUT } from '@/theme/discoverColors';
const EMPTY_HOME = {
  weekly_featured: [],
  new_arrivals: [],
  potential_starlet: [],
  rising_fictions: [],
  cheering_reads: [],
  editors_choice: [],
  completed_novel: [],
  originals: [],
  pageSections: {},
};

function pickTopRated(...lists) {
  const merged = lists.flat().filter(Boolean);
  const seen = new Set();
  const scored = [];
  for (const b of merged) {
    const key = b.id ?? b.slug ?? b.title;
    if (seen.has(key)) continue;
    seen.add(key);
    const s = typeof b.score === 'number' ? b.score : Number.parseFloat(b.score);
    if (Number.isFinite(s) && s > 0) scored.push({ b, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, 5).map((x) => x.b);
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors: C, statusBarStyle } = useAppTheme();
  const user = useAuthStore((s) => s.user);

  const [home, setHome] = useState(EMPTY_HOME);
  const [continueReading, setContinueReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get('/home');
      setHome({ ...EMPTY_HOME, ...data });
      if (user) {
        try {
          const recent = await readingApi.recent(1);
          setContinueReading(recent?.items?.[0] || null);
        } catch (_e) {
          setContinueReading(null);
        }
      } else {
        setContinueReading(null);
      }
    } catch (err) {
      setError(err);
    }
  }, [user]);

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

  const goBook = (book) => {
    if (!book) return;
    navigation.navigate('BookDetail', { slug: book.slug, id: book.id });
  };

  const goDiscover = () => navigation.getParent()?.navigate('DiscoverTab');
  const goAuthor = () => navigation.getParent()?.navigate('AccountTab', { screen: 'AuthorStudio' });

  const ps = home.pageSections || {};
  const show = (key) => ps[key] !== false;
  const highlyRated = pickTopRated(home.new_arrivals, home.completed_novel);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={C.bg} />

      <View style={{ paddingHorizontal: DISCOVER_LAYOUT.hPadding, paddingTop: 8, paddingBottom: 12 }}>
        <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 13 }}>
          Novel Centre
        </NCText>
        <NCText variant="headlineXl" style={{ color: C.white, fontWeight: '700', fontSize: 28, marginTop: 2 }}>
          {user ? `Hi, ${user.displayName?.split(' ')[0] || 'reader'}.` : 'Home'}
        </NCText>
      </View>

      {error ? (
        <ErrorView error={error} onRetry={onRefresh} />
      ) : loading ? (
        <View style={{ paddingHorizontal: DISCOVER_LAYOUT.hPadding, gap: 16 }}>
          <Skeleton width="100%" height={280} radius={16} />
          <Skeleton width="100%" height={120} radius={16} />
          <Skeleton width="100%" height={160} radius={16} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: DISCOVER_LAYOUT.hPadding,
            paddingBottom: Math.max(insets.bottom, 24) + 72,
            gap: 28,
          }}
          refreshControl={
            <RefreshControl tintColor={C.white} refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {show('weekly_book') ? (
            <WeeklyBookHero items={home.weekly_featured} onPressBook={goBook} onPressDiscover={goDiscover} />
          ) : null}

          {show('meet_webnovel') ? <MeetNovelCentre onPressDiscover={goDiscover} /> : null}

          {show('continue_reading') && continueReading ? (
            <DarkContinueReading
              entry={continueReading}
              onPress={() => navigation.navigate('Reader', { chapterId: continueReading.chapter?.id })}
            />
          ) : null}

          {show('recommended') && home.new_arrivals?.length ? (
            <View>
              <SectionHeader title="Recommended" action="View all" onAction={goDiscover} />
              <DarkBookCarousel books={home.new_arrivals} onPressBook={goBook} />
            </View>
          ) : null}

          {show('new_arrivals') && home.weekly_featured?.length ? (
            <View>
              <SectionHeader title="New Arrivals" action="View all" onAction={goDiscover} />
              <DarkBookCarousel books={home.weekly_featured} onPressBook={goBook} />
            </View>
          ) : null}

          {show('ranking_novels') ? (
            <DarkRankingSection
              mostRead={home.potential_starlet}
              trending={home.rising_fictions}
              highlyRated={highlyRated}
              onPressBook={goBook}
            />
          ) : null}

          {show('updated_today') && home.cheering_reads?.length ? (
            <View>
              <SectionHeader title="Updated Today" action="View all" onAction={goDiscover} />
              <DarkBookCarousel books={home.cheering_reads} onPressBook={goBook} />
            </View>
          ) : null}

          {show('completed_novels') && home.completed_novel?.length ? (
            <View>
              <SectionHeader title="Completed Novels" />
              <DarkBookCarousel books={home.completed_novel} onPressBook={goBook} />
            </View>
          ) : null}

          {show('editors_choice') && home.editors_choice?.length ? (
            <View>
              <SectionHeader title="Editor's Choice" />
              <DarkBookCarousel books={home.editors_choice} onPressBook={goBook} />
            </View>
          ) : null}

          {show('gs_originals') && home.originals?.length ? (
            <View>
              <SectionHeader title="Novel Centre Originals" />
              <DarkBookCarousel books={home.originals} onPressBook={goBook} />
            </View>
          ) : null}

          <BecomeAuthorCTA onPressStart={goAuthor} />
        </ScrollView>
      )}
    </View>
  );
}
