'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import AuthPageLayout from '@/components/auth/AuthPageLayout';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const pushToast = useUiStore((s) => s.pushToast);

  const [check, setCheck] = useState({ state: token ? 'checking' : 'invalid', email: '' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Validate the link up front so an expired one is explained before typing a password.
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    api.get('/auth/reset-password', { query: { token } })
      .then((r) => { if (!cancelled) setCheck({ state: 'valid', email: r.email || '' }); })
      .catch(() => { if (!cancelled) setCheck({ state: 'invalid', email: '' }); });
    return () => { cancelled = true; };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      pushToast({ type: 'success', title: 'Password updated', message: 'Sign in with your new password.' });
      router.push('/auth/login');
    } catch (err) {
      setError(err.message || 'Could not update the password.');
    } finally {
      setBusy(false);
    }
  }

  if (check.state === 'checking') {
    return <p className="text-[14px] text-ink-500">Checking your link…</p>;
  }

  if (check.state === 'invalid') {
    return (
      <div className="space-y-4">
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-[14px] text-danger">
          This password link is invalid or has expired.
        </div>
        <Button
          href="/auth/forgot-password"
          variant="primary"
          size="md"
          className="w-full !tracking-widest !bg-ink-900 !text-white hover:!bg-ink-800 dark:!bg-ink-900 dark:!text-white dark:hover:!bg-ink-800 !py-2.5"
        >
          Request a new link
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {check.email ? (
        <p className="text-[13px] text-ink-600">
          Choosing a new password for <span className="font-semibold text-ink-900">{check.email}</span>.
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[13px] text-danger">
          {error}
        </div>
      ) : null}
      <TextInput
        label="New password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
        hint="At least 8 characters."
        compact
      />
      <TextInput
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        autoComplete="new-password"
        error={confirm && confirm !== password ? 'Passwords do not match.' : undefined}
        compact
      />
      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full !tracking-widest !bg-ink-900 !text-white hover:!bg-ink-800 dark:!bg-ink-900 dark:!text-white dark:hover:!bg-ink-800 !py-2.5"
        disabled={busy || !password || !confirm}
      >
        {busy ? 'Saving…' : 'Set new password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthPageLayout
      eyebrow="Account recovery"
      title="Choose a new password."
      lead="Pick something memorable — you'll use it every time you sign in with your email address."
      footer={(
        <p className="text-[14px] text-ink-700">
          Changed your mind?{' '}
          <Link
            href="/auth/login"
            className="font-semibold text-ink-900 underline decoration-gold decoration-2 underline-offset-4 hover:text-ink-700"
          >
            Back to sign in
          </Link>
        </p>
      )}
    >
      <div>
        <p className="label-sm uppercase tracking-[0.2em] text-ink-500">Reset password</p>
        <h2 className="mt-1 font-serif text-[24px] leading-tight text-ink-900">Set a new password</h2>
      </div>
      <div className="mt-4">
        <Suspense fallback={<p className="text-[14px] text-ink-400">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </AuthPageLayout>
  );
}
