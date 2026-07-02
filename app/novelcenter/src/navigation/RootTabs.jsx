import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HomeStack from '@/navigation/HomeStack';
import DiscoverStack from '@/navigation/DiscoverStack';
import LibraryStack from '@/navigation/LibraryStack';
import AccountStack from '@/navigation/AccountStack';
import { useAppTheme } from '@/theme/discoverColors';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'HomeTab', component: HomeStack, label: 'Home', icon: 'home' },
  { name: 'DiscoverTab', component: DiscoverStack, label: 'Discover', icon: 'explore' },
  { name: 'LibraryTab', component: LibraryStack, label: 'Library', icon: 'menu-book' },
  { name: 'AccountTab', component: AccountStack, label: 'Profile', icon: 'person' },
];

const HIDE_TAB_ON = new Set([
  'BookDetail', 'Reader', 'AuthorProfile', 'CollectionDetail', 'AuthorStudio', 'Wallet', 'ReaderPrefs',
  'AuthorDashboard', 'AuthorBooks', 'AuthorBookEdit', 'AuthorChapters', 'AuthorChapterEdit', 'AuthorEarnings', 'AuthorSettings',
]);

function shouldHideTabBar(route) {
  const focused = getFocusedRouteNameFromRoute(route);
  if (focused && HIDE_TAB_ON.has(focused)) return true;
  if (focused?.startsWith?.('Author')) return true;
  return false;
}

export default function RootTabs() {
  const { colors: C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBottomPadding = Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + tabBottomPadding;
  const defaultTabBarStyle = {
    backgroundColor: C.sheet,
    borderTopColor: C.sheetBorder,
    borderTopWidth: 1,
    height: tabBarHeight,
    paddingTop: 6,
    paddingBottom: tabBottomPadding,
  };

  const hideTabBarOption = ({ route }) => ({
    tabBarStyle: shouldHideTabBar(route) ? { display: 'none' } : defaultTabBarStyle,
  });

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => {
        const tab = TABS.find((x) => x.name === route.name);
        return {
          headerShown: false,
          tabBarActiveTintColor: C.white,
          tabBarInactiveTintColor: C.muted,
          tabBarStyle: defaultTabBarStyle,
          tabBarLabelStyle: {
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            fontWeight: '700',
          },
          tabBarIcon: ({ color, size }) => (
            <Icon name={tab?.icon || 'circle'} size={size} color={color} />
          ),
          tabBarLabel: tab?.label,
        };
      }}
    >
      {TABS.map(({ name, component }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={hideTabBarOption}
        />
      ))}
    </Tab.Navigator>
  );
}
