import React from 'react';
import { View, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import { useAppTheme, STUDIO_LAYOUT } from '@/components/studio/StudioTheme';

const TABS = [
  { key: 'AuthorDashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'AuthorBooks', label: 'Novels', icon: 'library-books' },
  { key: 'AuthorEarnings', label: 'Income', icon: 'trending-up' },
];

export default function StudioNavBar({ navigation, activeRoute }) {
  const { colors: C } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: C.inputBorder,
        backgroundColor: C.sheet,
        paddingBottom: 8,
        paddingTop: 6,
        paddingHorizontal: STUDIO_LAYOUT.hPadding,
        gap: 8,
      }}
    >
      {TABS.map((tab) => {
        const active = activeRoute === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => navigation.navigate(tab.key)}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 4,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: active ? C.pillBg : 'transparent',
            }}
          >
            <Icon name={tab.icon} size={20} color={active ? C.white : C.muted} />
            <NCText
              variant="uiLabelXs"
              style={{ color: active ? C.white : C.muted, fontSize: 10, fontWeight: active ? '700' : '400' }}
            >
              {tab.label}
            </NCText>
          </Pressable>
        );
      })}
    </View>
  );
}
