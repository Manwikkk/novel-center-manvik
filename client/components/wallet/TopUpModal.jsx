'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';
import { formatTokens } from '@/lib/format';
import { cn } from '@/lib/cn';

function packSortOrder([, a], [, b]) {
  return (a?.price || 0) - (b?.price || 0);
}

/**
 * In-place coin top-up so a reader can buy a pack and keep reading without
 * leaving the current page. Uses the same packs and purchase flow as /wallet.
 */
export default function TopUpModal({ open, onClose, requiredTokens = 0, onPurchased }) {
  const balance = useWalletStore((s) => s.balance);
  const packs = useWalletStore((s) => s.packs);
  const refresh = useWalletStore((s) => s.refresh);
  const purchase = useWalletStore((s) => s.purchase);
  const pushToast = useUiStore((s) => s.pushToast);
  const [busyKey, setBusyKey] = useState(null);

  useEffect(() => {
    if (open && !packs) refresh();
  }, [open, packs, refresh]);

  const shortfall = Math.max(0, Number(requiredTokens) - Number(balance));
  const packEntries = Object.entries(packs || {}).sort(packSortOrder);

  async function handlePurchase(packKey) {
    if (busyKey) return;
    setBusyKey(packKey);
    try {
      const data = await purchase(packKey);
      pushToast({
        type: 'success',
        title: 'Tokens added',
        message: `+${formatTokens(data.creditedTokens)} coins credited`,
      });
      onPurchased?.(data);
      onClose?.();
    } catch (err) {
      pushToast({ type: 'error', title: 'Purchase failed', message: err.message });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Modal open={open} onClose={busyKey ? undefined : onClose} title="Top up coins" size="lg">
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-4 text-[14px]">
          <div>
            <dt className="label-sm text-ink-400 dark:text-neutral-400">Your balance</dt>
            <dd className="mt-1 font-serif text-[20px] text-ink-900 dark:text-neutral-100">
              {formatTokens(balance)} tokens
            </dd>
          </div>
          {requiredTokens > 0 && (
            <div>
              <dt className="label-sm text-ink-400 dark:text-neutral-400">
                {shortfall > 0 ? 'Still needed' : 'Chapter cost'}
              </dt>
              <dd className={cn(
                'mt-1 font-serif text-[20px]',
                shortfall > 0 ? 'text-danger dark:text-red-400' : 'text-ink-900 dark:text-neutral-100',
              )}
              >
                {formatTokens(shortfall > 0 ? shortfall : requiredTokens)} tokens
              </dd>
            </div>
          )}
        </dl>

        {packEntries.length === 0 ? (
          <p className="text-[14px] text-ink-500 dark:text-neutral-400">Loading coin packs…</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {packEntries.map(([key, pack]) => {
              const total = (pack?.tokens || 0) + (pack?.bonus || 0);
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-lg border border-ink-200/70 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="min-w-0">
                    <p className="font-serif text-[22px] leading-none text-ink-900 dark:text-neutral-50">
                      {formatTokens(total)}
                      <span className="ml-1 font-sans text-[11px] uppercase tracking-widest text-ink-500 dark:text-neutral-400">
                        coins
                      </span>
                    </p>
                    <p className="mt-1 text-[12px] text-ink-500 dark:text-neutral-400">
                      {pack?.price != null ? `₹${Number(pack.price).toLocaleString('en-IN')}` : ''}
                      {pack?.bonus > 0 ? ` · +${formatTokens(pack.bonus)} bonus` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!!busyKey}
                    onClick={() => handlePurchase(key)}
                  >
                    {busyKey === key ? 'Adding…' : 'Buy'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
