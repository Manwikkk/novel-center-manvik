import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import ReaderPrefsPreview from '@/components/reader/ReaderPrefsPreview';
import {
  StudioScreen,
  StudioHeader,
  StudioSectionLabel,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import { useReaderPreferences } from '@/hooks/useReaderPreferences';
import { READER_FONT_SIZES, READER_FAMILIES, READER_THEMES } from '@/stores/readerStore';
import { palettes } from '@/theme/palette';
import { fontFamily } from '@/theme/typography';


const THEME_ICONS = {
  cream: 'wb-sunny',
  sepia: 'menu-book',
  dark: 'nightlight-round',
};

export default function ReaderPrefsScreen({ navigation }) {
  const { colors: C } = useAppTheme();
  const prefs = useReaderPreferences();
  const { fontSize, fontFamily: fontFamilyKind, theme, setFontSize, setFontFamily, setTheme, bumpFont } = prefs;

  const minSize = READER_FONT_SIZES[0];
  const maxSize = READER_FONT_SIZES[READER_FONT_SIZES.length - 1];

  return (
    <StudioScreen>
      <StudioHeader breadcrumb="Profile" title="Reader preferences" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, paddingBottom: 64, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <ReaderPrefsPreview />

        <DarkSurface style={{ padding: 16, gap: 12 }}>
          <StudioSectionLabel>THEME</StudioSectionLabel>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {READER_THEMES.map((key) => {
              const active = theme === key;
              const swatch = palettes[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => setTheme(key)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? C.white : C.inputBorder,
                    backgroundColor: swatch.bg,
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Icon name={THEME_ICONS[key] || 'brightness-medium'} size={18} color={swatch.fg} />
                  <NCText
                    variant="uiLabelXs"
                    style={{ color: swatch.fg, textTransform: 'uppercase', fontSize: 10, fontWeight: active ? '700' : '400' }}
                  >
                    {key}
                  </NCText>
                </Pressable>
              );
            })}
          </View>
        </DarkSurface>

        <DarkSurface style={{ padding: 16, gap: 12 }}>
          <StudioSectionLabel>TYPE SIZE</StudioSectionLabel>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <Pressable
              onPress={() => bumpFont(-1)}
              disabled={fontSize <= minSize}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderWidth: 1,
                borderColor: C.inputBorder,
                borderRadius: 10,
                opacity: fontSize <= minSize ? 0.4 : 1,
              }}
            >
              <NCText variant="titleLg" style={{ color: C.white }}>A−</NCText>
            </Pressable>
            <NCText variant="headlineMd" style={{ color: C.white, fontSize: Math.min(fontSize + 8, 32) }}>
              Aa {fontSize}
            </NCText>
            <Pressable
              onPress={() => bumpFont(1)}
              disabled={fontSize >= maxSize}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderWidth: 1,
                borderColor: C.inputBorder,
                borderRadius: 10,
                opacity: fontSize >= maxSize ? 0.4 : 1,
              }}
            >
              <NCText variant="titleLg" style={{ color: C.white }}>A+</NCText>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {READER_FONT_SIZES.map((size) => {
              const active = size === fontSize;
              return (
                <Pressable
                  key={size}
                  onPress={() => setFontSize(size)}
                  style={{
                    minWidth: '15%',
                    flexGrow: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: active ? C.white : C.inputBorder,
                    backgroundColor: active ? C.pillBg : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <NCText variant="uiLabelXs" style={{ color: active ? C.white : C.muted, fontSize: 11 }}>
                    {size}
                  </NCText>
                </Pressable>
              );
            })}
          </View>
        </DarkSurface>

        <DarkSurface style={{ padding: 16, gap: 12 }}>
          <StudioSectionLabel>TYPE FAMILY</StudioSectionLabel>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            {READER_FAMILIES.map((key) => {
              const active = fontFamilyKind === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setFontFamily(key)}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: active ? C.white : C.inputBorder,
                    backgroundColor: active ? C.pillBg : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <NCText
                    style={{
                      color: C.white,
                      fontFamily: key === 'serif' ? fontFamily.serif : fontFamily.sans,
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                  >
                    {key === 'serif' ? 'Serif' : 'Sans'}
                  </NCText>
                  <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>
                    {key === 'serif' ? 'Newsreader' : 'Manrope'}
                  </NCText>
                </Pressable>
              );
            })}
          </View>
        </DarkSurface>
      </ScrollView>
    </StudioScreen>
  );
}
