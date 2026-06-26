import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import IconButton from '@/components/primitives/IconButton';
import Card from '@/components/primitives/Card';
import { useTheme } from '@/theme';
import { useReaderStore, READER_FONT_SIZES, READER_FAMILIES, READER_THEMES } from '@/stores/readerStore';

export default function ReaderPrefsScreen({ navigation }) {
  const t = useTheme();
  const fontSize = useReaderStore((s) => s.fontSize);
  const fontFamily = useReaderStore((s) => s.fontFamily);
  const theme = useReaderStore((s) => s.theme);
  const setFontFamily = useReaderStore((s) => s.setFontFamily);
  const setTheme = useReaderStore((s) => s.setTheme);
  const bumpFont = useReaderStore((s) => s.bumpFont);

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <NCText variant="uiLabelSm" tone="muted">Account</NCText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64, gap: 24 }}>
        <NCText variant="headlineXl">Reader preferences</NCText>

        <Card>
          <NCText variant="uiLabelSm" tone="muted">Theme</NCText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {READER_THEMES.map((key) => {
              const active = theme === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTheme(key)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: t.radii.sm,
                    borderWidth: 1,
                    borderColor: active ? t.colors.fg : t.colors.containerHigh,
                    backgroundColor: active ? t.colors.surfaceLow : 'transparent',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Icon
                    name={key === 'cream' ? 'wb-sunny' : key === 'sepia' ? 'menu-book' : 'nightlight-round'}
                    size={20}
                    color={t.colors.fg}
                  />
                  <NCText variant="uiLabelXs" style={{ textTransform: 'uppercase' }}>{key}</NCText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card>
          <NCText variant="uiLabelSm" tone="muted">Type size</NCText>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <Pressable
              onPress={() => bumpFont(-1)}
              style={{
                paddingVertical: 12, paddingHorizontal: 18,
                borderWidth: 1, borderColor: t.colors.containerHigh, borderRadius: t.radii.sm,
              }}
            >
              <NCText variant="titleLg">A−</NCText>
            </Pressable>
            <NCText variant="displayLg" style={{ fontSize }}>Aa {fontSize}</NCText>
            <Pressable
              onPress={() => bumpFont(1)}
              style={{
                paddingVertical: 12, paddingHorizontal: 18,
                borderWidth: 1, borderColor: t.colors.containerHigh, borderRadius: t.radii.sm,
              }}
            >
              <NCText variant="titleLg">A+</NCText>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'space-between' }}>
            {READER_FONT_SIZES.map((size) => {
              const active = size === fontSize;
              return (
                <Pressable
                  key={size}
                  onPress={() => useReaderStore.setState({ fontSize: size })}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: t.radii.sm,
                    borderWidth: 1,
                    borderColor: active ? t.colors.fg : t.colors.containerHigh,
                    backgroundColor: active ? t.colors.surfaceLow : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <NCText variant="uiLabelXs">{size}</NCText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card>
          <NCText variant="uiLabelSm" tone="muted">Type family</NCText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {READER_FAMILIES.map((key) => {
              const active = fontFamily === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setFontFamily(key)}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: t.radii.sm,
                    borderWidth: 1,
                    borderColor: active ? t.colors.fg : t.colors.containerHigh,
                    backgroundColor: active ? t.colors.surfaceLow : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <NCText
                    variant={key === 'serif' ? 'titleLg' : 'titleMd'}
                    style={{ fontFamily: key === 'serif' ? t.fontFamily.serif : t.fontFamily.sans }}
                  >
                    {key === 'serif' ? 'Serif (Newsreader)' : 'Sans (Manrope)'}
                  </NCText>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
