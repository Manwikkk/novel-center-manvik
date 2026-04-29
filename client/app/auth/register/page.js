'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
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
      router.push(form.role === 'author' ? '/author' : '/library');
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <aside className="hidden md:flex bg-ink-900 text-cream-100 px-12 py-16 flex-col justify-between">
        <Logo variant="cream" />
        <div className="max-w-md">
          <p className="label-sm uppercase text-cream-300/70">Join the centre</p>
          <h1 className="mt-4 font-serif text-[44px] leading-[1.1] tracking-tightDisplay">
            A quieter place to read and to write.
          </h1>
          <p className="mt-6 font-serif text-[18px] text-cream-300/80 leading-[1.6]">
            Tokens for readers. Editorial tools for authors. No noise either way.
          </p>
        </div>
        <p className="label-sm uppercase text-cream-300/60">Modern editorial minimalism</p>
      </aside>
      <main className="px-6 sm:px-10 md:px-16 py-16 flex flex-col justify-center bg-cream-100">
        <div className="md:hidden mb-10"><Logo /></div>
        <div className="max-w-sm w-full mx-auto">
          <p className="label-sm uppercase text-ink-400">Create your account</p>
          <h1 className="mt-3 font-serif text-[36px] leading-[1.15] text-ink-900">Become a member.</h1>
          <p className="mt-3 text-[14px] text-ink-400">
            Already with us?{' '}
            <Link href="/auth/login" className="text-ink-900 underline decoration-gold underline-offset-4">Sign in</Link>.
          </p>
          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            {error && (
              <div role="alert" className="text-[14px] text-danger border-l-2 border-danger pl-3">
                {error}
              </div>
            )}
            <TextInput label="Display name" value={form.displayName} onChange={update('displayName')} required />
            <TextInput label="Email" type="email" value={form.email} onChange={update('email')} autoComplete="email" required />
            <TextInput label="Password" type="password" value={form.password} onChange={update('password')} autoComplete="new-password" required hint="At least 8 characters." />

            <fieldset>
              <legend className="label-sm uppercase text-ink-400">I&rsquo;m here to</legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { value: 'user',   label: 'Read' },
                  { value: 'author', label: 'Write' },
                ].map((opt) => {
                  const active = form.role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: opt.value }))}
                      className={
                        'border rounded p-4 text-left transition-colors ' +
                        (active ? 'border-ink-900 bg-ink-900 text-cream-100' : 'border-ink-300 text-ink-900 hover:border-ink-700')
                      }
                    >
                      <span className="label-sm uppercase">{opt.label}</span>
                      <p className="mt-1 font-serif text-[16px]">
                        {opt.value === 'user' ? 'Discover and read.' : 'Publish chapters.'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
