import React, { useEffect, useState } from 'react';
import { View, Pressable, Image, Dimensions } from 'react-native';
import NCText from '@/components/primitives/Text';
import { resolveImageUrl } from '@/lib/image';
import { useAppTheme, DISCOVER_LAYOUT } from '@/theme/discoverColors';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
const MEET_ITEMS = [
  {
    title: 'WebNovel Spirity Awards 2026',
    img: 'https://webbanner.webnovel.com/utils/1768212212_346290.jpg?imageMogr2/quality/80',
  },
  {
    title: 'WebNovel Author Benefits',
    img: 'https://webbanner.webnovel.com/utils/1736997772_791074.png?imageMogr2/quality/80',
  },
  {
    title: 'More Novels and Bonus!',
    img: 'https://webbanner.webnovel.com/utils/1697615553_297844.jpg?imageMogr2/quality/80',
  },
];

export default function WeeklyBookHero({ items = [], onPressBook, onPressDiscover }) {
  const { colors: C } = useAppTheme();
  const slides = (items || []).slice(0, 4);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const t = setInterval(() => setActive((n) => (n + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;

  const slide = slides[active];
  const coverUri = resolveImageUrl(slide?.coverUrl);
  const width = Dimensions.get('window').width - DISCOVER_LAYOUT.hPadding * 2;

  return (
    <View style={{ gap: 12 }}>
      <NCText variant="uiLabelSm" style={{ color: C.white, letterSpacing: 1.4, fontSize: 11 }}>
        WEEKLY BOOK
      </NCText>
      <Pressable
        onPress={() => (slide?.slug ? onPressBook?.(slide) : onPressDiscover?.())}
        style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      >
        <DarkSurface style={{ minHeight: 280 }}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={{ position: 'absolute', width, height: 280, opacity: 0.35 }} resizeMode="cover" />
          ) : null}
          <View style={{ padding: 18, gap: 14, minHeight: 280, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <View
                style={{
                  width: 100,
                  height: 150,
                  borderRadius: 10,
                  overflow: 'hidden',
                  backgroundColor: C.inputBg,
                  borderWidth: 1,
                  borderColor: C.inputBorder,
                }}
              >
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <NCText variant="headlineSm" numberOfLines={3} style={{ color: C.white, fontWeight: '700', fontSize: 20, lineHeight: 26 }}>
                  {slide?.title || 'Untitled'}
                </NCText>
                <NCText variant="bodySm" numberOfLines={4} style={{ color: C.muted, lineHeight: 20 }}>
                  {slide?.synopsis || 'Featured this week — dive in and keep reading on Novel Centre.'}
                </NCText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {slides.map((_, i) => (
                <Pressable key={String(i)} onPress={() => setActive(i)}>
                  <View
                    style={{
                      width: i === active ? 20 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === active ? C.white : C.inputBorder,
                    }}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </DarkSurface>
      </Pressable>
    </View>
  );
}

export function MeetNovelCentre({ onPressDiscover }) {
  const { colors: C } = useAppTheme();
  return (
    <View style={{ gap: 12 }}>
      <NCText variant="uiLabelSm" style={{ color: C.white, letterSpacing: 1.4, fontSize: 11 }}>
        MEET NOVEL CENTRE
      </NCText>
      <DarkSurface>
        {MEET_ITEMS.map((item, i) => (
          <Pressable
            key={item.title}
            onPress={onPressDiscover}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: C.inputBorder,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <NCText variant="titleMd" style={{ color: C.white, fontSize: 15 }}>
                {item.title}
              </NCText>
              <NCText variant="bodySm" style={{ color: C.muted, fontSize: 12 }}>
                Explore promotions and reading perks.
              </NCText>
            </View>
            <Image
              source={{ uri: item.img }}
              style={{ width: 72, height: 48, borderRadius: 8, backgroundColor: C.inputBg }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </DarkSurface>
    </View>
  );
}
