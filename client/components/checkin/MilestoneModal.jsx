'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import RewardOptionCard, { RewardIcon } from '@/components/checkin/RewardOptionCard';
import { checkinApi } from '@/lib/checkinApi';

/**
 * One-time milestone reward choice. The selection is final once issued, so
 * the confirm step names the pick explicitly.
 */
export default function MilestoneModal({ pending, open, onClose, onClaimed, onActivatePass }) {
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setBusy(false);
      setError('');
      setResult(null);
    }
  }, [open, pending?.checkinId]);

  if (!pending) return null;
  const isDay14 = pending.displayDay === 14;

  async function confirm() {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const res = await checkinApi.claimMilestone(pending.checkinId, selected.key);
      setResult(res);
      onClaimed?.(res);
    } catch (err) {
      setError(err.message || 'Could not claim the reward');
    } finally {
      setBusy(false);
    }
  }

  const reward = result?.reward;

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      size="lg"
      title={result ? 'Reward issued' : isDay14 ? 'Day 14 major milestone' : 'Day 7 milestone'}
      footer={
        result ? (
          <>
            {reward?.isPass ? (
              <Button variant="primary" size="md" onClick={() => onActivatePass?.(reward)}>
                Activate now
              </Button>
            ) : null}
            <Button variant={reward?.isPass ? 'secondary' : 'primary'} size="md" onClick={onClose}>
              {reward?.isPass ? 'Keep it for later' : 'Done'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>Later</Button>
            <Button variant="primary" size="md" onClick={confirm} disabled={busy || !selected}>
              {busy ? 'Issuing…' : selected ? `Claim ${selected.title}` : 'Pick a reward'}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/15">
            <RewardIcon type={reward?.type} size={36} className="h-14 w-14" />
          </div>
          {result.lucky ? (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-300">
              <Icon name="auto_awesome" filled size={14} /> Lucky upgrade!
            </p>
          ) : null}
          <p className="mt-3 font-serif text-[26px] text-ink-900 dark:text-neutral-50">{reward?.title}</p>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-600 dark:text-neutral-400">
            {reward?.type === 'COINS'
              ? `Credited to your wallet${result.balance != null ? ` — new balance ${result.balance} coins` : ''}.`
              : reward?.isPass
                ? 'Stored in your rewards. The timer only starts when you activate it.'
                : 'Stored in your rewards and applied automatically on your next eligible unlock.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-[14px] leading-relaxed text-ink-600 dark:text-neutral-400">
            You reached a {pending.streak}-day streak on {pending.date}. Choose <strong className="text-ink-900 dark:text-neutral-100">one</strong> reward —
            the choice is permanent once it is issued and cannot be exchanged later.
          </p>
          <div role="radiogroup" aria-label="Milestone reward" className="mt-5 grid gap-3">
            {pending.options.map((opt) => (
              <RewardOptionCard
                key={opt.key}
                option={opt}
                selected={selected?.key === opt.key}
                onSelect={setSelected}
                disabled={busy}
              />
            ))}
          </div>
          {error ? <p className="mt-4 text-[13px] text-danger">{error}</p> : null}
        </>
      )}
    </Modal>
  );
}
