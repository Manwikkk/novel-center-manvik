import React, { useCallback } from 'react';
import { View, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import IconButton from '@/components/primitives/IconButton';
import Cover from '@/components/primitives/Cover';
import Pill from '@/components/primitives/Pill';
import Button from '@/components/primitives/Button';
import EmptyState from '@/components/primitives/EmptyState';
import Skeleton from '@/components/primitives/Skeleton';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { usePagedQuery } from '@/hooks/usePagedQuery';
import { useFocusEffect } from '@react-navigation/native';

export default function BooksScreen({ navigation }) {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);

  const loader = useCallback(
    ({ page, pageSize }) => api.get('/books', {
      query: { page, pageSize, author: user?.id },
    }),
    [user?.id],
  );
  const paged = usePagedQuery(loader, { pageSize: 12, deps: [user?.id] });

  useFocusEffect(useCallback(() => { paged.refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []));

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
          <NCText variant="uiLabelSm" tone="muted">Studio</NCText>
        </View>
        <IconButton
          name="add"
          onPress={() => navigation.navigate('AuthorBookEdit', { mode: 'create' })}
        />
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <NCText variant="headlineXl">My books</NCText>
        <NCText variant="uiLabelSm" tone="muted">{paged.total} total</NCText>
      </View>

      <FlatList
        data={paged.items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64 }}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: t.colors.containerHigh, marginVertical: 4 }} />
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('AuthorBookEdit', { mode: 'edit', bookId: item.id })}
            style={({ pressed }) => ({
              flexDirection: 'row',
              gap: 14,
              paddingVertical: 12,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Cover source={item.coverUrl} width={70} />
            <View style={{ flex: 1, gap: 4 }}>
              <NCText variant="titleLg" numberOfLines={2}>{item.title}</NCText>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pill label={item.status?.toUpperCase() || 'DRAFT'} />
                <Pill label={`${item.chapterCount || 0} ch`} />
              </View>
              <Pressable onPress={() => navigation.navigate('AuthorChapters', { bookId: item.id, bookTitle: item.title })}>
                <NCText variant="uiLabelXs" tone="muted" style={{ marginTop: 4 }}>
                  Manage chapters →
                </NCText>
              </Pressable>
            </View>
            <Icon name="chevron-right" size={24} color={t.colors.muted} />
          </Pressable>
        )}
        refreshControl={
          <RefreshControl tintColor={t.colors.fg} refreshing={paged.loading && paged.items.length > 0} onRefresh={paged.refresh} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={paged.loadMore}
        ListEmptyComponent={
          paged.loading ? (
            <View style={{ paddingHorizontal: 0, gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
                  <Skeleton width={70} height={104} radius={4} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton height={16} />
                    <Skeleton height={12} width="50%" />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="library-books"
              title="No books yet"
              description="Create a book to start drafting chapters."
              action="Create book"
              onAction={() => navigation.navigate('AuthorBookEdit', { mode: 'create' })}
            />
          )
        }
        ListFooterComponent={
          paged.items.length > 0 && paged.items.length < paged.total ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color={t.colors.fg} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
