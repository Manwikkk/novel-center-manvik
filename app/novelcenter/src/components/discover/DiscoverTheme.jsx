import React from 'react';
import { View, Pressable, Image, ScrollView } from 'react-native';
import NCText from '@/components/primitives/Text';
import { resolveImageUrl } from '@/lib/image';
import { useAppTheme } from '@/theme/discoverColors';

export function SectionHeader({ title, action, onAction }) {
  const { colors: C } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <NCText variant="headlineSm" style={{ color: C.white, fontWeight: '700', fontSize: 20 }}>
        {title}
      </NCText>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <NCText variant="uiLabelSm" style={{ color: C.muted, letterSpacing: 0.5, fontSize: 11 }}>
            {action}
          </NCText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function DarkBookTile({ book, onPress, width = 112 }) {
  const { colors: C, layout } = useAppTheme();
  const uri = resolveImageUrl(book?.coverUrl);
  return (
    <Pressable onPress={onPress} style={{ width, gap: 8 }}>
      <View
        style={{
          width,
          height: width / 0.667,
          borderRadius: layout.cardRadius,
          overflow: 'hidden',
          backgroundColor: C.inputBg,
        }}
      >
        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
      </View>
      <NCText variant="titleMd" numberOfLines={2} style={{ color: C.white, fontSize: 13, lineHeight: 17 }}>
        {book?.title || 'Untitled'}
      </NCText>
      <NCText variant="uiLabelXs" style={{ color: C.muted, letterSpacing: 0.5, fontSize: 10 }}>
        {(book?.category || 'Novel').toUpperCase()}
      </NCText>
    </Pressable>
  );
}

export function DarkBookCarousel({ books, onPressBook }) {
  if (!books?.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 4 }}>
      {books.map((book) => (
        <DarkBookTile
          key={book.id ?? book.slug}
          book={book}
          onPress={() => onPressBook?.(book)}
        />
      ))}
    </ScrollView>
  );
}

export function DarkSurface({ children, style }) {
  const { colors: C, layout } = useAppTheme();
  return (
    <View
      style={[
        {
          borderRadius: layout.cardRadius,
          borderWidth: 1,
          borderColor: C.inputBorder,
          backgroundColor: C.sheet,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
