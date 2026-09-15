'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import AuthPageLayout from '@/components/auth/AuthPageLayout';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import AuthSocialDivider from '@/components/auth/AuthSocialDivider';
import RolePicker from '@/components/auth/RolePicker';
import { landingFor, roleForExperience } from '@/lib/experience';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({ displayName: '', email: '', password: '', experience: 'reader' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function validate() {
    const next = {};
    if (!form.displayName.trim()) next.displayName = 'Username is required.';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match.';
    if (!acceptedTerms) next.terms = 'You must accept the Terms & Conditions and Privacy Policy.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setBusy(true);
    setError('');
    try {
      const user = await register({ ...form, role: roleForExperience(form.experience) });
      router.push(landingFor(user));
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  const passwordsMismatch =
    confirmPassword.length > 0 && confirmPassword !== form.password;

  return (
    <AuthPageLayout
      eyebrow="Join the centre"
      title="Start your next obsession."
      lead="Whether you read serialized fiction or publish your own chapters, Novel Centre keeps the experience focused — no clutter, just stories."
      footer={
        <p className="text-[13px] text-ink-700">
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
        <h2 className="mt-1 font-serif text-[24px] leading-tight text-ink-900">
          Become a member
        </h2>
      </div>

      <div className="mt-0 lg:mt-4">
        <GoogleSignInButton
            label="signup_with"
            onSuccess={(data) => {
              if (data?.requiresOnboarding) {
                sessionStorage.setItem('nc.onboarding.redirect', '/');
                return;
              }
              router.push(data?.user?.role === 'author' ? '/author' : '/');
            }}
        />
        <AuthSocialDivider label="or register with email" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {error ? (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[13px] text-danger">
            {error}
          </div>
        ) : null}
        <TextInput
          label="Username"
          value={form.displayName}
          onChange={update('displayName')}
          autoComplete="username"
          required
          compact
          error={fieldErrors.displayName}
        />
        <TextInput
          label="Email"
          type="email"
          value={form.email}
          onChange={update('email')}
          autoComplete="email"
          required
          compact
        />
        <TextInput
          label="Password"
          type="password"
          value={form.password}
          onChange={update('password')}
          autoComplete="new-password"
          required
          compact
          hint={fieldErrors.password ? undefined : 'At least 8 characters.'}
          error={fieldErrors.password}
        />
        <TextInput
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          compact
          error={fieldErrors.confirmPassword || (passwordsMismatch ? 'Passwords do not match.' : undefined)}
        />

        <label className="flex items-start gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (e.target.checked) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.terms;
                  return next;
                });
              }
            }}
            className="mt-0.5 h-3.5 w-3.5 rounded border-ink-300 text-ink-900 focus:ring-ink-900/20"
          />
          <span className="text-[12px] leading-snug text-ink-700">
            I agree to the{' '}
            <Link href="/legal/terms" className="font-semibold text-ink-900 underline decoration-gold/80 underline-offset-2 hover:text-ink-700">
              Terms &amp; Conditions
            </Link>
            {' '}and{' '}
            <Link href="/legal/privacy" className="font-semibold text-ink-900 underline decoration-gold/80 underline-offset-2 hover:text-ink-700">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {fieldErrors.terms ? (
          <p className="text-[11px] text-danger -mt-2">{fieldErrors.terms}</p>
        ) : null}

        <RolePicker surface="light" value={form.experience} onChange={(experience) => setForm((f) => ({ ...f, experience }))} />

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full !tracking-widest !bg-ink-900 !text-white hover:!bg-ink-800 dark:!bg-ink-900 dark:!text-white dark:hover:!bg-ink-800 !py-2.5"
          disabled={busy}
        >
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthPageLayout>
  );
}
