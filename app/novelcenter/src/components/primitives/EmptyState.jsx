import React from 'react';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import Button from '@/components/primitives/Button';
import { useTheme } from '@/theme';

export default function EmptyState({
  icon = 'auto_stories',
  title,
  description,
  action,
  onAction,
  style,
}) {
  const t = useTheme();
  return (
    <View style={[{ alignItems: 'center', padding: 32, gap: 12 }, style]}>
      <Icon name={icon} size={36} color={t.colors.muted} />
      {title ? <NCText variant="headlineSm" align="center">{title}</NCText> : null}
      {description ? (
        <NCText variant="body" tone="muted" align="center">
          {description}
        </NCText>
      ) : null}
      {action && onAction ? <Button label={action} onPress={onAction} variant="primary" /> : null}
    </View>
  );
}
