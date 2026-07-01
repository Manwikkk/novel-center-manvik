import React, { useCallback, useState } from 'react';
import { View, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import Skeleton from '@/components/primitives/Skeleton';
import EmptyState from '@/components/primitives/EmptyState';
import {
  StudioScreen,
  StudioHeader,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { api } from '@/lib/api';
import { useFocusEffect } from '@react-navigation/native';
import { useUiStore } from '@/stores/uiStore';


function StatusPill({ label, accent }) {
  const { colors: C } = useAppTheme();
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        backgroundColor: accent ? C.pillBg : C.inputBg,
        borderWidth: 1,
        borderColor: C.inputBorder,
      }}
    >
      <NCText variant="uiLabelXs" style={{ color: accent ? C.white : C.muted, fontSize: 9, letterSpacing: 0.5 }}>
        {label}
      </NCText>
    </View>
  );
}

export default function ChaptersScreen({ route, navigation }) {
  const { colors: C } = useAppTheme();
  const { bookId, bookTitle } = route.params || {};
  const pushToast = useUiStore((s) => s.pushToast);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get(`/books/${bookId}/chapters`);
      const list = data?.items || [];
      setItems([...list].sort((a, b) => a.idx - b.idx));
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not load chapters', message: err.message });
    }
  }, [bookId, pushToast]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onCreate = async () => {
    try {
      const { chapter } = await api.post(`/books/${bookId}/chapters`, {
        title: 'Untitled chapter',
        contentHtml: '<p>Start writing here…</p>',
        status: 'draft',
        isPaid: false,
        tokenPrice: 0,
      });
      navigation.navigate('AuthorChapterEdit', { chapterId: chapter.id, bookId });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not create chapter', message: err.message });
    }
  };

  const onDelete = (chapter) => {
    Alert.alert('Delete chapter?', chapter.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/chapters/${chapter.id}`);
            pushToast({ type: 'success', title: 'Deleted' });
            load();
          } catch (err) {
            pushToast({ type: 'error', title: 'Could not delete', message: err.message });
          }
        },
      },
    ]);
  };

  return (
    <StudioScreen>
      <StudioHeader
        breadcrumb="Book"
        title={bookTitle || 'Chapters'}
        onBack={() => navigation.goBack()}
        right={(
          <Pressable onPress={onCreate} hitSlop={8} style={{ padding: 6 }}>
            <Icon name="add" size={24} color={C.white} />
          </Pressable>
        )}
      />

      <View style={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, paddingBottom: 8 }}>
        <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 12 }}>
          {items.length} {items.length === 1 ? 'chapter' : 'chapters'}
        </NCText>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, paddingBottom: 64 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('AuthorChapterEdit', { chapterId: item.id, bookId })}
            style={({ pressed }) => ({
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.inputBorder,
              backgroundColor: C.sheet,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <NCText variant="uiLabelSm" style={{ color: C.muted, width: 28, fontSize: 12 }}>
              {String(item.idx).padStart(2, '0')}
            </NCText>
            <View style={{ flex: 1, gap: 6 }}>
              <NCText variant="titleMd" numberOfLines={2} style={{ color: C.white, fontSize: 15 }}>
                {item.title}
              </NCText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <StatusPill label={(item.status || 'draft').toUpperCase()} accent={item.status === 'published'} />
                {item.isPaid ? (
                  <StatusPill label={`PAID · ${item.tokenPrice}t`} />
                ) : (
                  <StatusPill label="FREE" />
                )}
                <StatusPill label={`${item.readingMinutes || 0} min`} />
              </View>
            </View>
            <Pressable hitSlop={8} onPress={() => onDelete(item)} style={{ padding: 4 }}>
              <Icon name="delete-outline" size={20} color={C.muted} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} width="100%" height={72} radius={12} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="auto_stories"
              title="No chapters yet"
              description="Add your first chapter to begin."
              action="Create chapter"
              onAction={onCreate}
            />
          )
        }
        refreshControl={<RefreshControl tintColor={C.white} refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </StudioScreen>
  );
}
