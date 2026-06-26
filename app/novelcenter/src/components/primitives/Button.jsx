import React from 'react';
import { Pressable, ActivityIndicator, View } from 'react-native';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';

/**
 * Editorial button. Variants:
 *   - primary  : ink fill on cream text (matches the web's `bg-ink-900`)
 *   - secondary: outlined on cream
 *   - ghost    : no border, label only
 */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  full = false,
  size = 'md',
  /** Typography preset for label (see theme typography keys). Smaller fits narrow split buttons. */
  labelVariant = 'uiLabelLg',
  labelNumberOfLines = 2,
  style,
}) {
  const t = useTheme();

  const padding = size === 'sm'
    ? { paddingVertical: 10, paddingHorizontal: 16 }
    : size === 'lg'
      ? { paddingVertical: 16, paddingHorizontal: 28 }
      : { paddingVertical: 13, paddingHorizontal: 22 };

  const palettes = {
    primary: {
      bg: t.colors.ink900,
      border: t.colors.ink900,
      text: t.colors.cream100,
    },
    secondary: {
      bg: 'transparent',
      border: t.colors.ink900,
      text: t.colors.ink900,
    },
    ghost: {
      bg: 'transparent',
      border: 'transparent',
      text: t.colors.ink900,
    },
    danger: {
      bg: t.colors.error,
      border: t.colors.error,
      text: '#fff',
    },
  };

  const p = palettes[variant] || palettes.primary;
  const isOff = disabled || loading;

  return (
    <Pressable
      onPress={isOff ? undefined : onPress}
      disabled={isOff}
      android_ripple={{ color: '#0001' }}
      style={({ pressed }) => [
        {
          ...padding,
          backgroundColor: p.bg,
          borderColor: p.border,
          borderWidth: 1,
          borderRadius: t.radii.sm,
          alignSelf: full ? 'stretch' : 'flex-start',
          ...(full ? { width: '100%', minWidth: 0 } : {}),
          opacity: isOff ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 0 }}>
        {loading ? <ActivityIndicator color={p.text} size="small" /> : null}
        {icon && !loading ? icon : null}
        <NCText
          variant={labelVariant}
          style={{ color: p.text, flexShrink: 1, textAlign: 'center' }}
          numberOfLines={labelNumberOfLines}
          ellipsizeMode={labelNumberOfLines === 1 ? 'tail' : undefined}
        >
          {label}
        </NCText>
      </View>
    </Pressable>
  );
}
