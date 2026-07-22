import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, Image, ScrollView, Dimensions } from 'react-native';
import NCText from '@/components/primitives/Text';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import { resolveImageUrl } from '@/lib/image';
import { useAppTheme, DISCOVER_LAYOUT } from '@/theme/discoverColors';
const GRID_GAP = 12;
const COVER_W = 52;
const COVER_H = 72;

const RANKING_TABS = [
  { key: 'mostRead', label: 'Most Read' },
  { key: 'trending', label: 'Trending' },
  { key: 'topRated', label: 'Top Rated' },
];

function getGridItemWidth() {
  const contentWidth = Dimensions.get('window').width - DISCOVER_LAYOUT.hPadding * 2;
  return (contentWidth - GRID_GAP) / 2;
}

function RankBookTile({ book, width, onPress }) {
  const { colors: C } = useAppTheme();
  const uri = resolveImageUrl(book?.coverUrl);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: COVER_W,
          height: COVER_H,
          borderRadius: 6,
          overflow: 'hidden',
          backgroundColor: C.inputBg,
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 4, paddingTop: 2 }}>
        <NCText variant="titleMd" numberOfLines={2} style={{ color: C.white, fontSize: 13, lineHeight: 17 }}>
          {book?.title || 'Untitled'}
        </NCText>
        <NCText variant="uiLabelXs" numberOfLines={1} style={{ color: C.muted, fontSize: 11 }}>
          {book?.category || 'Novel'}
        </NCText>
      </View>
    </Pressable>
  );
}

function RankingTabBar({ tabs, activeKey, onChange }) {
  const { colors: C } = useAppTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingVertical: 2 }}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 6,
              backgroundColor: active ? C.white : 'transparent',
            }}
          >
            <NCText
              variant="uiLabelSm"
              style={{
                color: active ? C.bg : C.muted,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 0.3,
              }}
            >
              {tab.label.toUpperCase()}
            </NCText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function DarkRankingSection({ mostRead = [], trending = [], highlyRated = [], onPressBook }) {
  const { colors: C } = useAppTheme();
  const itemWidth = getGridItemWidth();

  const tabData = useMemo(
    () => ({
      mostRead: mostRead || [],
      trending: trending || [],
      topRated: highlyRated || [],
    }),
    [highlyRated, mostRead, trending],
  );

  const availableTabs = useMemo(
    () => RANKING_TABS.filter((tab) => tabData[tab.key]?.length),
    [tabData],
  );

  const [activeKey, setActiveKey] = useState(availableTabs[0]?.key || 'mostRead');

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.key === activeKey)) {
      setActiveKey(availableTabs[0]?.key || 'mostRead');
    }
  }, [activeKey, availableTabs]);

  const activeItems = tabData[activeKey] || [];

  if (!availableTabs.length) return null;

  return (
    <View style={{ gap: 14 }}>
      <NCText variant="headlineSm" style={{ color: C.white, fontWeight: '700', fontSize: 20 }}>
        Ranking Novels
      </NCText>

      <RankingTabBar tabs={availableTabs} activeKey={activeKey} onChange={setActiveKey} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, rowGap: 16 }}>
        {activeItems.slice(0, 10).map((book, idx) => (
          <RankBookTile
            key={book?.id ?? book?.slug ?? idx}
            book={book}
            width={itemWidth}
            onPress={() => onPressBook?.(book)}
          />
        ))}
      </View>
    </View>
  );
}

export function BecomeAuthorCTA({ onPressStart }) {
  const { colors: C } = useAppTheme();
  return (
    <DarkSurface style={{ padding: 20, gap: 14 }}>
      <NCText variant="uiLabelSm" style={{ color: C.accent, letterSpacing: 1.2, fontSize: 10 }}>
        WRITERS WANTED
      </NCText>
      <NCText variant="headlineSm" style={{ color: C.white, fontWeight: '700', fontSize: 24, lineHeight: 30 }}>
        Become an author on Novel Centre
      </NCText>
      <NCText variant="bodySm" style={{ color: C.muted, lineHeight: 20 }}>
        Publish chapter by chapter, build a loyal readership, and earn from every unlock.
      </NCText>
      <Pressable
        onPress={onPressStart}
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          backgroundColor: C.white,
          borderRadius: 999,
          paddingVertical: 12,
          paddingHorizontal: 20,
          opacity: pressed ? 0.88 : 1,
        })}
      >
        <NCText variant="uiLabelSm" style={{ color: C.bg, fontWeight: '700', letterSpacing: 0.5 }}>
          Start writing
        </NCText>
      </Pressable>
    </DarkSurface>
  );
}

export function DarkContinueReading({ entry, onPress }) {
  const { colors: C } = useAppTheme();
  if (!entry) return null;
  const percent = Math.max(0, Math.min(100, Number(entry.percent) || 0));
  return (
    <DarkSurface style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <NCText variant="uiLabelSm" style={{ color: C.muted, letterSpacing: 1, fontSize: 10 }}>
          CONTINUE READING
        </NCText>
        <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 10 }}>
          {percent}%
        </NCText>
      </View>
      <Pressable onPress={onPress} style={{ gap: 10 }}>
        <NCText variant="titleMd" numberOfLines={2} style={{ color: C.white, fontSize: 16 }}>
          {entry.book?.title}
        </NCText>
        <NCText variant="bodySm" style={{ color: C.muted }}>
          {entry.chapter?.title || entry.book?.authorName}
        </NCText>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: C.inputBorder, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${percent}%`, backgroundColor: C.white }} />
        </View>
      </Pressable>
    </DarkSurface>
  );
}
