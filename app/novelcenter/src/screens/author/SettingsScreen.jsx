import React, { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import IconButton from '@/components/primitives/IconButton';
import Avatar from '@/components/primitives/Avatar';
import Input from '@/components/primitives/Input';
import Button from '@/components/primitives/Button';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

export default function SettingsScreen({ navigation }) {
  const t = useTheme();
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

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <NCText variant="uiLabelSm" tone="muted">Studio</NCText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64, gap: 24 }}>
          <NCText variant="headlineXl">Settings</NCText>

          <View style={{ alignItems: 'center', gap: 10 }}>
            <Avatar name={displayName} source={avatarUrl} size={88} />
            <NCText variant="uiLabelSm" tone="muted">Avatar URL is optional.</NCText>
          </View>

          <Input label="Display name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={6}
            autoCapitalize="sentences"
            autoCorrect
          />
          <Input
            label="Avatar URL"
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="https://..."
            autoCapitalize="none"
          />

          <Button label="Save profile" onPress={save} loading={busy} full size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
