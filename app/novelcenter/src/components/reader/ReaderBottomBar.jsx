import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';

export default function ReaderBottomBar({ prev, next, onPrev, onNext, label }) {
  const t = useTheme({ readerScope: true });
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: t.colors.bg + 'F0',
        borderTopWidth: 1,
        borderTopColor: t.colors.rule,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 56 }}>
        <Pressable
          disabled={!prev}
          onPress={onPrev}
          hitSlop={6}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: prev ? 1 : 0.4 }}
        >
          <Icon name="chevron-left" size={20} color={t.colors.fg} />
          <NCText variant="uiLabelSm" style={{ color: t.colors.fg }} numberOfLines={1}>
            {prev ? prev.title : 'Prev'}
          </NCText>
        </Pressable>

        <NCText variant="uiLabelXs" style={{ color: t.colors.muted, maxWidth: '36%' }} numberOfLines={1} align="center">
          {label || (prev || next ? 'Reader' : 'End of book')}
        </NCText>

        <Pressable
          disabled={!next}
          onPress={onNext}
          hitSlop={6}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: next ? 1 : 0.4 }}
        >
          <NCText variant="uiLabelSm" style={{ color: t.colors.fg }} numberOfLines={1}>
            {next ? next.title : 'Next'}
          </NCText>
          <Icon name="chevron-right" size={20} color={t.colors.fg} />
        </Pressable>
      </View>
    </View>
  );
}
