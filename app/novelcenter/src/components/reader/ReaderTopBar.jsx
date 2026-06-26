import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import IconButton from '@/components/primitives/IconButton';
import { useTheme } from '@/theme';
import { useReaderStore, READER_THEMES } from '@/stores/readerStore';

export default function ReaderTopBar({ chapter, book, progress, minutesLeft, onBack }) {
  const t = useTheme({ readerScope: true });
  const insets = useSafeAreaInsets();
  const fontSize = useReaderStore((s) => s.fontSize);
  const bumpFont = useReaderStore((s) => s.bumpFont);
  const theme = useReaderStore((s) => s.theme);
  const setTheme = useReaderStore((s) => s.setTheme);

  const safeProgress = Math.max(0, Math.min(100, progress || 0));

  return (
    <View
      style={{
        backgroundColor: t.colors.bg + 'EE',
        borderBottomWidth: 1,
        borderBottomColor: t.colors.rule,
        paddingTop: insets.top,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
        <Pressable onPress={onBack} hitSlop={8} style={{ padding: 6 }}>
          <Icon name="arrow-back" size={22} color={t.colors.fg} />
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <NCText variant="uiLabelXs" style={{ color: t.colors.muted }} numberOfLines={1}>
            {book?.title || 'Reading'}
          </NCText>
          <NCText variant="titleMd" style={{ color: t.colors.fg }} numberOfLines={1}>
            {chapter?.idx ? `Chapter ${chapter.idx} · ${chapter.title}` : chapter?.title || ''}
          </NCText>
        </View>

        {/* font controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0, borderWidth: 1, borderColor: t.colors.rule, borderRadius: 999, paddingHorizontal: 4 }}>
          <Pressable onPress={() => bumpFont(-1)} hitSlop={4} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
            <NCText variant="uiLabelSm" style={{ color: t.colors.fg, fontSize: 12 }}>A−</NCText>
          </Pressable>
          <NCText variant="uiLabelXs" style={{ color: t.colors.muted, paddingHorizontal: 4 }}>{fontSize}</NCText>
          <Pressable onPress={() => bumpFont(1)} hitSlop={4} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
            <NCText variant="uiLabelSm" style={{ color: t.colors.fg, fontSize: 14 }}>A+</NCText>
          </Pressable>
        </View>
      </View>

      {/* theme pills */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, paddingBottom: 6 }}>
        {READER_THEMES.map((key) => {
          const active = theme === key;
          const icon = key === 'cream' ? 'wb-sunny' : key === 'sepia' ? 'menu-book' : 'nightlight-round';
          return (
            <Pressable
              key={key}
              onPress={() => setTheme(key)}
              hitSlop={6}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? t.colors.fg : t.colors.rule,
                backgroundColor: active ? t.colors.surfaceLow : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name={icon} size={14} color={t.colors.fg} />
              <NCText variant="uiLabelXs" style={{ color: t.colors.fg }}>
                {key.toUpperCase()}
              </NCText>
            </Pressable>
          );
        })}
      </View>

      {/* progress fill + label */}
      <View style={{ height: 2, backgroundColor: t.colors.rule + '99' }}>
        <View style={{ height: '100%', width: `${safeProgress}%`, backgroundColor: t.colors.accent }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 12, paddingTop: 2 }}>
        <NCText variant="uiLabelXs" style={{ color: t.colors.muted, fontSize: 9 }}>
          {Math.round(safeProgress)}%
          {minutesLeft > 0 ? ` · ${minutesLeft} min` : ''}
        </NCText>
      </View>
    </View>
  );
}
