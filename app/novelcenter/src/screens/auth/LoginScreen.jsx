import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Image,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '@/components/primitives/Screen';
import NCText from '@/components/primitives/Text';
import Input from '@/components/primitives/Input';
import Button from '@/components/primitives/Button';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useTheme } from '@/theme';
import { resolveImageUrl } from '@/lib/image';

export default function LoginScreen({ navigation }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const login = useAuthStore((s) => s.login);
  const busy = useAuthStore((s) => s.busy);
  const pushToast = useUiStore((s) => s.pushToast);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const scrollFormAboveKeyboard = () => {
    requestAnimationFrame(() => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });
  };

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      const msg = err?.message || 'Could not sign in.';
      setError(msg);
      pushToast({ type: 'error', title: 'Sign in failed', message: msg });
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
            paddingTop: 32,
            // Android: KAV alone is unreliable; extra bottom inset keeps password/sign-in scrollable above keyboard.
            paddingBottom:
              Platform.OS === 'android'
                ? Math.max(64, keyboardHeight > 0 ? keyboardHeight + 24 : 64)
                : 64,
            gap: 28,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          <View style={{ alignItems: 'center', marginBottom: 8, gap: 14 }}>
            <Image
              source={{ uri: resolveImageUrl('/images/Novel_Center_Logo.jpeg') }}
              style={{ width: 96, height: 96, borderRadius: 12, borderWidth: 1, borderColor: t.colors.containerHigh }}
              resizeMode="cover"
            />
            <NCText variant="uiLabelSm" tone="muted">Novel Centre</NCText>
            <NCText variant="displayLg" align="center">Welcome back.</NCText>
            <NCText variant="body" tone="muted" align="center">
              Sign in to keep reading where you left off.
            </NCText>
          </View>

          <View style={{ gap: 16 }}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="reader@novelcenter.io"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              onFocus={scrollFormAboveKeyboard}
            />
            {error ? (
              <NCText variant="bodySm" style={{ color: t.colors.error }}>
                {error}
              </NCText>
            ) : null}
            <Button label="Sign in" onPress={onSubmit} loading={busy} full size="lg" />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <NCText variant="body" tone="muted">New to Novel Centre?</NCText>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <NCText variant="uiLabelSm" style={{ borderBottomWidth: 1, borderBottomColor: t.colors.fg, paddingBottom: 1 }}>
                Create an account
              </NCText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
