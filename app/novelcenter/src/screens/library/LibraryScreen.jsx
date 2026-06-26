import React, { useCallback } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Pressable, Alert } from 'react-native';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import { BookListItem } from '@/components/book/BookCard';
import EmptyState from '@/components/primitives/EmptyState';
import ErrorView from '@/components/primitives/ErrorView';
import Skeleton from '@/components/primitives/Skeleton';
import IconButton from '@/components/primitives/IconButton';
import { useTheme } from '@/theme';
import { libraryApi } from '@/lib/library';
import { usePagedQuery } from '@/hooks/usePagedQuery';
import { useUiStore } from '@/stores/uiStore';
import { useFocusEffect } from '@react-navigation/native';

export default function LibraryScreen({ navigation }) {
  const t = useTheme();
  const pushToast = useUiStore((s) => s.pushToast);
  const loader = useCallback((q) => libraryApi.list(q), []);
  const paged = usePagedQuery(loader, { pageSize: 20 });

  // Refresh whenever the tab gets focus, so library reflects detail-screen edits.
  useFocusEffect(useCallback(() => { paged.refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []));

  const onRemove = (entry) => {
    Alert.alert(
      'Remove from library?',
      entry.book.title,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await libraryApi.remove(entry.bookId);
              pushToast({ type: 'success', title: 'Removed', message: entry.book.title });
              paged.refresh();
            } catch (err) {
              pushToast({ type: 'error', title: 'Could not remove', message: err.message });
            }
          },
        },
      ],
    );
  };

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <NCText variant="headlineXl">Library</NCText>
        <NCText variant="uiLabelSm" tone="muted">
          {paged.total} {paged.total === 1 ? 'book' : 'books'} on your shelf
        </NCText>
      </View>

      {paged.error ? (
        <ErrorView error={paged.error} onRetry={paged.refresh} />
      ) : paged.loading && paged.items.length === 0 ? (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
              <Skeleton width={70} height={104} radius={4} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton height={16} />
                <Skeleton height={12} width="60%" />
              </View>
            </View>
          ))}
        </View>
      ) : paged.items.length === 0 ? (
        <EmptyState
          icon="bookmark-border"
          title="Your library is empty"
          description="Tap a book and choose Add to library to see it here."
          action="Browse books"
          onAction={() => navigation.getParent()?.navigate('DiscoverTab')}
        />
      ) : (
        <FlatList
          data={paged.items}
          keyExtractor={(item) => String(item.bookId)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64 }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: t.colors.containerHigh, marginVertical: 4 }} />
          )}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <BookListItem
                  book={item.book}
                  onPress={() => navigation.navigate('BookDetail', { slug: item.book.slug, id: item.bookId })}
                />
              </View>
              <IconButton name="bookmark-remove" onPress={() => onRemove(item)} />
            </View>
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
