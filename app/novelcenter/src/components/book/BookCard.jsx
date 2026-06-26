import React from 'react';
import { View, Pressable } from 'react-native';
import Cover from '@/components/primitives/Cover';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';

export default function BookCard({ book, onPress, width = 140 }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ width, opacity: pressed ? 0.85 : 1, gap: 10 })}
    >
      <Cover source={book?.coverUrl} width={width} />
      <View style={{ gap: 2 }}>
        <NCText variant="titleLg" numberOfLines={2}>{book?.title || 'Untitled'}</NCText>
        <NCText variant="uiLabelXs" tone="muted" numberOfLines={1}>
          {book?.authorName || 'Unknown author'}
        </NCText>
        {book?.category ? (
          <NCText variant="bodySm" tone="muted" numberOfLines={1}>
            {book.category}
          </NCText>
        ) : null}
      </View>
    </Pressable>
  );
}

export function BookListItem({ book, onPress }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 14,
        opacity: pressed ? 0.85 : 1,
        paddingVertical: 8,
      })}
    >
      <Cover source={book?.coverUrl} width={70} />
      <View style={{ flex: 1, gap: 4, paddingTop: 2 }}>
        <NCText variant="titleLg" numberOfLines={2}>{book?.title || 'Untitled'}</NCText>
        <NCText variant="uiLabelXs" tone="muted" numberOfLines={1}>
          {book?.authorName || 'Unknown author'}
        </NCText>
        {book?.synopsis ? (
          <NCText variant="bodySm" tone="muted" numberOfLines={2}>{book.synopsis}</NCText>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 2 }}>
          {book?.category ? (
            <NCText variant="uiLabelXs" tone="muted">{book.category}</NCText>
          ) : null}
          {Number.isFinite(book?.chapterCount) ? (
            <NCText variant="uiLabelXs" tone="muted">{book.chapterCount} ch</NCText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
