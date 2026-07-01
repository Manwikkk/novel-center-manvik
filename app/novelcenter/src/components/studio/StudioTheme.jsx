import React from 'react';
import { View, Pressable, TextInput, StatusBar, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import { useAppTheme, DISCOVER_LAYOUT } from '@/theme/discoverColors';

export function StudioScreen({ children, edges = ['top'] }) {
  const insets = useSafeAreaInsets();
  const { colors: C, statusBarStyle } = useAppTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.bg,
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
      }}
    >
      <StatusBar barStyle={statusBarStyle} backgroundColor={C.bg} />
      {children}
    </View>
  );
}

export function StudioHeader({ breadcrumb, title, onBack, right }) {
  const { colors: C } = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: DISCOVER_LAYOUT.hPadding,
        paddingVertical: 8,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={{ padding: 4 }}>
            <Icon name="arrow-back" size={22} color={C.white} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          {breadcrumb ? (
            <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
              {breadcrumb}
            </NCText>
          ) : null}
          {title ? (
            <NCText variant="headlineSm" numberOfLines={1} style={{ color: C.white, fontWeight: '700', fontSize: 18 }}>
              {title}
            </NCText>
          ) : null}
        </View>
      </View>
      {right || null}
    </View>
  );
}

export function StudioSectionLabel({ children }) {
  const { colors: C } = useAppTheme();
  return (
    <NCText variant="uiLabelSm" style={{ color: C.muted, letterSpacing: 1.2, fontSize: 10 }}>
      {children}
    </NCText>
  );
}

export function StudioStatCard({ label, value, sub }) {
  const { colors: C } = useAppTheme();
  return (
    <DarkSurface style={{ flex: 1, padding: 14, gap: 4 }}>
      <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 10, letterSpacing: 0.8 }}>
        {label}
      </NCText>
      <NCText variant="headlineMd" style={{ color: C.white, fontWeight: '700', fontSize: 22 }}>
        {value}
      </NCText>
      {sub ? (
        <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 10 }}>
          {sub}
        </NCText>
      ) : null}
    </DarkSurface>
  );
}

export function StudioMenuRow({ icon, label, sub, onPress, tone, first }) {
  const { colors: C } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: C.inputBorder,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icon name={icon} size={22} color={tone === 'error' ? C.error : C.white} />
      <View style={{ flex: 1, gap: 2 }}>
        <NCText variant="titleMd" style={{ color: tone === 'error' ? C.error : C.white, fontSize: 15 }}>
          {label}
        </NCText>
        {sub ? (
          <NCText variant="uiLabelXs" style={{ color: C.muted, fontSize: 11 }}>
            {sub}
          </NCText>
        ) : null}
      </View>
      {onPress ? <Icon name="chevron-right" size={22} color={C.muted} /> : null}
    </Pressable>
  );
}

export function StudioPillTabs({ tabs, activeKey, onChange }) {
  const { colors: C } = useAppTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 6,
              backgroundColor: active ? C.white : 'transparent',
              borderWidth: active ? 0 : 1,
              borderColor: C.inputBorder,
            }}
          >
            <NCText
              variant="uiLabelSm"
              style={{
                color: active ? C.bg : C.muted,
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 0.5,
              }}
            >
              {tab.label}
            </NCText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function StudioInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
  keyboardType,
  autoCapitalize = 'none',
  style,
}) {
  const { colors: C, fontScale, readingFont } = useAppTheme();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, letterSpacing: 0.8 }}>
          {label}
        </NCText>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={{
          color: C.white,
          fontFamily: readingFont,
          fontSize: Math.round(15 * fontScale),
          lineHeight: multiline ? Math.round(22 * fontScale) : undefined,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 12,
          minHeight: multiline ? 96 : 46,
          textAlignVertical: multiline ? 'top' : 'center',
          backgroundColor: C.inputBg,
          borderWidth: 1,
          borderColor: C.inputBorder,
          borderRadius: 10,
        }}
      />
    </View>
  );
}

export function StudioPrimaryButton({ label, onPress, loading, disabled, icon }) {
  const { colors: C } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: C.white,
        borderRadius: 999,
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled || loading ? 0.55 : pressed ? 0.88 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={18} color={C.bg} /> : null}
      <NCText variant="uiLabelSm" style={{ color: C.bg, fontWeight: '700', letterSpacing: 0.5 }}>
        {loading ? 'Please wait…' : label}
      </NCText>
    </Pressable>
  );
}

export function StudioOutlineButton({ label, onPress, tone }) {
  const { colors: C } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 999,
        paddingVertical: 12,
        paddingHorizontal: 18,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: tone === 'error' ? C.error : C.inputBorder,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <NCText
        variant="uiLabelSm"
        style={{ color: tone === 'error' ? C.error : C.white, fontWeight: '600', letterSpacing: 0.4 }}
      >
        {label}
      </NCText>
    </Pressable>
  );
}

export function StudioChipGroup({ options, value, onChange }) {
  const { colors: C } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: active ? C.white : C.inputBorder,
              backgroundColor: active ? C.pillBg : 'transparent',
            }}
          >
            <NCText variant="uiLabelXs" style={{ color: active ? C.white : C.muted, fontSize: 11 }}>
              {opt.label}
            </NCText>
          </Pressable>
        );
      })}
    </View>
  );
}

export { DISCOVER_LAYOUT as STUDIO_LAYOUT, useAppTheme };
