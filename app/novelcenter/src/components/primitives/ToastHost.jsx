import React from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NCText from '@/components/primitives/Text';
import { useTheme } from '@/theme';
import { useUiStore } from '@/stores/uiStore';

export default function ToastHost() {
  const t = useTheme();
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        gap: 8,
        zIndex: 1000,
      }}
    >
      {toasts.map((toast) => {
        const accent =
          toast.type === 'error' ? t.colors.error : toast.type === 'success' ? t.colors.fg : t.colors.muted;
        return (
          <Pressable
            key={toast.id}
            onPress={() => dismiss(toast.id)}
            style={[
              {
                backgroundColor: t.colors.surface,
                borderRadius: t.radii.md,
                padding: 12,
                borderWidth: 1,
                borderColor: accent,
              },
              t.shadows.modal,
            ]}
          >
            {toast.title ? (
              <NCText variant="uiLabelSm" style={{ color: accent }}>
                {toast.title}
              </NCText>
            ) : null}
            {toast.message ? (
              <NCText variant="bodySm" tone="muted" style={{ marginTop: toast.title ? 4 : 0 }}>
                {toast.message}
              </NCText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
