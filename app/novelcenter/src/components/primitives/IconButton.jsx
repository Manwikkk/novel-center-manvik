import React from 'react';
import { Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@/theme';

export default function IconButton({
  name,
  onPress,
  size = 22,
  color,
  active = false,
  accessibilityLabel,
  style,
}) {
  const t = useTheme();
  const tint = color || (active ? t.colors.fg : t.colors.muted);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      android_ripple={{ color: '#0001', borderless: true, radius: 18 }}
      style={({ pressed }) => [
        {
          padding: 6,
          borderRadius: 999,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Icon name={name} size={size} color={tint} />
    </Pressable>
  );
}
