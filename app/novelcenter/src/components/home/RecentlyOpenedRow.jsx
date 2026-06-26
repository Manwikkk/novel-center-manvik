import React from 'react';
import { View, Pressable } from 'react-native';
import Cover from '@/components/primitives/Cover';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';

export default function RecentlyOpenedRow({ entry, onPress }) {
  const t = useTheme();
  const percent = Math.max(0, Math.min(100, Number(entry?.percent) || 0));
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
      <Cover source={entry?.book?.coverUrl} width={64} />
      <View style={{ flex: 1, gap: 4, paddingTop: 2 }}>
        <NCText variant="titleLg" numberOfLines={2}>{entry?.book?.title}</NCText>
        <NCText variant="uiLabelXs" tone="muted" numberOfLines={1}>
          {entry?.book?.authorName}
        </NCText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: t.colors.containerHigh, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${percent}%`, backgroundColor: t.colors.fg }} />
          </View>
          <NCText variant="uiLabelXs" tone="muted">{percent}%</NCText>
        </View>
      </View>
    </Pressable>
  );
}
