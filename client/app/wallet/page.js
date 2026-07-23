'use client';

import { useEffect, useState } from 'react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Button from '@/components/ui/Button';
import AuthGuard from '@/components/layout/AuthGuard';
import { api } from '@/lib/api';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';
import { formatTokens, formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';

function packSortOrder([, a], [, b]) {
  return (a?.price || 0) - (b?.price || 0);
}

function bonusPercent(pack) {
  if (!pack?.bonus || !pack?.tokens) return 0;
  return Math.round((pack.bonus / pack.tokens) * 100);
}

function PackCard({ packKey, pack, busy, onPurchase, featured }) {
  const totalCoins = (pack?.tokens || 0) + (pack?.bonus || 0);
  const bonus = bonusPercent(pack);
  const priceLabel = pack?.price != null
    ? `₹${Number(pack.price).toLocaleString('en-IN')}`
    : null;

  return (
    <article
      className={cn(
        'relative flex flex-col rounded-lg border p-6 transition-shadow',
        'bg-white border-ink-200/70 shadow-editorial-card',
        'dark:bg-neutral-950 dark:border-neutral-800',
        featured && 'ring-2 ring-gold/60 dark:ring-gold/40',
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-gold text-ink-900 text-[10px] font-bold uppercase tracking-widest">
          Best value
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-neutral-400">
            Coin pack
          </p>
          {priceLabel && (
            <p className="mt-1 font-serif text-[28px] leading-none text-ink-900 dark:text-neutral-50">
              {priceLabel}
            </p>
          )}
        </div>
        {bonus > 0 && (
          <span className="shrink-0 px-2 py-1 rounded-md bg-gold/15 text-gold-dim dark:text-gold text-[11px] font-bold uppercase tracking-wide">
            +{bonus}% bonus
          </span>
        )}
      </div>

      <div className="mt-6 flex-1">
        <p className="font-serif text-[44px] leading-none text-ink-900 dark:text-neutral-50">
          {formatTokens(totalCoins)}
        </p>
        <p className="mt-1 text-[13px] text-ink-600 dark:text-neutral-400">coins total</p>
        {pack?.bonus > 0 && (
          <p className="mt-2 text-[12px] text-ink-500 dark:text-neutral-500">
            {formatTokens(pack.tokens)} base + {formatTokens(pack.bonus)} bonus
          </p>
        )}
      </div>

      <Button
        onClick={() => onPurchase(packKey)}
        disabled={busy}
        variant={featured ? 'gold' : 'primary'}
        size="md"
        className="mt-6 w-full"
      >
        {busy ? 'Processing…' : 'Add to wallet'}
      </Button>
    </article>
  );
}

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

  async function handlePurchase(packKey) {
    setBusy(true);
    try {
      const data = await purchase(packKey);
      pushToast({
        type: 'success',
        title: 'Tokens added',
        message: `+${formatTokens(data.creditedTokens)} coins credited`,
      });
      const d = await api.get('/wallet/transactions', { query: { pageSize: 20 } });
      setTransactions(d.items || []);
    } catch (err) {
      pushToast({ type: 'error', title: 'Purchase failed', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  const packEntries = Object.entries(packs || {}).sort(packSortOrder);

  return (
    <div className="min-h-screen flex flex-col bg-cream-100 dark:bg-black">
      <SiteHeader variant="solid" />

      <main className="mx-auto max-w-shell w-full px-4 md:px-edge py-12 md:py-16">
        <p className="label-sm uppercase text-ink-500 dark:text-neutral-500">Your wallet</p>
        <h1 className="mt-2 font-serif text-[36px] md:text-[44px] leading-[1.15] text-ink-900 dark:text-neutral-100">
          Top up coins to unlock chapters
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-600 dark:text-neutral-400">
          Coins never expire. Use them on any paid chapter across Novel Centre.
        </p>

        <section
          className={cn(
            'mt-10 rounded-lg border overflow-hidden',
            'bg-white border-ink-200/70 shadow-editorial-card',
            'dark:bg-neutral-950 dark:border-neutral-800',
          )}
        >
          <div className="h-1 bg-gradient-to-r from-gold via-gold-dim to-gold/40" />
          <div className="p-8 md:p-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-neutral-500">
                Current balance
              </p>
              <p className="mt-3 font-serif text-[56px] md:text-[64px] leading-none text-ink-900 dark:text-neutral-50">
                {formatTokens(balance)}
              </p>
              <p className="mt-2 text-[14px] text-ink-600 dark:text-neutral-400">coins available</p>
            </div>
            <p className="text-[13px] leading-relaxed text-ink-500 dark:text-neutral-500 max-w-xs md:text-right">
              Mock checkout for now — purchases credit your wallet instantly for testing.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="font-serif text-[28px] text-ink-900 dark:text-neutral-100">Choose a pack</h2>
            <p className="hidden sm:block text-[13px] text-ink-500 dark:text-neutral-500">
              {packEntries.length} packs · prices in INR
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {packEntries.map(([key, pack]) => (
              <PackCard
                key={key}
                packKey={key}
                pack={pack}
                busy={busy}
                onPurchase={handlePurchase}
                featured={key === 'pack_999'}
              />
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-serif text-[24px] text-ink-900 dark:text-neutral-100">Recent activity</h2>
          {transactions.length === 0 ? (
            <p className="mt-4 text-[14px] text-ink-500 dark:text-neutral-500">
              No transactions yet. Top up a pack to get started.
            </p>
          ) : (
            <ul
              className={cn(
                'mt-4 divide-y rounded-lg border overflow-hidden',
                'divide-ink-200/60 border-ink-200/60 bg-white',
                'dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950',
              )}
            >
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-serif text-[16px] text-ink-900 dark:text-neutral-100 capitalize">
                      {t.type.replace('_', ' ')}
                    </p>
                    <p className="text-[12px] text-ink-500 dark:text-neutral-500">
                      {formatDate(t.createdAt)}
                    </p>
                  </div>
                  <p
                    className={cn(
                      'font-serif text-[18px] tabular-nums',
                      t.tokensDelta >= 0
                        ? 'text-ink-900 dark:text-neutral-100'
                        : 'text-danger',
                    )}
                  >
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
  return (
    <AuthGuard>
      <WalletInner />
    </AuthGuard>
  );
}
