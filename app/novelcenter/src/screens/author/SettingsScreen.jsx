import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import NCText from '@/components/primitives/Text';
import Avatar from '@/components/primitives/Avatar';
import {
  StudioScreen,
  StudioHeader,
  StudioInput,
  StudioPrimaryButton,
  StudioOutlineButton,
  StudioSectionLabel,
  STUDIO_LAYOUT,
  useAppTheme,
} from '@/components/studio/StudioTheme';
import { DarkSurface } from '@/components/discover/DiscoverTheme';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';


export default function SettingsScreen({ navigation }) {
  const { colors: C } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const pushToast = useUiStore((s) => s.pushToast);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const payload = { displayName: displayName.trim() };
      if (bio !== undefined) payload.bio = bio?.trim() || '';
      if (avatarUrl?.trim()) payload.avatarUrl = avatarUrl.trim();
      const data = await api.patch('/auth/me', payload);
      setUser(data.user);
      pushToast({ type: 'success', title: 'Profile saved' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not save', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setDisplayName(user?.displayName || '');
    setBio(user?.bio || '');
    setAvatarUrl(user?.avatarUrl || '');
  };

  return (
    <StudioScreen>
      <StudioHeader breadcrumb="Author Studio" title="Settings" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: STUDIO_LAYOUT.hPadding, paddingBottom: 64, gap: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 10 }}>
            <StudioSectionLabel>ACCOUNT</StudioSectionLabel>
            <DarkSurface style={{ padding: 16, gap: 8 }}>
              <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11 }}>Email</NCText>
              <NCText variant="bodySm" style={{ color: C.white }}>{user?.email}</NCText>
              <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>Role</NCText>
              <NCText variant="bodySm" style={{ color: C.white, textTransform: 'capitalize' }}>{user?.role}</NCText>
            </DarkSurface>
          </View>

          <View style={{ gap: 10 }}>
            <StudioSectionLabel>PUBLIC PROFILE</StudioSectionLabel>
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
              <Avatar name={displayName} source={avatarUrl} size={88} />
              <NCText variant="uiLabelSm" style={{ color: C.muted, fontSize: 11 }}>
                Avatar URL is optional
              </NCText>
            </View>
          </View>

          <StudioInput label="Display name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
          <StudioInput
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={6}
            autoCapitalize="sentences"
            placeholder="Tell readers about yourself…"
          />
          <StudioInput
            label="Avatar URL"
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="https://…"
            autoCapitalize="none"
          />

          <StudioPrimaryButton label="Save profile" onPress={save} loading={busy} />
          <StudioOutlineButton label="Reset" onPress={reset} />
        </ScrollView>
      </KeyboardAvoidingView>
    </StudioScreen>
  );
}
