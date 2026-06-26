import React from 'react';
import { View, Pressable } from 'react-native';
import Cover from '@/components/primitives/Cover';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';

/**
 * Featured "Continue Reading" tile mirroring the web's hero card.
 */
export default function ContinueReadingCard({ entry, onPress }) {
  const t = useTheme();
  if (!entry) return null;
  const minutes = Number(entry.minutesLeft) || 0;
  const percent = Math.max(0, Math.min(100, Number(entry.percent) || 0));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: t.colors.bg,
          borderColor: t.colors.containerHigh,
          borderWidth: 1,
          borderRadius: t.radii.lg,
          padding: 18,
          opacity: pressed ? 0.9 : 1,
          gap: 16,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <NCText variant="uiLabelSm" tone="muted">Continue reading</NCText>
        <NCText variant="uiLabelSm" tone="muted">
          {percent}% {minutes > 0 ? `· ${minutes} min` : ''}
        </NCText>
      </View>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Cover source={entry.book?.coverUrl} width={96} />
        <View style={{ flex: 1, gap: 6 }}>
          <NCText variant="titleLg" numberOfLines={2}>{entry.book?.title}</NCText>
          <NCText variant="uiLabelXs" tone="muted">
            {entry.book?.authorName || 'Unknown author'}
          </NCText>
          {entry.chapter?.title ? (
            <NCText variant="bodySm" tone="muted" numberOfLines={2}>
              {entry.chapter.title}
            </NCText>
          ) : null}
        </View>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: t.colors.containerHigh, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${percent}%`, backgroundColor: t.colors.fg }} />
      </View>
    </Pressable>
  );
}
