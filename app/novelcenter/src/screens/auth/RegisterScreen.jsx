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
import RolePicker from '@/components/auth/RolePicker';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useWalletStore } from '@/stores/walletStore';
import { useTheme } from '@/theme';

function TermsCheckbox({ checked, onChange, t }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: checked ? t.colors.fg : t.colors.containerHigh,
          backgroundColor: checked ? t.colors.fg : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        {checked ? (
          <NCText variant="uiLabelXs" style={{ color: t.colors.cream100, fontSize: 12 }}>✓</NCText>
        ) : null}
      </View>
      <NCText variant="bodySm" tone="muted" style={{ flex: 1, lineHeight: 18 }}>
        I agree to the Terms &amp; Conditions and Privacy Policy.
      </NCText>
    </Pressable>
  );
}

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
  const refreshWallet = useWalletStore((s) => s.refresh);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const next = {};
    if (!displayName.trim()) next.displayName = 'Username is required.';
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.';
    if (!acceptedTerms) next.terms = 'You must accept the Terms & Conditions and Privacy Policy.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    setError(null);
    if (!validate()) return;
    if (!email.includes('@')) {
      setError('Please use a valid email.');
      return;
    }
    try {
      const user = await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        role,
      });
      await refreshWallet().catch(() => {});
      pushToast({ type: 'success', title: 'Account created', message: 'Welcome to Novel Centre.' });
      if (user?.role === 'author') {
        navigation.getParent()?.navigate('AccountTab', { screen: 'AuthorStudio' });
      }
    } catch (err) {
      const msg = err?.message || 'Could not create account.';
      setError(msg);
      pushToast({ type: 'error', title: 'Registration failed', message: msg });
    }
  };

  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== password;

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
            <NCText variant="uiLabelSm" tone="muted">Join the centre</NCText>
            <NCText variant="displayLg">Start your next obsession.</NCText>
            <NCText variant="body" tone="muted">
              Whether you read serialized fiction or publish your own chapters, Novel Centre keeps the experience focused.
            </NCText>
          </View>

          <View style={{ gap: 16 }}>
            <Input
              label="Username"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your username"
              autoCapitalize="words"
              error={fieldErrors.displayName}
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
              error={fieldErrors.password}
            />
            <Input
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              secureTextEntry
              error={fieldErrors.confirmPassword || (passwordsMismatch ? 'Passwords do not match.' : undefined)}
            />

            <TermsCheckbox checked={acceptedTerms} onChange={setAcceptedTerms} t={t} />
            {fieldErrors.terms ? (
              <NCText variant="bodySm" style={{ color: t.colors.error, marginTop: -8 }}>
                {fieldErrors.terms}
              </NCText>
            ) : null}

            <RolePicker value={role} onChange={setRole} dark={false} />

            {error ? (
              <NCText variant="bodySm" style={{ color: t.colors.error }}>{error}</NCText>
            ) : null}

            <Button label={busy ? 'Creating account…' : 'Create account'} onPress={onSubmit} loading={busy} full size="lg" />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <NCText variant="body" tone="muted">Already with us?</NCText>
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
