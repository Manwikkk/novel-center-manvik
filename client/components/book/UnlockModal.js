'use client';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { formatTokens } from '@/lib/format';

export default function UnlockModal({ open, chapter, balance, onConfirm, onClose, busy }) {
  if (!chapter) return null;
  // The API quotes the price with any Daily Check-In voucher already applied.
  const quote = chapter.unlockQuote || null;
  const basePrice = Number(quote?.basePrice ?? chapter.tokenPrice) || 0;
  const price = Number(quote?.price ?? chapter.tokenPrice) || 0;
  const voucher = quote?.voucher || null;
  const insufficient = balance < price;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Unlock chapter ${chapter.idx}?`}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            disabled={busy || insufficient}
            onClick={() => onConfirm?.(chapter)}
          >
            {insufficient ? 'Not enough tokens' : `Unlock for ${formatTokens(price)}`}
          </Button>
        </>
      }
    >
      <p className="font-serif text-[18px] text-ink-700 dark:text-neutral-200">{chapter.title}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 text-[14px]">
        <div>
          <dt className="label-sm text-ink-400 dark:text-neutral-400">Cost</dt>
          <dd className="mt-1 font-serif text-[20px] text-ink-900 dark:text-neutral-100">
            {voucher ? <s className="mr-2 text-[16px] text-ink-400">{formatTokens(basePrice)}</s> : null}
            {formatTokens(price)} tokens
          </dd>
        </div>
        <div>
          <dt className="label-sm text-ink-400 dark:text-neutral-400">Your balance</dt>
          <dd className="mt-1 font-serif text-[20px] text-ink-900 dark:text-neutral-100">
            {formatTokens(balance)} tokens
          </dd>
        </div>
      </dl>
      {voucher && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/10 px-3 py-1 text-[12px] text-gold-dim dark:text-gold">
          {voucher.title} applied — saves {formatTokens(quote.discount)} tokens
        </p>
      )}
      {insufficient && (
        <p className="mt-4 text-[13px] text-danger dark:text-red-400">
          You need {formatTokens(price - balance)} more tokens. Visit your wallet to top up.
        </p>
      )}
    </Modal>
  );
}
