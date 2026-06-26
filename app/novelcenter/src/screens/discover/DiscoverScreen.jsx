import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import Input from '@/components/primitives/Input';
import IconButton from '@/components/primitives/IconButton';
import { BookListItem } from '@/components/book/BookCard';
import EmptyState from '@/components/primitives/EmptyState';
import ErrorView from '@/components/primitives/ErrorView';
import Skeleton from '@/components/primitives/Skeleton';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { usePagedQuery } from '@/hooks/usePagedQuery';

const CATEGORIES = ['All', 'Fiction', 'Non-fiction', 'Mystery', 'Romance', 'Sci-Fi', 'Fantasy', 'Memoir', 'Essay'];

export default function DiscoverScreen({ navigation }) {
  const t = useTheme();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All');

  // 350ms debounce so we don't pound the API while typing.
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const loader = useCallback(({ page, pageSize, q, category: cat }) => {
    const query = { page, pageSize };
    if (q) query.q = q;
    if (cat && cat !== 'All') query.category = cat;
    return api.get('/books', { query });
  }, []);

  const extra = useMemo(() => ({ q: debouncedSearch, category }), [debouncedSearch, category]);
  const paged = usePagedQuery(loader, { pageSize: 12, extra });

  const goBook = (book) => navigation.navigate('BookDetail', { slug: book.slug, id: book.id });

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <NCText variant="headlineXl">Discover</NCText>
          <IconButton name="tune" onPress={() => {}} />
        </View>
        <Input
          label={null}
          value={search}
          onChangeText={setSearch}
          placeholder="Search titles, authors, themes..."
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? t.colors.fg : t.colors.containerHigh,
                  backgroundColor: active ? t.colors.fg : 'transparent',
                }}
              >
                <NCText variant="uiLabelXs" style={{ color: active ? t.colors.cream100 : t.colors.fg }}>
                  {cat}
                </NCText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {paged.error ? (
        <ErrorView error={paged.error} onRetry={paged.refresh} />
      ) : paged.loading && paged.items.length === 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
              <Skeleton width={70} height={104} radius={4} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton height={18} />
                <Skeleton height={12} width="60%" />
                <Skeleton height={10} width="80%" />
              </View>
            </View>
          ))}
        </View>
      ) : paged.items.length === 0 ? (
        <EmptyState
          icon="search-off"
          title="Nothing here yet"
          description={`No books match "${debouncedSearch || category}". Try another query.`}
        />
      ) : (
        <FlatList
          data={paged.items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 64 }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: t.colors.containerHigh, marginVertical: 4 }} />
          )}
          renderItem={({ item }) => <BookListItem book={item} onPress={() => goBook(item)} />}
          onEndReachedThreshold={0.4}
          onEndReached={paged.loadMore}
          refreshControl={
            <RefreshControl
              tintColor={t.colors.fg}
              refreshing={paged.loading && paged.items.length > 0}
              onRefresh={paged.refresh}
            />
          }
          ListFooterComponent={
            paged.items.length < paged.total ? (
              <View style={{ paddingVertical: 24 }}>
                <ActivityIndicator color={t.colors.fg} />
              </View>
            ) : (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <NCText variant="uiLabelXs" tone="muted">
                  {paged.items.length} of {paged.total}
                </NCText>
              </View>
            )
          }
        />
      )}
    </Screen>
  );
}
