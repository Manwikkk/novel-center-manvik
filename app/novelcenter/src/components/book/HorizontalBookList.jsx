import React from 'react';
import { FlatList, View } from 'react-native';
import BookCard from '@/components/book/BookCard';
import Skeleton from '@/components/primitives/Skeleton';
import { useTheme } from '@/theme';

export default function HorizontalBookList({ books, onPressBook, loading, width = 140 }) {
  const t = useTheme();
  if (loading && (!books || books.length === 0)) {
    return (
      <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 4 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={{ width, gap: 10 }}>
            <Skeleton width={width} height={width / 0.667} radius={4} />
            <Skeleton width={width - 30} height={14} />
            <Skeleton width={width - 60} height={10} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <FlatList
      data={books}
      horizontal
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <BookCard book={item} width={width} onPress={() => onPressBook?.(item)} />
      )}
      ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
      contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 4 }}
      showsHorizontalScrollIndicator={false}
    />
  );
}
