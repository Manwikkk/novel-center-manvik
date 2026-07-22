import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NCText from '@/components/primitives/Text';
import RolePicker from '@/components/auth/RolePicker';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useWalletStore } from '@/stores/walletStore';
import { useAppTheme } from '@/theme/discoverColors';

const LOGIN_STEPS = 2;
const REGISTER_STEPS = 5;

function DarkField({ label, value, onChangeText, placeholder, hint, ...props }) {
  const { colors: C, fontScale, readingFont } = useAppTheme();
  return (
    <View style={{ gap: 8 }}>
      <NCText
        variant="uiLabelSm"
        style={{ color: C.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 10 }}
      >
        {label}
      </NCText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        cursorColor={C.white}
        selectionColor={C.muted}
        style={{
          color: C.white,
          fontFamily: readingFont,
          fontSize: Math.round(16 * fontScale),
          paddingHorizontal: 14,
          paddingVertical: 14,
          minHeight: 50,
          backgroundColor: C.inputBg,
          borderWidth: 1,
          borderColor: C.inputBorder,
          borderRadius: 14,
        }}
        {...props}
      />
      {hint ? (
        <NCText variant="bodySm" style={{ color: C.muted, fontSize: 12 }}>
          {hint}
        </NCText>
      ) : null}
    </View>
  );
}

function StepDots({ step, total }) {
  const { colors: C } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === step ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === step ? C.white : C.inputBorder,
          }}
        />
      ))}
    </View>
  );
}

function TermsCheckbox({ checked, onChange }) {
  const { colors: C } = useAppTheme();
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
          borderColor: checked ? C.white : C.inputBorder,
          backgroundColor: checked ? C.white : C.inputBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}
      >
        {checked ? <Icon name="check" size={14} color={C.bg} /> : null}
      </View>
      <NCText variant="bodySm" style={{ color: C.muted, flex: 1, lineHeight: 18, fontSize: 12 }}>
        I agree to the{' '}
        <NCText style={{ color: C.white, fontWeight: '600' }}>Terms &amp; Conditions</NCText>
        {' '}and{' '}
        <NCText style={{ color: C.white, fontWeight: '600' }}>Privacy Policy</NCText>.
      </NCText>
    </Pressable>
  );
}

