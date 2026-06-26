import React from 'react';
import { View, Pressable } from 'react-native';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';

export default function SectionHeader({ title, subtitle, action, onAction }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <NCText variant="headlineMd">{title}</NCText>
        {subtitle ? (
          <NCText variant="uiLabelSm" tone="muted" style={{ marginTop: 4 }}>
            {subtitle}
          </NCText>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <NCText variant="uiLabelSm" style={{ borderBottomWidth: 1, borderBottomColor: t.colors.fg, paddingBottom: 2 }}>
            {action}
          </NCText>
        </Pressable>
      ) : null}
    </View>
  );
}
