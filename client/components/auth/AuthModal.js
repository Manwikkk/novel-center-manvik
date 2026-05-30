'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useWalletStore } from '@/stores/walletStore';

function LoginPanel({ onSuccess }) {
  const login = useAuthStore((s) => s.login);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const pushToast = useUiStore((s) => s.pushToast);
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
      await refreshWallet().catch(() => {});
      pushToast({ type: 'success', title: 'Welcome back' });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[14px] text-danger">
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
        className="w-full !bg-ink-900 !text-white hover:!bg-ink-800 dark:!bg-ink-900 dark:!text-white"
        disabled={busy}
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

function RegisterPanel({ onSuccess }) {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const pushToast = useUiStore((s) => s.pushToast);
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
      const hadPendingAction = !!useUiStore.getState()._authOnSuccess;
      const user = await register(form);
      await refreshWallet().catch(() => {});
      pushToast({ type: 'success', title: 'Account created' });
      onSuccess?.();
      if (user.role === 'author' && !hadPendingAction) {
        router.push('/author');
      }
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[14px] text-danger">
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
        <legend className="label-sm uppercase tracking-[0.2em] text-ink-500">I&rsquo;m here to</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
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
                className={cn(
                  'rounded-lg border p-3 text-left text-[13px] transition-colors',
                  active
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-neutral-200 text-ink-900 hover:border-ink-400',
                )}
              >
                <span className="font-semibold uppercase tracking-wider text-[11px]">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full !bg-ink-900 !text-white hover:!bg-ink-800 dark:!bg-ink-900 dark:!text-white"
        disabled={busy}
      >
        {busy ? 'Creating…' : 'Create account'}
      </Button>
    </form>
  );
}

export default function AuthModal() {
  const router = useRouter();
  const { open, tab, message } = useUiStore((s) => s.authModal);
  const closeAuthModal = useUiStore((s) => s.closeAuthModal);
  const setAuthModalTab = useUiStore((s) => s.setAuthModalTab);
  const finishAuthModal = useUiStore((s) => s.finishAuthModal);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeAuthModal(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, closeAuthModal]);

  if (!open) return null;

  function handleSuccess() {
    finishAuthModal();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={closeAuthModal}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="auth-form-card relative w-full max-w-[420px] rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute right-4 top-4 p-2 text-ink-400 hover:text-ink-900 rounded-lg"
          aria-label="Close"
        >
          <Icon name="close" size={22} />
        </button>

        <p className="label-sm uppercase tracking-[0.2em] text-ink-500">Novel Centre</p>
        <h2 id="auth-modal-title" className="mt-2 pr-8 font-serif text-[26px] leading-tight text-ink-900">
          {tab === 'login' ? 'Sign in to continue' : 'Create your account'}
        </h2>
        {message ? (
          <p className="mt-2 text-[14px] text-ink-600">{message}</p>
        ) : (
          <p className="mt-2 text-[14px] text-ink-600">
            {tab === 'login'
              ? 'Save books, unlock chapters, and comment without leaving this page.'
              : 'Join free — read serialized novels or publish your own.'}
          </p>
        )}

        <div className="mt-6 flex rounded-lg border border-neutral-200 p-1 bg-neutral-50">
          {[
            { id: 'login', label: 'Sign in' },
            { id: 'register', label: 'Register' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAuthModalTab(t.id)}
              className={cn(
                'flex-1 rounded-md py-2 text-[12px] font-bold uppercase tracking-wider transition-colors',
                tab === t.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'login' ? (
            <LoginPanel onSuccess={handleSuccess} />
          ) : (
            <RegisterPanel onSuccess={handleSuccess} />
          )}
        </div>

        <p className="mt-6 text-center text-[12px] text-ink-500">
          {tab === 'login' ? (
            <>
              Prefer the full page?{' '}
              <button
                type="button"
                className="underline hover:text-ink-800"
                onClick={() => { closeAuthModal(); router.push('/auth/login'); }}
              >
                Open sign-in page
              </button>
            </>
          ) : (
            <>
              Prefer the full page?{' '}
              <button
                type="button"
                className="underline hover:text-ink-800"
                onClick={() => { closeAuthModal(); router.push('/auth/register'); }}
              >
                Open register page
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
