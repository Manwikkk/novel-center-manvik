'use client';

import { useEffect, useState } from 'react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import AuthGuard from '@/components/layout/AuthGuard';
import { api } from '@/lib/api';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';
import { formatTokens, formatDate } from '@/lib/format';

const PACK_LABELS = {
  small: { title: 'Quiet shelf',  copy: '100 tokens'  },
  medium:{ title: 'Reading week', copy: '500 tokens'  },
  large: { title: 'Slow attention',copy: '1,200 tokens' },
};

function WalletInner() {
  const { balance, packs, refresh, purchase } = useWalletStore();
  const pushToast = useUiStore((s) => s.pushToast);
  const [transactions, setTransactions] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
    api.get('/wallet/transactions', { query: { pageSize: 20 } })
      .then((d) => setTransactions(d.items || []))
      .catch(() => setTransactions([]));
  }, [refresh]);

  async function handlePurchase(pack) {
    setBusy(true);
    try {
      const data = await purchase(pack);
      pushToast({ type: 'success', title: 'Tokens added', message: `+${formatTokens(data.creditedTokens)} tokens` });
      const d = await api.get('/wallet/transactions', { query: { pageSize: 20 } });
      setTransactions(d.items || []);
    } catch (err) {
      pushToast({ type: 'error', title: 'Purchase failed', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      <SiteHeader variant="solid" />

      <main className="mx-auto max-w-shell w-full px-4 md:px-edge py-12 md:py-16">
        <p className="label-sm uppercase text-ink-400 dark:text-neutral-500">Your wallet</p>
        <h1 className="mt-2 font-serif text-[36px] md:text-[48px] leading-[1.15] text-ink-900 dark:text-neutral-100">Tokens for unlocking chapters.</h1>

        <Card className="mt-10 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="label-sm uppercase text-ink-400">Current balance</p>
            <p className="mt-3 font-serif text-[56px] leading-none text-ink-900">{formatTokens(balance)}</p>
            <p className="mt-1 text-[14px] text-ink-400">tokens</p>
          </div>
          <p className="text-[14px] text-ink-400 max-w-sm">
            Tokens unlock paid chapters and never expire. Purchases here are mocked so the
            experience can be tested end-to-end.
          </p>
        </Card>

        <section className="mt-14">
          <h2 className="font-serif text-[28px] text-ink-900 dark:text-neutral-100">Top up</h2>
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            {(['small','medium','large']).map((key) => {
              const pack = packs?.[key];
              const label = PACK_LABELS[key];
              return (
                <Card key={key} className="p-6 flex flex-col gap-4">
                  <div>
                    <p className="label-sm uppercase text-ink-400">{label.title}</p>
                    <p className="mt-2 font-serif text-[32px] text-ink-900">
                      {pack ? formatTokens(pack.tokens) : label.copy}
                    </p>
                    <p className="text-[13px] text-ink-400">tokens</p>
                  </div>
                  <Button onClick={() => handlePurchase(key)} disabled={busy} variant="primary" size="md">
                    {busy ? 'Processing…' : 'Add to wallet'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-serif text-[28px] text-ink-900 dark:text-neutral-100">Recent activity</h2>
          {transactions.length === 0 ? (
            <p className="mt-4 text-ink-400 dark:text-neutral-500">No transactions yet.</p>
          ) : (
            <ul className="mt-6 divide-y divide-ink-200/60 dark:divide-neutral-800 border-t border-b border-ink-200/60 dark:border-neutral-800">
              {transactions.map((t) => (
                <li key={t.id} className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-serif text-[16px] text-ink-900 dark:text-neutral-100 capitalize">{t.type.replace('_', ' ')}</p>
                    <p className="text-[12px] text-ink-400 dark:text-neutral-500">{formatDate(t.createdAt)}</p>
                  </div>
                  <p className={'font-serif text-[18px] ' + (t.tokensDelta >= 0 ? 'text-ink-900 dark:text-neutral-100' : 'text-danger')}>
                    {t.tokensDelta >= 0 ? '+' : ''}{formatTokens(t.tokensDelta)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default function WalletPage() {
  return <AuthGuard><WalletInner /></AuthGuard>;
}
