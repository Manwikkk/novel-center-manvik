import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import Input from '@/components/primitives/Input';
import Button from '@/components/primitives/Button';
import IconButton from '@/components/primitives/IconButton';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useTheme } from '@/theme';

export default function RegisterScreen({ navigation }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const scrollFormAboveKeyboard = () => {
    requestAnimationFrame(() => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });
  };

  const register = useAuthStore((s) => s.register);
  const busy = useAuthStore((s) => s.busy);
  const pushToast = useUiStore((s) => s.pushToast);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState(null);

  const onSubmit = async () => {
    setError(null);
    if (displayName.trim().length < 2) return setError('Display name needs at least 2 characters.');
    if (!email.includes('@')) return setError('Please use a valid email.');
    if (password.length < 8) return setError('Password needs at least 8 characters.');
    try {
      await register({ displayName: displayName.trim(), email: email.trim(), password, role });
      pushToast({ type: 'success', title: 'Welcome', message: 'Your reading shelf is ready.' });
    } catch (err) {
      const msg = err?.message || 'Could not register.';
      setError(msg);
      pushToast({ type: 'error', title: 'Registration failed', message: msg });
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom:
              Platform.OS === 'android'
                ? Math.max(64, keyboardHeight > 0 ? keyboardHeight + 24 : 64)
                : 64,
            gap: 24,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
            <NCText variant="uiLabelSm" tone="muted" style={{ marginLeft: 4 }}>Back</NCText>
          </View>

          <View style={{ gap: 8 }}>
            <NCText variant="displayLg">Begin your shelf.</NCText>
            <NCText variant="body" tone="muted">
              Reading lives, written down. Create your account to start.
            </NCText>
          </View>

          <View style={{ gap: 16 }}>
            <Input
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Marielle Park"
              autoCapitalize="words"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@novelcenter.io"
              keyboardType="email-address"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              onFocus={scrollFormAboveKeyboard}
            />

            <View style={{ gap: 8 }}>
              <NCText variant="uiLabelSm" tone="muted">I want to</NCText>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { id: 'user', label: 'Read' },
                  { id: 'author', label: 'Write' },
                ].map((opt) => {
                  const active = role === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setRole(opt.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        borderWidth: 1,
                        borderColor: active ? t.colors.fg : t.colors.containerHigh,
                        backgroundColor: active ? t.colors.surfaceLow : 'transparent',
                        borderRadius: t.radii.sm,
                        alignItems: 'center',
                      }}
                    >
                      <NCText variant="uiLabelLg">{opt.label}</NCText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {error ? (
              <NCText variant="bodySm" style={{ color: t.colors.error }}>{error}</NCText>
            ) : null}

            <Button label="Create account" onPress={onSubmit} loading={busy} full size="lg" />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <NCText variant="body" tone="muted">Already have one?</NCText>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <NCText variant="uiLabelSm" style={{ borderBottomWidth: 1, borderBottomColor: t.colors.fg, paddingBottom: 1 }}>
                Sign in
              </NCText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
