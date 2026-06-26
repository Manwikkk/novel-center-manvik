import React from 'react';
import { TextInput, View } from 'react-native';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  numberOfLines,
  autoCapitalize = 'none',
  autoCorrect = false,
  keyboardType,
  error,
  style,
  inputStyle,
  ...rest
}) {
  const t = useTheme();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <NCText variant="uiLabelSm" tone="muted">
          {label}
        </NCText>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        placeholderTextColor={t.colors.muted}
        cursorColor={t.colors.fg}
        selectionColor={t.colors.accent}
        style={[
          {
            ...t.typography.body,
            color: t.colors.fg,
            paddingHorizontal: 14,
            paddingVertical: multiline ? 12 : 12,
            minHeight: multiline ? 96 : 46,
            textAlignVertical: multiline ? 'top' : 'center',
            backgroundColor: t.colors.surfaceLow,
            borderWidth: 1,
            borderColor: error ? t.colors.error : t.colors.containerHigh,
            borderRadius: t.radii.sm,
          },
          inputStyle,
        ]}
        {...rest}
      />
      {error ? (
        <NCText variant="bodySm" style={{ color: t.colors.error }}>
          {error}
        </NCText>
      ) : null}
    </View>
  );
}