export default function SignInModal({ visible, onClose, initialMode = 'login' }) {
  const { colors: C } = useAppTheme();
  const navigation = useNavigation();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const busy = useAuthStore((s) => s.busy);
  const pushToast = useUiStore((s) => s.pushToast);
  const refreshWallet = useWalletStore((s) => s.refresh);

  const [mode, setMode] = useState('login');
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('user');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState(null);

  const totalSteps = mode === 'login' ? LOGIN_STEPS : REGISTER_STEPS;
  const isLastStep = step === totalSteps - 1;
  const isFinishStep = mode === 'register' && step === 4;

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setStep(0);
      setError(null);
    }
  }, [visible, initialMode]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setRole('user');
    setAcceptedTerms(false);
    setError(null);
    setStep(0);
    setMode('login');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setStep(0);
    setError(null);
  };

  const validateStep = () => {
    if (mode === 'login') {
      if (step === 0 && (!email.trim() || !email.includes('@'))) return 'Enter a valid email.';
      if (step === 1 && !password) return 'Password is required.';
      return null;
    }

    switch (step) {
      case 0:
        if (!displayName.trim()) return 'Username is required.';
        if (displayName.trim().length < 2) return 'Username needs at least 2 characters.';
        return null;
      case 1:
        if (!email.trim() || !email.includes('@')) return 'Enter a valid email.';
        return null;
      case 2:
        if (password.length < 8) return 'Password must be at least 8 characters.';
        return null;
      case 3:
        if (confirmPassword !== password) return 'Passwords do not match.';
        return null;
      case 4:
        if (!acceptedTerms) return 'You must accept the Terms & Conditions and Privacy Policy.';
        return null;
      default:
        return null;
    }
  };

  const goHomeAfterAuth = () => {
    const tabNav = navigation.getParent();
    if (tabNav?.getState?.()?.type === 'tab') {
      tabNav.navigate('HomeTab');
    }
  };

  const onSubmitLogin = async () => {
    try {
      await login({ email: email.trim(), password });
      await refreshWallet().catch(() => {});
      pushToast({ type: 'success', title: 'Welcome back', message: 'You are signed in.' });
      handleClose();
      goHomeAfterAuth();
    } catch (err) {
      setError(err?.message || 'Could not sign in.');
    }
  };

  const onSubmitRegister = async () => {
    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        role,
      });
      await refreshWallet().catch(() => {});
      pushToast({ type: 'success', title: 'Account created', message: 'Welcome to Novel Centre.' });
      handleClose();
      goHomeAfterAuth();
    } catch (err) {
      setError(err?.message || 'Could not create account.');
    }
  };

  const onPrimaryPress = async () => {
    setError(null);
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }
    if (mode === 'login') await onSubmitLogin();
    else await onSubmitRegister();
  };

  const onBack = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const registerCopy = [
    { title: 'Create account', subtitle: 'Choose a username for your shelf.' },
    { title: 'Your email', subtitle: 'Where can we reach you?' },
    { title: 'Choose password', subtitle: 'At least 8 characters.' },
    { title: 'Confirm password', subtitle: 'Re-enter your password.' },
    { title: 'Almost there', subtitle: 'Tell us how you will use Novel Centre.' },
  ];

  const title = mode === 'login'
    ? step === 0 ? 'Sign in' : 'Enter password'
    : registerCopy[step]?.title;

  const subtitle = mode === 'login'
    ? step === 0 ? 'Start with your email address.' : `Signing in as ${email.trim()}`
    : registerCopy[step]?.subtitle;

  const primaryLabel = isLastStep
    ? (mode === 'login' ? 'Sign in' : 'Create account')
    : 'Next';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={{ flex: 1, backgroundColor: C.overlay }} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: C.sheet,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: C.sheetBorder,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 20,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                {step > 0 ? (
                  <Pressable
                    onPress={onBack}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: C.pillBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <Icon name="arrow-back" size={18} color={C.white} />
                  </Pressable>
                ) : (
                  <View style={{ width: 36 }} />
                )}

                <StepDots step={step} total={totalSteps} />

                <Pressable
                  onPress={handleClose}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: C.pillBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Icon name="close" size={18} color={C.white} />
                </Pressable>
              </View>

              <View style={{ gap: 6, marginBottom: 18 }}>
                <NCText
                  variant="uiLabelSm"
                  style={{ color: C.muted, textTransform: 'none', letterSpacing: 0, fontSize: 12 }}
                >
                  Novel Centre
                </NCText>
                <NCText variant="headlineSm" style={{ color: C.white, fontWeight: '700', fontSize: 22 }}>
                  {title}
                </NCText>
                <NCText variant="bodySm" style={{ color: C.muted, lineHeight: 20 }}>
                  {subtitle}
                </NCText>
              </View>

              {isFinishStep ? (
                <View style={{ gap: 16 }}>
                  <RolePicker value={role} onChange={setRole} dark />
                  <TermsCheckbox checked={acceptedTerms} onChange={setAcceptedTerms} />
                </View>
              ) : mode === 'login' && step === 0 ? (
                <DarkField
                  label="Email"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(null); }}
                  placeholder="reader@novelcenter.io"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={onPrimaryPress}
                  returnKeyType="next"
                />
              ) : mode === 'login' && step === 1 ? (
                <DarkField
                  label="Password"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(null); }}
                  placeholder="••••••••"
                  secureTextEntry
                  autoFocus
                  onSubmitEditing={onPrimaryPress}
                  returnKeyType="done"
                />
              ) : mode === 'register' && step === 0 ? (
                <DarkField
                  label="Username"
                  value={displayName}
                  onChangeText={(v) => { setDisplayName(v); setError(null); }}
                  placeholder="Your username"
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={onPrimaryPress}
                  returnKeyType="next"
                />
              ) : mode === 'register' && step === 1 ? (
                <DarkField
                  label="Email"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(null); }}
                  placeholder="reader@novelcenter.io"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={onPrimaryPress}
                  returnKeyType="next"
                />
              ) : mode === 'register' && step === 2 ? (
                <DarkField
                  label="Password"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(null); }}
                  placeholder="••••••••"
                  secureTextEntry
                  hint="At least 8 characters."
                  autoFocus
                  onSubmitEditing={onPrimaryPress}
                  returnKeyType="next"
                />
              ) : mode === 'register' && step === 3 ? (
                <DarkField
                  label="Confirm password"
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); setError(null); }}
                  placeholder="••••••••"
                  secureTextEntry
                  autoFocus
                  onSubmitEditing={onPrimaryPress}
                  returnKeyType="next"
                />
              ) : null}

              {error ? (
                <NCText variant="bodySm" style={{ color: C.error, marginTop: 10 }}>
                  {error}
                </NCText>
              ) : null}

              <Pressable
                onPress={onPrimaryPress}
                disabled={busy}
                style={({ pressed }) => ({
                  marginTop: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: C.white,
                  borderRadius: 999,
                  paddingVertical: 14,
                  opacity: busy ? 0.6 : pressed ? 0.88 : 1,
                })}
              >
                {busy ? <ActivityIndicator color={C.bg} size="small" /> : null}
                <NCText variant="uiLabelSm" style={{ color: C.bg, letterSpacing: 0.5, fontSize: 14, fontWeight: '700' }}>
                  {busy && isLastStep ? (mode === 'login' ? 'Signing in…' : 'Creating…') : primaryLabel}
                </NCText>
                {!busy && !isLastStep ? <Icon name="arrow-forward" size={16} color={C.bg} /> : null}
              </Pressable>

              {step === 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
                  <NCText variant="bodySm" style={{ color: C.muted }}>
                    {mode === 'login' ? 'New here?' : 'Already have an account?'}
                  </NCText>
                  <Pressable onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}>
                    <NCText
                      variant="uiLabelSm"
                      style={{
                        color: C.white,
                        letterSpacing: 0,
                        fontSize: 13,
                        borderBottomWidth: 1,
                        borderBottomColor: C.white,
                        paddingBottom: 1,
                      }}
                    >
                      {mode === 'login' ? 'Create an account' : 'Sign in'}
                    </NCText>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
