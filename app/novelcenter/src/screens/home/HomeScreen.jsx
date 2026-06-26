import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import SectionHeader from '@/components/primitives/SectionHeader';
import LandingHero from '@/components/home/LandingHero';
import ContinueReadingCard from '@/components/home/ContinueReadingCard';
import RecentlyOpenedRow from '@/components/home/RecentlyOpenedRow';
import HorizontalBookList from '@/components/book/HorizontalBookList';
import EmptyState from '@/components/primitives/EmptyState';
import Skeleton from '@/components/primitives/Skeleton';
import Button from '@/components/primitives/Button';
import IconButton from '@/components/primitives/IconButton';
import Avatar from '@/components/primitives/Avatar';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { readingApi } from '@/lib/reading';
import { useAuthStore } from '@/stores/authStore';

export default function HomeScreen({ navigation }) {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);

  const [books, setBooks] = useState([]);
  const [reading, setReading] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/books', { query: { pageSize: 12, page: 1 } });
      setBooks(data?.items || []);
    } catch (_e) {
      setBooks([]);
    }
    if (user) {
      try {
        const data = await readingApi.recent(6);
        setReading(data?.items || []);
      } catch (_e) {
        setReading([]);
      }
    } else {
      setReading([]);
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

  const goBook = (book) => navigation.navigate('BookDetail', { slug: book.slug, id: book.id });

  const featured = books[0] || null;
  const curated = books.slice(1, 7);
  const forYou = books.slice(0, 8);
  const continueReading = reading[0] || null;
  const recents = reading.slice(1, 5);

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 64, gap: 28 }}
        refreshControl={<RefreshControl tintColor={t.colors.fg} refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <NCText variant="uiLabelSm" tone="muted">Novel Centre</NCText>
            <NCText variant="headlineXl">
              {user ? `Hi, ${user.displayName?.split(' ')[0] || 'reader'}.` : 'Reading lives, written down.'}
            </NCText>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <IconButton name="search" onPress={() => navigation.getParent()?.navigate('DiscoverTab')} />
            {user ? <Avatar name={user.displayName} source={user.avatarUrl} size={36} /> : null}
          </View>
        </View>

        {/* Hero */}
        {loading && !featured ? (
          <Skeleton width="100%" height={220} radius={t.radii.lg} />
        ) : featured ? (
          <LandingHero book={featured} onPress={() => goBook(featured)} />
        ) : null}

        {/* Continue reading */}
        <View style={{ gap: 12 }}>
          <SectionHeader
            title="Continue reading"
            subtitle="Pick up where you left off"
          />
          {!user ? (
            <View style={{ padding: 24, borderWidth: 1, borderColor: t.colors.containerHigh, borderRadius: t.radii.lg, gap: 12 }}>
              <NCText variant="titleMd">Sign in to track your reading</NCText>
              <NCText variant="bodySm" tone="muted">
                Your shelf, your highlights, and where you stopped — saved as you read.
              </NCText>
            </View>
          ) : loading ? (
            <Skeleton width="100%" height={180} radius={t.radii.lg} />
          ) : continueReading ? (
            <ContinueReadingCard
              entry={continueReading}
              onPress={() =>
                navigation.navigate('Reader', { chapterId: continueReading.chapter?.id })
              }
            />
          ) : (
            <EmptyState
              icon="auto_stories"
              title="Nothing in flight"
              description="Open a chapter to start tracking your progress."
            />
          )}
        </View>

        {/* Recently opened */}
        {user && recents.length > 0 ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title="Recently opened" subtitle="Last few you cracked open" />
            <View>
              {recents.map((entry, i) => (
                <View key={`${entry.chapter?.id}-${i}`}>
                  <RecentlyOpenedRow
                    entry={entry}
                    onPress={() => navigation.navigate('Reader', { chapterId: entry.chapter?.id })}
                  />
                  {i < recents.length - 1 ? (
                    <View style={{ height: 1, backgroundColor: t.colors.containerHigh, marginVertical: 4 }} />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Curated */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Curated this week" subtitle="Editorial picks" />
          <HorizontalBookList
            books={curated}
            loading={loading && curated.length === 0}
            onPressBook={goBook}
          />
        </View>

        {/* For you */}
        <View style={{ gap: 12 }}>
          <SectionHeader
            title="For you"
            subtitle="New arrivals and quiet favourites"
            action="See all"
            onAction={() => navigation.getParent()?.navigate('DiscoverTab')}
          />
          <HorizontalBookList
            books={forYou}
            loading={loading && forYou.length === 0}
            onPressBook={goBook}
            width={150}
          />
        </View>

        {!user ? (
          <View style={{ padding: 24, borderWidth: 1, borderColor: t.colors.containerHigh, borderRadius: t.radii.lg, gap: 12, alignItems: 'flex-start' }}>
            <NCText variant="headlineSm">Build your reading shelf</NCText>
            <NCText variant="bodySm" tone="muted">
              Sign in to save books to your library, track progress, and unlock paid chapters.
            </NCText>
            <Button label="Sign in" onPress={() => useAuthStore.setState({ user: null })} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
