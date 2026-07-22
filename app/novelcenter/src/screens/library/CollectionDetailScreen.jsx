import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import EmptyState from '@/components/primitives/EmptyState';
import ErrorView from '@/components/primitives/ErrorView';
import {
  LibraryBookTile,
  LibraryGridSkeleton,
  getLibraryGridMetrics,
} from '@/components/library/LibraryBookGrid';
import { collectionsApi } from '@/lib/collections';
import { libraryApi } from '@/lib/library';
import { readingApi } from '@/lib/reading';
import { useUiStore } from '@/stores/uiStore';
import { useAppTheme, DISCOVER_LAYOUT } from '@/theme/discoverColors';
const PAGE_SIZE = 24;

export default function CollectionDetailScreen({ route, navigation }) {
  const { id, name } = route.params || {};
  const collectionId = Number(id);
  const insets = useSafeAreaInsets();
  const { colors: C, statusBarStyle } = useAppTheme();
  const pushToast = useUiStore((s) => s.pushToast);
  const { tileWidth, coverHeight } = getLibraryGridMetrics();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [progressMap, setProgressMap] = useState({});

  const loadProgress = useCallback(async () => {
    try {
      const res = await readingApi.listRecent({ pageSize: 24 });
      const map = {};
      for (const entry of res?.items || []) {
        const bookId = entry.book?.id;
        if (!bookId) continue;
        map[bookId] = {
          chapterIdx: entry.chapter?.idx ?? 0,
          chapterId: entry.chapter?.id,
        };
      }
      setProgressMap(map);
    } catch (_e) {
      setProgressMap({});
    }
  }, []);

  const load = useCallback(
    async (p = 1, append = false) => {
      if (!Number.isFinite(collectionId) || collectionId <= 0) return;
      if (append) setLoadingMore(true);
      else if (!refreshing) setLoading(true);
      setError(null);
      try {
        const res = await collectionsApi.listBooks(collectionId, { page: p, pageSize: PAGE_SIZE });
        const newItems = (res?.items || []).filter((book) => book?.id);
        setItems((prev) => (append ? [...prev, ...newItems] : newItems));
        setTotal(Number(res?.total) || 0);
        setPage(p);
        if (p === 1) loadProgress();
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [collectionId, loadProgress, refreshing],
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1, false);
  };

  const onLoadMore = () => {
    if (loading || loadingMore || items.length >= total) return;
    load(page + 1, true);
  };

  const showBookMenu = (book) => {
    Alert.alert(book.title, undefined, [
      {
        text: 'Open book',
        onPress: () => navigation.navigate('BookDetail', { slug: book.slug, id: book.id }),
      },
      {
        text: 'Remove from collection',
        style: 'destructive',
        onPress: async () => {
          try {
            await collectionsApi.removeBook(collectionId, book.id);
            pushToast({ type: 'success', title: 'Removed', message: 'Book removed from collection.' });
            load(1, false);
          } catch (err) {
            pushToast({ type: 'error', title: 'Could not remove', message: err.message });
          }
        },
      },
      {
        text: 'Remove from library',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Remove from library?', book.title, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: async () => {
                try {
                  await libraryApi.remove(book.id);
                  pushToast({ type: 'success', title: 'Removed', message: `${book.title} is no longer saved.` });
                  load(1, false);
                } catch (err) {
                  pushToast({ type: 'error', title: 'Could not remove', message: err.message });
                }
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const displayItems = useMemo(() => items.filter((book) => book?.id), [items]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={C.bg} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: DISCOVER_LAYOUT.hPadding,
          paddingVertical: 12,
          gap: 12,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ padding: 4 }}>
          <Icon name="arrow-back" size={22} color={C.white} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 10, letterSpacing: 1 }}>
            COLLECTION
          </NCText>
          <NCText variant="headlineSm" numberOfLines={1} style={{ color: C.white, fontWeight: '700', fontSize: 20 }}>
            {name || 'Collection'}
          </NCText>
        </View>
        {!loading ? (
          <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 10 }}>
            {total} {total === 1 ? 'book' : 'books'}
          </NCText>
        ) : null}
      </View>

      {error ? (
        <ErrorView error={error} onRetry={onRefresh} />
      ) : loading && items.length === 0 ? (
        <View style={{ paddingHorizontal: DISCOVER_LAYOUT.hPadding }}>
          <LibraryGridSkeleton tileWidth={tileWidth} coverHeight={coverHeight} />
        </View>
      ) : displayItems.length === 0 ? (
        <EmptyState
          icon="folder-open"
          title="This collection is empty."
          description="Add books from any book page using Add to Collection."
        />
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{
            paddingHorizontal: DISCOVER_LAYOUT.hPadding,
            paddingBottom: Math.max(insets.bottom, 24) + 72,
          }}
          renderItem={({ item: book }) => {
            const progress = progressMap[book.id];
            return (
              <View style={{ width: tileWidth, marginBottom: 18 }}>
                <LibraryBookTile
                  book={book}
                  progress={progress}
                  tileWidth={tileWidth}
                  coverHeight={coverHeight}
                  onPress={() => {
                    if (progress?.chapterId) {
                      navigation.navigate('Reader', { chapterId: progress.chapterId });
                    } else {
                      navigation.navigate('BookDetail', { slug: book.slug, id: book.id });
                    }
                  }}
                  onMenu={() => showBookMenu(book)}
                />
              </View>
            );
          }}
          onEndReachedThreshold={0.4}
          onEndReached={onLoadMore}
          refreshControl={
            <RefreshControl tintColor={C.white} refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 24 }}>
                <ActivityIndicator color={C.white} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
