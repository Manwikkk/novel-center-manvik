import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '@/theme';

export default function Skeleton({ width, height = 12, radius = 4, style }) {
  const t = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: t.colors.containerHigh,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonRow({ columns = 4, style }) {
  return (
    <View style={[{ flexDirection: 'row', gap: 12, alignItems: 'center' }, style]}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} height={14} style={{ flex: i === 0 ? 2 : 1 }} />
      ))}
    </View>
  );
}

export function SkeletonCover({ width = 120, ratio = 0.667 }) {
  return <Skeleton width={width} height={width / ratio} radius={4} />;
}
