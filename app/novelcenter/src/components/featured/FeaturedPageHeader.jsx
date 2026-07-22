import React from 'react';
import { View, Pressable, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import Avatar from '@/components/primitives/Avatar';
import { useAppTheme } from '@/theme/discoverColors';

export default function FeaturedPageHeader({
  search,
  onSearchChange,
  searchOpen,
  onToggleSearch,
  onSignInPress,
  user,
}) {
  const { colors: C, fontScale, readingFont } = useAppTheme();

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <NCText
            variant="uiLabelSm"
            style={{ color: C.muted, textTransform: 'none', letterSpacing: 0, fontSize: 13 }}
          >
            Discover
          </NCText>
          <NCText
            variant="headlineXl"
            style={{ color: C.white, fontFamily: readingFont, fontWeight: '700', fontSize: Math.round(28 * fontScale), marginTop: 2 }}
          >
            Books worth your
            slow attention.
          </NCText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={onToggleSearch}
            accessibilityRole="button"
            accessibilityLabel="Search"
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: C.pillBg,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Icon name="search" size={20} color={C.white} />
          </Pressable>

          {user ? (
            <Avatar name={user.displayName} source={user.avatarUrl} size={40} />
          ) : (
            <Pressable
              onPress={onSignInPress}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: C.pillBg,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <NCText
                variant="uiLabelSm"
                style={{ color: C.white, textTransform: 'none', letterSpacing: 0, fontSize: 13 }}
              >
                Sign In
              </NCText>
            </Pressable>
          )}
        </View>
      </View>

      {searchOpen ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: C.inputBg,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: C.inputBorder,
            paddingHorizontal: 14,
            gap: 8,
          }}
        >
          <Icon name="search" size={18} color={C.muted} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search titles, authors..."
            placeholderTextColor={C.muted}
            autoFocus
            style={{
              flex: 1,
              color: C.white,
              fontFamily: readingFont,
              fontSize: Math.round(15 * fontScale),
              paddingVertical: 12,
            }}
          />
          {search ? (
            <Pressable onPress={() => onSearchChange('')} hitSlop={8}>
              <Icon name="close" size={18} color={C.muted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
