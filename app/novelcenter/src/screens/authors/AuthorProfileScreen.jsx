import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import Avatar from '@/components/primitives/Avatar';
import IconButton from '@/components/primitives/IconButton';
import HorizontalBookList from '@/components/book/HorizontalBookList';
import { BookListItem } from '@/components/book/BookCard';
import EmptyState from '@/components/primitives/EmptyState';
import ErrorView from '@/components/primitives/ErrorView';
import Skeleton from '@/components/primitives/Skeleton';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';

export default function AuthorProfileScreen({ route, navigation }) {
  const t = useTheme();
  const { id } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await api.get(`/authors/${id}`, { query: { booksPageSize: 24 } });
      setData(d);
    } catch (err) {
      setError(err);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const goBook = (book) => navigation.navigate('BookDetail', { slug: book.slug, id: book.id });

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 4 }}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <NCText variant="uiLabelSm" tone="muted">Back</NCText>
      </View>

      {error ? (
        <ErrorView error={error} onRetry={load} />
      ) : loading || !data ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
          <Skeleton width={88} height={88} radius={44} />
          <Skeleton height={28} width="70%" />
          <Skeleton height={14} width="40%" />
          <Skeleton height={120} radius={12} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64, gap: 24 }}
          refreshControl={<RefreshControl tintColor={t.colors.fg} refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Avatar name={data.author.displayName} source={data.author.avatarUrl} size={96} />
            <NCText variant="headlineXl" align="center">{data.author.displayName}</NCText>
            <NCText variant="uiLabelSm" tone="muted">
              {data.author.bookCount} {data.author.bookCount === 1 ? 'book' : 'books'} published
            </NCText>
            {data.author.bio ? (
              <NCText variant="readingBody" align="center">{data.author.bio}</NCText>
            ) : null}
          </View>

          {data.books.items.length === 0 ? (
            <EmptyState icon="auto_stories" title="No published books yet" />
          ) : (
            <View style={{ gap: 12 }}>
              <NCText variant="uiLabelSm" tone="muted">FEATURED</NCText>
              <HorizontalBookList books={data.books.items.slice(0, 6)} onPressBook={goBook} />
              <View style={{ height: 1, backgroundColor: t.colors.containerHigh, marginTop: 8 }} />
              <NCText variant="uiLabelSm" tone="muted">ALL BOOKS</NCText>
              {data.books.items.map((b, i) => (
                <View key={b.id}>
                  <BookListItem book={b} onPress={() => goBook(b)} />
                  {i < data.books.items.length - 1 ? (
                    <View style={{ height: 1, backgroundColor: t.colors.containerHigh, marginVertical: 4 }} />
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
