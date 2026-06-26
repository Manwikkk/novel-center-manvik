import React, { useCallback, useState } from 'react';
import { View, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import Avatar from '@/components/primitives/Avatar';
import Input from '@/components/primitives/Input';
import EmptyState from '@/components/primitives/EmptyState';
import Skeleton from '@/components/primitives/Skeleton';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { usePagedQuery } from '@/hooks/usePagedQuery';

export default function AuthorsListScreen({ navigation }) {
  const t = useTheme();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  React.useEffect(() => {
    const h = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(h);
  }, [search]);

  const loader = useCallback(
    ({ page, pageSize, q }) => api.get('/authors', { query: { page, pageSize, ...(q ? { q } : {}) } }),
    [],
  );
  const paged = usePagedQuery(loader, { pageSize: 12, extra: { q: debounced } });

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 16 }}>
        <NCText variant="headlineXl">Authors</NCText>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Find an author..."
        />
      </View>

      {paged.loading && paged.items.length === 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
              <Skeleton width={56} height={56} radius={28} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton height={16} width="70%" />
                <Skeleton height={12} width="50%" />
              </View>
            </View>
          ))}
        </View>
      ) : paged.items.length === 0 ? (
        <EmptyState
          icon="edit-note"
          title="No authors yet"
          description="As authors publish, they'll appear here."
        />
      ) : (
        <FlatList
          data={paged.items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 64 }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: t.colors.containerHigh, marginVertical: 4 }} />
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('AuthorProfile', { id: item.id })}
              style={({ pressed }) => ({
                paddingVertical: 14,
                flexDirection: 'row',
                gap: 14,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Avatar name={item.displayName} source={item.avatarUrl} size={56} />
              <View style={{ flex: 1, gap: 4 }}>
                <NCText variant="titleLg">{item.displayName}</NCText>
                <NCText variant="uiLabelXs" tone="muted">
                  {item.bookCount || 0} {item.bookCount === 1 ? 'book' : 'books'}
                </NCText>
                {item.bio ? (
                  <NCText variant="bodySm" tone="muted" numberOfLines={2}>{item.bio}</NCText>
                ) : null}
              </View>
              <NCText variant="titleLg" tone="muted">›</NCText>
            </Pressable>
          )}
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
            ) : null
          }
        />
      )}
    </Screen>
  );
}
