import React from 'react';
import { View } from 'react-native';
import NCText from '@/components/primitives/Text';
import { useReaderPreferences } from '@/hooks/useReaderPreferences';

/** Live preview of the current reader theme, size, and typeface. */
export default function ReaderPrefsPreview() {
  const prefs = useReaderPreferences();

  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: prefs.colors.rule,
        backgroundColor: prefs.colors.bg,
        padding: 18,
        gap: 12,
      }}
    >
      <NCText
        variant="uiLabelSm"
        style={{ color: prefs.colors.muted, letterSpacing: 1, fontSize: 10 }}
      >
        PREVIEW
      </NCText>
      <NCText style={prefs.titleStyle}>The night was still, save for the turning of a page.</NCText>
      <NCText style={prefs.bodyStyle}>
        Adjust theme, size, and typeface here — your choices apply when you read chapters and
        anywhere long-form story text appears in the app.
      </NCText>
    </View>
  );
}
