'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import AuthPageLayout from '@/components/auth/AuthPageLayout';
import { useAuthStore } from '@/stores/authStore';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
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
      await login({ email, password });
      router.push(next);
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[14px] text-danger">
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
      />
      <TextInput
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full !tracking-widest !bg-ink-900 !text-white hover:!bg-ink-800 dark:!bg-ink-900 dark:!text-white dark:hover:!bg-ink-800"
        disabled={busy}
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
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
        <h2 className="mt-2 font-serif text-[32px] leading-tight text-ink-900">
          Continue reading
        </h2>
        <p className="mt-2 text-[14px] text-ink-600">
          Access your library, tokens, and saved progress.
        </p>
      </div>

      <div className="lg:mt-8">
        <Suspense fallback={<p className="text-[14px] text-ink-400">Loading form…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthPageLayout>
  );
}
