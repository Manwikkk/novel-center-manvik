import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FeaturedPageHeader from '@/components/featured/FeaturedPageHeader';
import SignInModal from '@/components/featured/SignInModal';
import {
  FeaturedCard,
  buildFeaturedItems,
  splitMasonryColumns,
} from '@/components/featured/FeaturedCards';
import EmptyState from '@/components/primitives/EmptyState';
import ErrorView from '@/components/primitives/ErrorView';
import Skeleton from '@/components/primitives/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { usePagedQuery } from '@/hooks/usePagedQuery';
import { useAppTheme, DISCOVER_LAYOUT } from '@/theme/discoverColors';

const { gutter: GUTTER, hPadding: H_PADDING } = DISCOVER_LAYOUT;

export default function DiscoverScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors: C, statusBarStyle } = useAppTheme();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const loader = useCallback(({ page, pageSize, q }) => {
    const query = { page, pageSize };
    if (q) query.q = q;
    return api.get('/books', { query });
  }, []);

  const extra = useMemo(() => ({ q: debouncedSearch }), [debouncedSearch]);
  const paged = usePagedQuery(loader, { pageSize: 20, extra });

  const goBook = (book) => navigation.navigate('BookDetail', { slug: book.slug, id: book.id });

  const gridItems = useMemo(() => buildFeaturedItems(paged.items), [paged.items]);
  const { left, right } = useMemo(() => splitMasonryColumns(gridItems), [gridItems]);

  const columnWidth = useMemo(() => {
    const w = Dimensions.get('window').width;
    return (w - H_PADDING * 2 - GUTTER) / 2;
  }, []);

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
    if (nearBottom) paged.loadMore();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={C.bg} />

      <View
        style={{
          paddingHorizontal: H_PADDING,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: C.bg,
          zIndex: 10,
        }}
      >
        <FeaturedPageHeader
          search={search}
          onSearchChange={setSearch}
          searchOpen={searchOpen}
          onToggleSearch={() => setSearchOpen((v) => !v)}
          onSignInPress={() => setSignInOpen(true)}
          user={user}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: H_PADDING,
          paddingBottom: Math.max(insets.bottom, 24) + (user ? 72 : 0),
        }}
        refreshControl={
          <RefreshControl
            tintColor="#fff"
            refreshing={paged.loading && paged.items.length > 0}
            onRefresh={paged.refresh}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator={false}
      >
        {paged.error ? (
          <ErrorView error={paged.error} onRetry={paged.refresh} />
        ) : paged.loading && paged.items.length === 0 ? (
          <View style={{ flexDirection: 'row', gap: GUTTER }}>
            {[0, 1].map((col) => (
              <View key={col} style={{ flex: 1, gap: GUTTER }}>
                <Skeleton width="100%" height={280} radius={18} />
                <Skeleton width="100%" height={220} radius={18} />
                <Skeleton width="100%" height={300} radius={18} />
              </View>
            ))}
          </View>
        ) : gridItems.length === 0 ? (
          <EmptyState
            icon="search-off"
            title="Nothing here yet"
            description={debouncedSearch ? `No books match "${debouncedSearch}".` : 'No novels to show right now.'}
          />
        ) : (
          <View style={{ flexDirection: 'row', gap: GUTTER, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: GUTTER }}>
              {left.map((item) => (
                <FeaturedCard
                  key={item.id}
                  item={item}
                  width={columnWidth}
                  onPressBook={goBook}
                  onPressAllRankings={() => navigation.getParent()?.navigate('DiscoverTab')}
                />
              ))}
            </View>
            <View style={{ flex: 1, gap: GUTTER }}>
              {right.map((item) => (
                <FeaturedCard
                  key={item.id}
                  item={item}
                  width={columnWidth}
                  onPressBook={goBook}
                  onPressAllRankings={() => user ? navigation.getParent()?.navigate('DiscoverTab') : undefined}
                />
              ))}
            </View>
          </View>
        )}

        {paged.items.length > 0 && paged.items.length < paged.total ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </ScrollView>

      <SignInModal visible={signInOpen} onClose={() => setSignInOpen(false)} />
    </View>
  );
}
