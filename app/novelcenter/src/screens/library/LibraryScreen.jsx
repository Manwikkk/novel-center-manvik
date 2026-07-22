import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  TextInput,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import NCText from '@/components/primitives/Text';
import EmptyState from '@/components/primitives/EmptyState';
import ErrorView from '@/components/primitives/ErrorView';
import {
  LibraryBookTile,
  LibraryCollectionTile,
  LibraryGridSkeleton,
  getLibraryGridMetrics,
} from '@/components/library/LibraryBookGrid';
import { libraryApi } from '@/lib/library';
import { collectionsApi } from '@/lib/collections';
import { readingApi } from '@/lib/reading';
import { useUiStore } from '@/stores/uiStore';
import { useAppTheme, DISCOVER_LAYOUT } from '@/theme/discoverColors';

const PAGE_SIZE = 24;

const TABS = [
  { key: 'active', label: 'Library', readingStatus: 'active' },
  { key: 'on_hold', label: 'On Hold', readingStatus: 'on_hold' },
  { key: 'archive', label: 'Archive', readingStatus: 'archive' },
  { key: 'dropped', label: 'Dropped', readingStatus: 'dropped' },
  { key: 'collections', label: 'Collections' },
];

const EMPTY_COPY = {
  active: {
    title: 'Your library is empty.',
    body: 'Save books from Discover or any book page to keep them within reach.',
  },
  on_hold: {
    title: 'No books on hold.',
    body: 'Use the menu on any book page to mark stories you want to resume later.',
  },
  archive: {
    title: 'Archive is empty.',
    body: 'Finished or set-aside books you archive will appear here.',
  },
  dropped: {
    title: 'No dropped books.',
    body: 'Books you drop from your reading list will show up in this tab.',
  },
  collections: {
    title: 'No collections yet.',
    body: 'Create collections from any book page using Add to Collection.',
  },
};

const SORT_OPTIONS = [
  { key: 'recent_reading', label: 'Recent reading' },
  { key: 'recently_added', label: 'Recently added' },
  { key: 'title', label: 'Title A–Z' },
];

const STATUS_ACTIONS = [
  { key: 'active', label: 'Move to Library' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'archive', label: 'Archive' },
  { key: 'dropped', label: 'Dropped' },
];

