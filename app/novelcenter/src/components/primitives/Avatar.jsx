import React from 'react';
import { Image, View } from 'react-native';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';
import { resolveImageUrl } from '@/lib/image';

export default function Avatar({ name, source, size = 36, style }) {
  const t = useTheme();
  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  const uri = resolveImageUrl(source);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t.colors.surfaceLow,
          borderWidth: 1,
          borderColor: t.colors.containerHigh,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <NCText variant="uiLabelSm" tone="muted">
          {initials || '?'}
        </NCText>
      )}
    </View>
  );
}
