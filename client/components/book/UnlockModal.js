'use client';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { formatTokens } from '@/lib/format';

export default function UnlockModal({ open, chapter, balance, onConfirm, onClose, busy }) {
  if (!chapter) return null;
  const insufficient = balance < chapter.tokenPrice;
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
            {insufficient ? 'Not enough tokens' : `Unlock for ${formatTokens(chapter.tokenPrice)}`}
          </Button>
        </>
      }
    >
      <p className="font-serif text-[18px] text-ink-700 dark:text-neutral-200">{chapter.title}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 text-[14px]">
        <div>
          <dt className="label-sm text-ink-400 dark:text-neutral-400">Cost</dt>
          <dd className="mt-1 font-serif text-[20px] text-ink-900 dark:text-neutral-100">
            {formatTokens(chapter.tokenPrice)} tokens
          </dd>
        </div>
        <div>
          <dt className="label-sm text-ink-400 dark:text-neutral-400">Your balance</dt>
          <dd className="mt-1 font-serif text-[20px] text-ink-900 dark:text-neutral-100">
            {formatTokens(balance)} tokens
          </dd>
        </div>
      </dl>
      {insufficient && (
        <p className="mt-4 text-[13px] text-danger dark:text-red-400">
          You need {formatTokens(chapter.tokenPrice - balance)} more tokens. Visit your wallet to top up.
        </p>
      )}
    </Modal>
  );
}
