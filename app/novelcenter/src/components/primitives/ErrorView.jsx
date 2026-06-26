import React from 'react';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import Button from '@/components/primitives/Button';
import { useTheme } from '@/theme';

export default function ErrorView({ error, onRetry, style }) {
  const t = useTheme();
  const msg = error?.message || (typeof error === 'string' ? error : 'Something went wrong.');
  return (
    <View style={[{ alignItems: 'center', padding: 32, gap: 12 }, style]}>
      <Icon name="error-outline" size={36} color={t.colors.error} />
      <NCText variant="headlineSm" align="center">A small problem.</NCText>
      <NCText variant="body" tone="muted" align="center">{msg}</NCText>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}
