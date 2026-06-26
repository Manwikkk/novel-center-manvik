import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@/theme';
import HomeStack from '@/navigation/HomeStack';
import DiscoverStack from '@/navigation/DiscoverStack';
import LibraryStack from '@/navigation/LibraryStack';
import AuthorsStack from '@/navigation/AuthorsStack';
import AccountStack from '@/navigation/AccountStack';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'HomeTab',     component: HomeStack,     label: 'Home',     icon: 'home' },
  { name: 'DiscoverTab', component: DiscoverStack, label: 'Discover', icon: 'explore' },
  { name: 'LibraryTab',  component: LibraryStack,  label: 'Library',  icon: 'menu-book' },
  { name: 'AuthorsTab',  component: AuthorsStack,  label: 'Authors',  icon: 'edit-note' },
  { name: 'AccountTab',  component: AccountStack,  label: 'Account',  icon: 'person' },
];

export default function RootTabs() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Lift tabs above gesture/nav bars + home indicator (fixed height alone hides behind system UI).
  const tabBottomPadding = Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + tabBottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find((x) => x.name === route.name);
        return {
          headerShown: false,
          tabBarActiveTintColor: t.colors.fg,
          tabBarInactiveTintColor: t.colors.muted,
          tabBarStyle: {
            backgroundColor: t.colors.surface,
            borderTopColor: t.colors.containerHigh,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingTop: 6,
            paddingBottom: tabBottomPadding,
          },
          tabBarLabelStyle: {
            fontFamily: t.fontFamily.sansBold,
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          },
          tabBarIcon: ({ color, size }) => (
            <Icon name={tab?.icon || 'circle'} size={size} color={color} />
          ),
          tabBarLabel: tab?.label,
        };
      }}
    >
      {TABS.map(({ name, component }) => (
        <Tab.Screen key={name} name={name} component={component} />
      ))}
    </Tab.Navigator>
  );
}
