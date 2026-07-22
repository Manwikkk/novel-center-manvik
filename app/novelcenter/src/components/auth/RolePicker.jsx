import React from 'react';
import { View, Pressable } from 'react-native';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';

const OPTIONS = [
  { value: 'user', label: 'Read', hint: 'Discover and read novels' },
  { value: 'author', label: 'Write', hint: 'Publish your stories' },
];

export default function RolePicker({ value, onChange, dark = true }) {
  const t = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <NCText
        variant="uiLabelSm"
        tone={dark ? undefined : 'muted'}
        style={dark ? { color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 10 } : undefined}
      >
        I&apos;m here to
      </NCText>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange?.(opt.value)}
              style={({ pressed }) => ({
                flex: 1,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: active
                  ? (dark ? '#FFFFFF' : t.colors.fg)
                  : (dark ? '#333333' : t.colors.containerHigh),
                backgroundColor: active
                  ? (dark ? '#FFFFFF' : t.colors.surfaceLow)
                  : (dark ? '#1A1A1A' : 'transparent'),
                padding: 12,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <NCText
                variant="uiLabelSm"
                style={{
                  color: active
                    ? (dark ? '#000000' : t.colors.fg)
                    : (dark ? '#FFFFFF' : t.colors.fg),
                  letterSpacing: 1,
                  fontSize: 11,
                }}
              >
                {opt.label}
              </NCText>
              <NCText
                variant="bodySm"
                style={{
                  color: active
                    ? (dark ? 'rgba(0,0,0,0.65)' : t.colors.muted)
                    : (dark ? '#9CA3AF' : t.colors.muted),
                  fontSize: 11,
                  lineHeight: 15,
                  marginTop: 4,
                }}
              >
                {opt.hint}
              </NCText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
