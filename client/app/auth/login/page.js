'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/library';
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="text-[14px] text-danger border-l-2 border-danger pl-3">
          {error}
        </div>
      )}
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
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <aside className="hidden md:flex bg-ink-900 text-cream-100 px-12 py-16 flex-col justify-between">
        <Logo variant="cream" />
        <div className="max-w-md">
          <p className="label-sm uppercase text-cream-300/70">Welcome back</p>
          <h1 className="mt-4 font-serif text-[44px] leading-[1.1] tracking-tightDisplay">
            The page you left is still warm.
          </h1>
          <p className="mt-6 font-serif text-[18px] text-cream-300/80 leading-[1.6]">
            Pick up where you stopped, with the same chapters, tokens, and reading preferences.
          </p>
        </div>
        <p className="label-sm uppercase text-cream-300/60">Modern editorial minimalism</p>
      </aside>
      <main className="px-6 sm:px-10 md:px-16 py-16 flex flex-col justify-center bg-cream-100">
        <div className="md:hidden mb-10"><Logo /></div>
        <div className="max-w-sm w-full mx-auto">
          <p className="label-sm uppercase text-ink-400">Sign in</p>
          <h1 className="mt-3 font-serif text-[36px] leading-[1.15] text-ink-900">Step back inside.</h1>
          <p className="mt-3 text-[14px] text-ink-400">
            New here?{' '}
            <Link href="/auth/register" className="text-ink-900 underline decoration-gold underline-offset-4">Create an account</Link>.
          </p>
          <div className="mt-10">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
          <div className="mt-10 text-[12px] text-ink-400">
            By signing in you agree to our{' '}
            <Link href="/legal/terms" className="underline">Terms</Link> and{' '}
            <Link href="/legal/privacy" className="underline">Privacy</Link>.
          </div>
        </div>
      </main>
    </div>
  );
}
