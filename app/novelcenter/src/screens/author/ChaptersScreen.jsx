import React, { useCallback, useState } from 'react';
import { View, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import IconButton from '@/components/primitives/IconButton';
import Pill from '@/components/primitives/Pill';
import Skeleton from '@/components/primitives/Skeleton';
import EmptyState from '@/components/primitives/EmptyState';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { useFocusEffect } from '@react-navigation/native';
import { useUiStore } from '@/stores/uiStore';

export default function ChaptersScreen({ route, navigation }) {
  const t = useTheme();
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

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

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
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
          <NCText variant="uiLabelSm" tone="muted">Book</NCText>
        </View>
        <IconButton name="add" onPress={onCreate} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <NCText variant="headlineXl" numberOfLines={2}>{bookTitle}</NCText>
        <NCText variant="uiLabelSm" tone="muted">{items.length} chapters</NCText>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64 }}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: t.colors.containerHigh, marginVertical: 4 }} />
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('AuthorChapterEdit', { chapterId: item.id, bookId })}
            style={({ pressed }) => ({
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <NCText variant="uiLabelSm" tone="muted" style={{ width: 32 }}>
              {String(item.idx).padStart(2, '0')}
            </NCText>
            <View style={{ flex: 1, gap: 6 }}>
              <NCText variant="titleLg" numberOfLines={2}>{item.title}</NCText>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pill label={(item.status || 'DRAFT').toUpperCase()} />
                {item.isPaid ? <Pill label={`PAID · ${item.tokenPrice}t`} /> : <Pill label="FREE" />}
                <Pill label={`${item.readingMinutes || 0} min`} />
              </View>
            </View>
            <Pressable hitSlop={8} onPress={() => onDelete(item)}>
              <Icon name="delete-outline" size={22} color={t.colors.muted} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingTop: 8, gap: 14 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
                  <Skeleton width={32} height={20} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton height={16} width="80%" />
                    <Skeleton height={10} width="40%" />
                  </View>
                </View>
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
        refreshControl={<RefreshControl tintColor={t.colors.fg} refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </Screen>
  );
}
