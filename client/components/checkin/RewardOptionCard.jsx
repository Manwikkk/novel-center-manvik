'use client';

import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { rewardMeta } from '@/lib/checkinApi';

const TONES = {
  gold: 'bg-gold/15 text-gold-dim dark:text-gold',
  blue: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
};

export function RewardIcon({ type, size = 22, className }) {
  const meta = rewardMeta(type);
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-xl', TONES[meta.tone], className)}>
      <Icon name={meta.icon} filled size={size} />
    </span>
  );
}

/** One selectable milestone reward (radio-style card). */
export default function RewardOptionCard({ option, selected, onSelect, disabled }) {
  const meta = rewardMeta(option.type);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => onSelect?.(option)}
      className={cn(
        'group flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-ink-900 bg-ink-900 text-white shadow-editorial-card dark:border-white dark:bg-white dark:text-black'
          : 'border-neutral-200 bg-white hover:border-ink-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-500',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <RewardIcon type={option.type} className={cn('h-11 w-11', selected && 'bg-white/15 text-gold dark:bg-black/10 dark:text-gold-dim')} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-semibold leading-tight">{option.title}</span>
          <span
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
              selected ? 'border-gold bg-gold text-ink-900' : 'border-neutral-300 dark:border-neutral-600',
            )}
            aria-hidden="true"
          >
            {selected ? <Icon name="check" size={14} weight={700} /> : null}
          </span>
        </span>
        <span className={cn('mt-1 block text-[12px] leading-relaxed', selected ? 'text-white/75 dark:text-black/70' : 'text-ink-600 dark:text-neutral-400')}>
          {option.description}
        </span>
        <span className={cn('mt-2 inline-block text-[10px] font-semibold uppercase tracking-widest', selected ? 'text-gold' : 'text-ink-400 dark:text-neutral-500')}>
          {meta.label}{option.campaignOverride ? ' · event bonus' : ''}
        </span>
      </span>
    </button>
  );
}