function LibraryPillTabs({ activeTab, onChange }) {
  const { colors: C } = useAppTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: DISCOVER_LAYOUT.hPadding, gap: 8, paddingVertical: 4 }}
    >
      {TABS.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: active ? C.pillBg : 'transparent',
            }}
          >
            <NCText
              variant="uiLabelSm"
              style={{
                color: active ? C.white : C.muted,
                fontSize: 13,
                fontWeight: active ? '600' : '400',
              }}
            >
              {tab.label}
            </NCText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function LibraryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors: C, statusBarStyle } = useAppTheme();
  const pushToast = useUiStore((s) => s.pushToast);
  const { tileWidth, coverHeight, twoColWidth } = getLibraryGridMetrics();

  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortKey, setSortKey] = useState('recent_reading');
  const [filterCategory, setFilterCategory] = useState('all');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [progressMap, setProgressMap] = useState({});

  const isCollections = activeTab === 'collections';
  const readingStatus = TABS.find((t) => t.key === activeTab)?.readingStatus || 'active';
  const empty = EMPTY_COPY[activeTab] || EMPTY_COPY.active;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

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
          lastReadAt: entry.lastReadAt,
        };
      }
      setProgressMap(map);
    } catch (_e) {
      setProgressMap({});
    }
  }, []);

  const load = useCallback(
    async (p = 1, append = false) => {
      if (append) setLoadingMore(true);
      else if (!refreshing) setLoading(true);
      setError(null);
      try {
        const req = isCollections
          ? collectionsApi.list({ page: p, pageSize: PAGE_SIZE })
          : libraryApi.list({
              page: p,
              pageSize: PAGE_SIZE,
              q: debouncedSearch || undefined,
              readingStatus,
            });

        const res = await req;
        const newItems = res?.items || [];
        setItems((prev) => (append ? [...prev, ...newItems] : newItems));
        setTotal(Number(res?.total) || 0);
        setPage(p);

        if (!isCollections && p === 1) loadProgress();
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, isCollections, loadProgress, readingStatus, refreshing],
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    load(1, false);
  }, [activeTab, debouncedSearch, load]);

  useFocusEffect(
    useCallback(() => {
      load(1, false);
    }, [load]),
  );

  const categories = useMemo(() => {
    if (isCollections) return [];
    const set = new Set();
    for (const entry of items) {
      const cat = entry.book?.category;
      if (cat) set.add(cat);
    }
    return ['all', ...Array.from(set).sort()];
  }, [items, isCollections]);

  const displayItems = useMemo(() => {
    let list = [...items];
    if (!isCollections) {
      list = list.filter((entry) => entry?.book?.id);
      if (filterCategory !== 'all') {
        list = list.filter((entry) => entry.book?.category === filterCategory);
      }
      if (sortKey === 'recent_reading') {
        list.sort((a, b) => {
          const aTime = progressMap[a.book.id]?.lastReadAt;
          const bTime = progressMap[b.book.id]?.lastReadAt;
          if (aTime && bTime) return new Date(bTime) - new Date(aTime);
          if (bTime) return 1;
          if (aTime) return -1;
          return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
        });
      } else if (sortKey === 'title') {
        list.sort((a, b) => (a.book?.title || '').localeCompare(b.book?.title || ''));
      }
    }
    return list;
  }, [filterCategory, isCollections, items, progressMap, sortKey]);

  const lastReadBookId = useMemo(() => {
    if (isCollections || sortKey !== 'recent_reading') return null;
    const first = displayItems.find((entry) => progressMap[entry.book?.id]?.lastReadAt);
    return first?.book?.id ?? null;
  }, [displayItems, isCollections, progressMap, sortKey]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1, false);
  };

  const onLoadMore = () => {
    if (loading || loadingMore || items.length >= total) return;
    load(page + 1, true);
  };

  const showSortPicker = () => {
    Alert.alert('Sort by', undefined, [
      ...SORT_OPTIONS.map((opt) => ({
        text: opt.label,
        onPress: () => setSortKey(opt.key),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const showFilterPicker = () => {
    if (isCollections || categories.length <= 1) return;
    Alert.alert(
      'Filter by category',
      undefined,
      [
        ...categories.map((cat) => ({
          text: cat === 'all' ? 'All categories' : cat,
          onPress: () => setFilterCategory(cat),
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleRemove = (bookId, title) => {
    Alert.alert('Remove from library?', title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await libraryApi.remove(bookId);
            pushToast({ type: 'success', title: 'Removed', message: `${title} is no longer saved.` });
            load(1, false);
          } catch (err) {
            pushToast({ type: 'error', title: 'Could not remove', message: err.message });
          }
        },
      },
    ]);
  };

  const handleSetStatus = async (bookId, title, status) => {
    try {
      await libraryApi.setStatus(bookId, status);
      const label = TABS.find((t) => t.readingStatus === status)?.label || status;
      pushToast({ type: 'success', title: 'Updated', message: `"${title}" moved to ${label}.` });
      load(1, false);
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update', message: err.message });
    }
  };

  const showBookMenu = (entry) => {
    const book = entry.book;
    const statusActions = STATUS_ACTIONS.filter((a) => a.key !== readingStatus).map((a) => ({
      text: a.label,
      onPress: () => handleSetStatus(book.id, book.title, a.key),
    }));

    Alert.alert(book.title, undefined, [
      {
        text: 'Open book',
        onPress: () => navigation.navigate('BookDetail', { slug: book.slug, id: book.id }),
      },
      ...statusActions,
      {
        text: 'Remove from library',
        style: 'destructive',
        onPress: () => handleRemove(book.id, book.title),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label || 'Recent reading';
  const filterLabel = filterCategory === 'all' ? 'Filter' : filterCategory;

  const renderBookItem = ({ item }) => {
    const { book } = item;
    const progress = progressMap[book.id];
    return (
      <View style={{ width: tileWidth, marginBottom: 18 }}>
        <LibraryBookTile
          book={book}
          progress={progress}
          showLastReadBadge={book.id === lastReadBookId}
          tileWidth={tileWidth}
          coverHeight={coverHeight}
          onPress={() => {
            if (progress?.chapterId) {
              navigation.navigate('Reader', { chapterId: progress.chapterId });
            } else {
              navigation.navigate('BookDetail', { slug: book.slug, id: book.id });
            }
          }}
          onMenu={() => showBookMenu(item)}
        />
      </View>
    );
  };

  const renderCollectionItem = ({ item }) => (
    <View style={{ width: twoColWidth, marginBottom: 10 }}>
      <LibraryCollectionTile
        collection={item}
        tileWidth={twoColWidth}
        onPress={() => navigation.navigate('CollectionDetail', { id: item.id, name: item.name })}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={C.bg} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingRight: DISCOVER_LAYOUT.hPadding,
        }}
      >
        <View style={{ flex: 1 }}>
          <LibraryPillTabs activeTab={activeTab} onChange={setActiveTab} />
        </View>
        <Pressable hitSlop={8} style={{ padding: 4 }}>
          <Icon name="more-horiz" size={22} color={C.muted} />
        </Pressable>
      </View>

      {!isCollections ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20,
            paddingHorizontal: DISCOVER_LAYOUT.hPadding,
            paddingVertical: 10,
          }}
        >
          <Pressable onPress={showFilterPicker} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <NCText variant="bodySm" style={{ color: C.muted, fontSize: 13 }}>
              {filterLabel}
            </NCText>
            <Icon name="keyboard-arrow-down" size={18} color={C.muted} />
          </Pressable>
          <Pressable onPress={showSortPicker} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <NCText variant="bodySm" style={{ color: C.muted, fontSize: 13 }}>
              {sortLabel}
            </NCText>
            <Icon name="keyboard-arrow-down" size={18} color={C.muted} />
          </Pressable>
          {!loading ? (
            <NCText variant="uiLabelXs" style={{ color: C.muted, marginLeft: 'auto', fontSize: 10, letterSpacing: 0.8 }}>
              {total} {total === 1 ? 'book' : 'books'}
            </NCText>
          ) : null}
        </View>
      ) : null}

      {!isCollections ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: DISCOVER_LAYOUT.hPadding,
            marginBottom: 12,
            backgroundColor: C.inputBg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: C.inputBorder,
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <Icon name="search" size={18} color={C.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search library…"
            placeholderTextColor={C.muted}
            style={{ flex: 1, color: C.white, fontSize: 14, paddingVertical: 10 }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Icon name="close" size={18} color={C.muted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <ErrorView error={error} onRetry={onRefresh} />
      ) : loading && items.length === 0 ? (
        <View style={{ paddingHorizontal: DISCOVER_LAYOUT.hPadding }}>
          <LibraryGridSkeleton tileWidth={tileWidth} coverHeight={coverHeight} />
        </View>
      ) : displayItems.length === 0 ? (
        <EmptyState
          icon={debouncedSearch ? 'search-off' : isCollections ? 'folder-open' : 'bookmark-border'}
          title={debouncedSearch && !isCollections ? 'No books match your search.' : empty.title}
          description={
            debouncedSearch && !isCollections
              ? 'Try a different title, author, or category — or clear the search.'
              : empty.body
          }
          action={activeTab === 'active' && !debouncedSearch ? 'Discover books' : undefined}
          onAction={
            activeTab === 'active' && !debouncedSearch
              ? () => navigation.getParent()?.navigate('DiscoverTab')
              : undefined
          }
        />
      ) : isCollections ? (
        <FlatList
          key="collections-grid"
          data={displayItems}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: DISCOVER_LAYOUT.hPadding }}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 72 }}
          renderItem={renderCollectionItem}
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
      ) : (
        <FlatList
          key="books-grid"
          data={displayItems}
          keyExtractor={(item) => String(item.bookId ?? item.book?.id)}
          numColumns={3}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{
            paddingHorizontal: DISCOVER_LAYOUT.hPadding,
            paddingBottom: Math.max(insets.bottom, 24) + 72,
          }}
          renderItem={renderBookItem}
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
