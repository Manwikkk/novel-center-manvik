import React from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '@/theme';
import { resolveImageUrl } from '@/lib/image';

export default function Cover({ source, width = 96, ratio = 0.667, radius = 4, style, alt }) {
  const t = useTheme();
  const uri = resolveImageUrl(source);
  const height = width / ratio;
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: t.colors.containerHigh,
          borderWidth: 1,
          borderColor: t.colors.containerHigh,
        },
        t.shadows.book,
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          accessible
          accessibilityLabel={alt}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
}
