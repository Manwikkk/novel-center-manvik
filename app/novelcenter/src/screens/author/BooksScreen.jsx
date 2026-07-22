import React, { useCallback, useState } from 'react';
import { View, FlatList, Pressable, RefreshControl, ActivityIndicator, Alert, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import EmptyState from '@/components/primitives/EmptyState';
import Skeleton from '@/components/primitives/Skeleton';
import AuthorGuard from '@/components/studio/AuthorGuard';
import StudioNavBar from '@/components/studio/StudioNavBar';
import {
  StudioScreen,
  StudioHeader,
  StudioPillTabs,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { resolveImageUrl } from '@/lib/image';
import { api } from '@/lib/api';
import { exitAuthorStudioToProfile } from '@/lib/authorNavigation';
import { useAuthStore } from '@/stores/authStore';
import { usePagedQuery } from '@/hooks/usePagedQuery';
import { useFocusEffect } from '@react-navigation/native';
import { useUiStore } from '@/stores/uiStore';


const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'published', label: 'Published' },
  { key: 'archived', label: 'Archive' },
];

export default function BooksScreen({ navigation }) {
  return (
    <AuthorGuard navigation={navigation} title="My books">
      <BooksContent navigation={navigation} />
    </AuthorGuard>
  );
}

function BooksContent({ navigation }) {
  const { colors: C } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [statusFilter, setStatusFilter] = useState('all');

  const loader = useCallback(
    ({ page, pageSize }) =>
      api.get('/books', {
        query: {
          page,
          pageSize,
          author: user?.id,
          status: statusFilter === 'all' ? undefined : statusFilter,
        },
      }),
    [statusFilter, user?.id],
  );
  const paged = usePagedQuery(loader, { pageSize: 20, deps: [statusFilter, user?.id] });

  useFocusEffect(useCallback(() => { paged.refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []));

  const onDelete = (book) => {
    Alert.alert('Delete book?', book.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/books/${book.id}`);
            pushToast({ type: 'success', title: 'Deleted', message: `${book.title} was removed.` });
            paged.refresh();
          } catch (err) {
            pushToast({ type: 'error', title: 'Could not delete', message: err.message });
          }
        },
      },
    ]);
  };

  const showBookMenu = (book) => {
    const actions = [
      {
        text: 'Edit book',
        onPress: () => navigation.navigate('AuthorBookEdit', { mode: 'edit', bookId: book.id }),
      },
      {
        text: 'Manage chapters',
        onPress: () => navigation.navigate('AuthorChapters', { bookId: book.id, bookTitle: book.title }),
      },
    ];
    if (book.slug && book.status === 'published') {
      actions.unshift({
        text: 'View public page',
        onPress: () =>
          navigation.getParent()?.getParent()?.navigate('DiscoverTab', {
            screen: 'BookDetail',
            params: { slug: book.slug, id: book.id },
          }),
      });
    }
    actions.push(
      { text: 'Delete book', style: 'destructive', onPress: () => onDelete(book) },
      { text: 'Cancel', style: 'cancel' },
    );
    Alert.alert(book.title, undefined, actions);
  };

  return (
    <StudioScreen edges={['top']}>
      <StudioHeader
        breadcrumb="Author Studio"
        title="My books"
        onBack={() => exitAuthorStudioToProfile(navigation)}
        right={(
          <Pressable
            onPress={() => navigation.navigate('AuthorBookEdit', { mode: 'create' })}
            hitSlop={8}
            style={{ padding: 6 }}
          >
            <Icon name="add" size={24} color={C.white} />
          </Pressable>
        )}
      />

      <View style={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, paddingBottom: 12, gap: 10 }}>
        <StudioPillTabs tabs={STATUS_TABS} activeKey={statusFilter} onChange={setStatusFilter} />
        <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 12 }}>
          {paged.total} {paged.total === 1 ? 'book' : 'books'}
        </NCText>
      </View>

      <FlatList
        data={paged.items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, paddingBottom: 64 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const uri = resolveImageUrl(item.coverUrl);
          return (
            <Pressable
              onPress={() => navigation.navigate('AuthorBookEdit', { mode: 'edit', bookId: item.id })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                gap: 12,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.inputBorder,
                backgroundColor: C.sheet,
                opacity: pressed ? 0.88 : 1,
              })}
            >
              <View
                style={{
                  width: 56,
                  height: 84,
                  borderRadius: 8,
                  overflow: 'hidden',
                  backgroundColor: C.inputBg,
                }}
              >
                {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <NCText variant="titleMd" numberOfLines={2} style={{ color: C.white, fontSize: 15 }}>
                  {item.title}
                </NCText>
                <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 11 }}>
                  {(item.status || 'draft').toUpperCase()} · {item.chapterCount || 0} chapters
                </NCText>
                {item.category ? (
                  <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 11 }}>
                    {item.category}
                  </NCText>
                ) : null}
              </View>
              <Pressable onPress={() => showBookMenu(item)} hitSlop={8} style={{ padding: 4 }}>
                <Icon name="more-horiz" size={20} color={C.muted} />
              </Pressable>
            </Pressable>
          );
        }}
        refreshControl={
          <RefreshControl tintColor={C.white} refreshing={paged.loading && paged.items.length > 0} onRefresh={paged.refresh} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={paged.loadMore}
        ListEmptyComponent={
          paged.loading ? (
            <View style={{ gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} width="100%" height={108} radius={12} />
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
              <ActivityIndicator color={C.white} />
            </View>
          ) : null
        }
      />
      <StudioNavBar navigation={navigation} activeRoute="AuthorBooks" />
    </StudioScreen>
  );
}
