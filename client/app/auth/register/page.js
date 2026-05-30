'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import AuthPageLayout from '@/components/auth/AuthPageLayout';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({ displayName: '', email: '', password: '', role: 'user' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      router.push(form.role === 'author' ? '/author' : '/');
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPageLayout
      eyebrow="Join the centre"
      title="Start your next obsession."
      lead="Whether you read serialized fiction or publish your own chapters, Novel Centre keeps the experience focused — no clutter, just stories."
      footer={
        <p className="text-[14px] text-ink-700">
          Already with us?{' '}
          <Link
            href="/auth/login"
            className="font-semibold text-ink-900 underline decoration-gold decoration-2 underline-offset-4 hover:text-ink-700"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="hidden lg:block">
        <p className="label-sm uppercase tracking-[0.2em] text-ink-500">Create account</p>
        <h2 className="mt-2 font-serif text-[32px] leading-tight text-ink-900">
          Become a member
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="mt-0 space-y-5 lg:mt-8">
        {error ? (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-[14px] text-danger">
            {error}
          </div>
        ) : null}
        <TextInput label="Display name" value={form.displayName} onChange={update('displayName')} required />
        <TextInput label="Email" type="email" value={form.email} onChange={update('email')} autoComplete="email" required />
        <TextInput
          label="Password"
          type="password"
          value={form.password}
          onChange={update('password')}
          autoComplete="new-password"
          required
          hint="At least 8 characters."
        />

        <fieldset>
          <legend className="label-sm uppercase tracking-[0.2em] text-ink-400">I&rsquo;m here to</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { value: 'user', label: 'Read' },
              { value: 'author', label: 'Write' },
            ].map((opt) => {
              const active = form.role === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: opt.value }))}
                  className={
                    'rounded-xl border p-4 text-left transition-all ' +
                    (active
                      ? 'border-ink-900 bg-ink-900 text-cream-100 shadow-md dark:border-neutral-100 dark:bg-neutral-100 dark:text-ink-900'
                      : 'border-ink-200 text-ink-900 hover:border-gold/60 dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-gold/40')
                  }
                >
                  <span className="label-sm uppercase tracking-wider">{opt.label}</span>
                  <p className="mt-1 font-serif text-[15px] opacity-90">
                    {opt.value === 'user' ? 'Discover & read.' : 'Publish chapters.'}
                  </p>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full !tracking-widest !bg-ink-900 !text-white hover:!bg-ink-800 dark:!bg-ink-900 dark:!text-white dark:hover:!bg-ink-800"
          disabled={busy}
        >
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthPageLayout>
  );
}
