'use client';

import { useState } from 'react';
import Link from 'next/link';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import AuthPageLayout from '@/components/auth/AuthPageLayout';
import { api } from '@/lib/api';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSentTo(email.trim());
    } catch (err) {
      setError(err.message || 'Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-gold/50 bg-gold/10 px-4 py-3 text-[14px] text-ink-800">
          If an account exists for <span className="font-semibold">{sentTo}</span>, a password reset
          link is on its way. It stays valid for one hour.
        </div>
        <p className="text-[13px] text-ink-600">
          Didn&rsquo;t get it? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={() => setSentTo('')}
            className="font-semibold text-ink-900 underline decoration-gold decoration-2 underline-offset-4"
          >
            try again
          </button>
          .
        </p>
      </div>
    );
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
      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full !tracking-widest !bg-ink-900 !text-white hover:!bg-ink-800 dark:!bg-ink-900 dark:!text-white dark:hover:!bg-ink-800 !py-2.5"
        disabled={busy || !email.trim()}
      >
        {busy ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthPageLayout
      eyebrow="Account recovery"
      title="Lost your password? We'll get you back to the page."
      lead="Enter the email on your account and we'll send a one-time link to choose a new password."
      footer={(
        <p className="text-[14px] text-ink-700">
          Remembered it?{' '}
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
        <p className="label-sm uppercase tracking-[0.2em] text-ink-500">Forgot password</p>
        <h2 className="mt-1 font-serif text-[24px] leading-tight text-ink-900">Reset your password</h2>
        <p className="mt-1 text-[13px] text-ink-600">
          We&rsquo;ll email you a link that works once and expires in an hour.
        </p>
      </div>
      <div className="mt-4">
        <ForgotPasswordForm />
      </div>
    </AuthPageLayout>
  );
}
