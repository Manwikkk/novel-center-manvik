'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatTokens } from '@/lib/format';

const QUICK_AMOUNTS = [50, 100, 500, 1000];

export default function AddWalletTokensModal({
  open,
  user,
  busy,
  onClose,
  onConfirm,
}) {
  const [amount, setAmount] = useState('100');

  useEffect(() => {
    if (open) setAmount('100');
  }, [open, user?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, busy, onClose]);

  if (!open || !user) return null;

  const parsed = Number(amount);
  const valid = Number.isInteger(parsed) && parsed > 0;
  const nextBalance = (user.wallet?.balance ?? 0) + (valid ? parsed : 0);

  function submit(e) {
    e.preventDefault();
    if (!valid || busy) return;
    onConfirm(parsed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        disabled={busy}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-tokens-title"
        className="relative w-full max-w-md rounded-md border border-outline-variant bg-surface-container-lowest p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 id="add-tokens-title" className="font-serif text-[22px] text-on-surface">
              Add tokens
            </h2>
            <p className="mt-1 text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">
              {user.displayName} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-on-surface-variant hover:text-on-surface disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="rounded-md border border-outline-variant bg-surface-container px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-[12px] text-on-surface-variant uppercase tracking-widest">Current balance</span>
            <span className="font-serif text-[18px] text-on-surface">{formatTokens(user.wallet?.balance ?? 0)}</span>
          </div>

          <div>
            <label htmlFor="token-amount" className="block text-[12px] text-on-surface-variant label-sm uppercase mb-2">
              Amount to add
            </label>
            <input
              id="token-amount"
              type="number"
              min={1}
              step={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 text-[18px] text-on-surface"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className={cn(
                  'px-3 py-1.5 rounded-full border text-[12px] uppercase tracking-labelTight transition-colors',
                  Number(amount) === value
                    ? 'border-on-surface bg-on-surface text-surface dark:bg-neutral-100 dark:text-neutral-950 dark:border-neutral-100'
                    : 'border-outline-variant text-on-surface-variant hover:border-on-surface',
                )}
              >
                +{formatTokens(value)}
              </button>
            ))}
          </div>

          {valid && (
            <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">
              New balance after credit:{' '}
              <span className="text-on-surface font-medium">{formatTokens(nextBalance)}</span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-md border border-outline-variant text-on-surface-variant text-[12px] uppercase tracking-widest disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || busy}
              className="px-4 py-2 rounded-md bg-on-surface text-surface text-[12px] uppercase tracking-widest disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950"
            >
              {busy ? 'Adding…' : `Add ${valid ? formatTokens(parsed) : 'tokens'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
