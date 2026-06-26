'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import RolePicker from '@/components/auth/RolePicker';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useWalletStore } from '@/stores/walletStore';

export default function RoleOnboardingModal() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const pushToast = useUiStore((s) => s.pushToast);
  const finishAuthModal = useUiStore((s) => s.finishAuthModal);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const [role, setRole] = useState('user');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const open = Boolean(hydrated && user && user.onboardingCompleted === false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const updated = await completeOnboarding(role);
      await refreshWallet().catch(() => {});
      pushToast({
        type: 'success',
        title: 'Welcome!',
        message: role === 'author' ? 'Your author workspace is ready.' : 'Happy reading!',
      });
      finishAuthModal();
      if (updated?.role === 'author') {
        router.push('/author');
      } else {
        const next = sessionStorage.getItem('nc.onboarding.redirect');
        if (next) {
          sessionStorage.removeItem('nc.onboarding.redirect');
          router.push(next);
        }
      }
    } catch (err) {
      setError(err.message || 'Could not save your preference.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title="How will you use Novel Centre?"
      size="md"
      footer={(
        <Button onClick={handleSubmit} disabled={busy} className="w-full sm:w-auto">
          {busy ? 'Saving…' : 'Continue'}
        </Button>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-ink-600 dark:text-neutral-400">
          Choose whether you want to read stories or publish your own. You can always explore both later.
        </p>
        <RolePicker value={role} onChange={setRole} />
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : null}
      </form>
    </Modal>
  );
}
