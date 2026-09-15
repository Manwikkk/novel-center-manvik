'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import AuthPageLayout from '@/components/auth/AuthPageLayout';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import AuthSocialDivider from '@/components/auth/AuthSocialDivider';
import { useAuthStore } from '@/stores/authStore';
import { firstAllowedAdminHref } from '@/lib/adminPermissions';
import { landingFor as experienceLanding } from '@/lib/experience';

/**
 * Where a fresh sign-in lands. An explicit `next` wins; otherwise admins and
 * staff go to the admin panel instead of the reader home.
 */
function landingFor(user, next) {
  if (next) return next;
  if (user?.role === 'admin') return '/admin';
  if (user?.role === 'staff') return firstAllowedAdminHref(user);
  return experienceLanding(user);
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '';
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login({ email, password });
      router.push(landingFor(user, next));
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[13px] text-danger">
          {error}
        </div>
      ) : null}

      <TextInput
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        compact
      />
      <TextInput
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        compact
      />
      <div className="flex justify-end">
        <Link
          href="/auth/forgot-password"
          className="text-[12px] font-semibold text-ink-700 underline decoration-gold decoration-2 underline-offset-4 hover:text-ink-900"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full !tracking-widest !bg-ink-900 !text-white hover:!bg-ink-800 dark:!bg-ink-900 dark:!text-white dark:hover:!bg-ink-800 !py-2.5"
        disabled={busy}
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

function LoginGoogleSignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '';

  return (
    <GoogleSignInButton
      label="signin_with"
      onSuccess={(data) => {
        if (data?.requiresOnboarding) {
          sessionStorage.setItem('nc.onboarding.redirect', next || '/');
          return;
        }
        router.push(landingFor(data?.user, next));
      }}
    />
  );
}

export default function LoginPage() {
  return (
    <AuthPageLayout
      eyebrow="Welcome back"
      title="Your next chapter is waiting."
      lead="Thousands of serialized novels, token unlocks, and a reading experience built for long nights — pick up exactly where you left off."
      footer={
        <>
          <p className="text-[14px] text-ink-700">
            New here?{' '}
            <Link
              href="/auth/register"
              className="font-semibold text-ink-900 underline decoration-gold decoration-2 underline-offset-4 hover:text-ink-700"
            >
              Create an account
            </Link>
          </p>
          <p className="mt-4 text-[12px] text-ink-500">
            By signing in you agree to our{' '}
            <Link href="/legal/terms" className="text-ink-700 underline hover:text-ink-900">Terms</Link>
            {' '}and{' '}
            <Link href="/legal/privacy" className="text-ink-700 underline hover:text-ink-900">Privacy</Link>.
          </p>
        </>
      }
    >
      <div className="hidden lg:block">
        <p className="label-sm uppercase tracking-[0.2em] text-ink-500">Sign in</p>
        <h2 className="mt-1 font-serif text-[24px] leading-tight text-ink-900">
          Continue reading
        </h2>
        <p className="mt-1 text-[13px] text-ink-600">
          Access your library, tokens, and saved progress.
        </p>
      </div>

      <div className="lg:mt-4 space-y-0">
        <Suspense fallback={<div className="h-11 animate-pulse rounded-md bg-neutral-100" />}>
          <LoginGoogleSignIn />
        </Suspense>
        <AuthSocialDivider />
        <Suspense fallback={<p className="text-[14px] text-ink-400">Loading form…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthPageLayout>
  );
}
