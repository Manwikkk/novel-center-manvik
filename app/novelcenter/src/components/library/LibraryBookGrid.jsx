import React from 'react';
import { View, Pressable, Image, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import { resolveImageUrl } from '@/lib/image';
import { useAppTheme, DISCOVER_LAYOUT } from '@/theme/discoverColors';
const COLS = 3;
const GAP = 10;

export function getLibraryGridMetrics() {
  const width = Dimensions.get('window').width;
  const contentWidth = width - DISCOVER_LAYOUT.hPadding * 2;
  const tileWidth = (contentWidth - GAP * (COLS - 1)) / COLS;
  const coverHeight = tileWidth / 0.667;
  const twoColWidth = (contentWidth - GAP) / 2;
  return { tileWidth, coverHeight, twoColWidth, contentWidth, cols: COLS, gap: GAP };
}

export function LibraryBookTile({
  book,
  progress,
  showLastReadBadge,
  onPress,
  onMenu,
  tileWidth,
  coverHeight,
}) {
  const { colors: C } = useAppTheme();
  const uri = resolveImageUrl(book?.coverUrl);
  const chapterIdx = progress?.chapterIdx ?? 0;
  const total = book?.chapterCount ?? 0;
  const progressLabel = total > 0 ? `${chapterIdx || 0}/${total}` : book?.category || 'Novel';

  return (
    <View style={{ width: tileWidth, gap: 8 }}>
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
        <View
          style={{
            width: tileWidth,
            height: coverHeight,
            borderRadius: 10,
            overflow: 'hidden',
            backgroundColor: C.inputBg,
          }}
        >
          {uri ? (
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : null}
          {showLastReadBadge ? (
            <View
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                backgroundColor: 'rgba(0,0,0,0.72)',
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 3,
              }}
            >
              <NCText variant="uiLabelXs" style={{ color: C.white, fontSize: 9, letterSpacing: 0.3 }}>
                Last read
              </NCText>
            </View>
          ) : null}
        </View>
      </Pressable>

      <NCText variant="titleMd" numberOfLines={2} style={{ color: C.white, fontSize: 12, lineHeight: 16 }}>
        {book?.title || 'Untitled'}
      </NCText>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <NCText variant="uiLabelXs" numberOfLines={1} style={{ color: C.muted, flex: 1, fontSize: 11 }}>
          {progressLabel}
        </NCText>
        <Pressable onPress={onMenu} hitSlop={8} style={{ padding: 2 }}>
          <Icon name="more-horiz" size={16} color={C.muted} />
        </Pressable>
      </View>
    </View>
  );
}

export function LibraryCollectionTile({ collection, onPress, tileWidth }) {
  const { colors: C } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: tileWidth,
        opacity: pressed ? 0.88 : 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.inputBorder,
        backgroundColor: C.sheet,
        padding: 14,
        minHeight: 120,
        gap: 10,
      })}
    >
      <Icon name="folder-open" size={26} color={C.muted} />
      <NCText variant="titleMd" numberOfLines={2} style={{ color: C.white, fontSize: 14 }}>
        {collection.name}
      </NCText>
      <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 10, letterSpacing: 0.8 }}>
        {collection.bookCount} {collection.bookCount === 1 ? 'book' : 'books'} · {collection.visibility}
      </NCText>
    </Pressable>
  );
}

export function LibraryGridSkeleton({ tileWidth, coverHeight, count = 9 }) {
  const { colors: C } = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GAP,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: tileWidth, gap: 8 }}>
          <View
            style={{
              width: tileWidth,
              height: coverHeight,
              borderRadius: 10,
              backgroundColor: C.inputBg,
            }}
          />
          <View style={{ height: 12, borderRadius: 4, backgroundColor: C.inputBg, width: '90%' }} />
          <View style={{ height: 10, borderRadius: 4, backgroundColor: C.inputBg, width: '55%' }} />
        </View>
      ))}
    </View>
  );
}
