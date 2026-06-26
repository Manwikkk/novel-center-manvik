import React from 'react';
import { View, Pressable } from 'react-native';
import Cover from '@/components/primitives/Cover';
import NCText from '@/components/primitives/Text';
import Pill from '@/components/primitives/Pill';
import { useTheme } from '@/theme';

export default function LandingHero({ book, onPress }) {
  const t = useTheme();
  if (!book) return null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: t.colors.surfaceLow,
          borderColor: t.colors.containerHigh,
          borderWidth: 1,
          borderRadius: t.radii.lg,
          padding: 20,
          gap: 16,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <NCText variant="uiLabelSm" tone="muted">Editor's pick</NCText>
        <Pill label={book.category || 'Featured'} />
      </View>
      <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-start' }}>
        <Cover source={book.coverUrl} width={120} />
        <View style={{ flex: 1, gap: 8 }}>
          <NCText variant="headlineMd" numberOfLines={3}>{book.title}</NCText>
          <NCText variant="uiLabelSm" tone="muted">{book.authorName || 'Unknown author'}</NCText>
          {book.synopsis ? (
            <NCText variant="bodySm" tone="muted" numberOfLines={4}>
              {book.synopsis}
            </NCText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
