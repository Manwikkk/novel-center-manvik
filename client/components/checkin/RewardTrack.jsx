'use client';

import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

function DayTile({ day, onMilestoneInfo }) {
  const claimed = day.state === 'claimed';
  const today = day.state === 'today';
  const milestone = !!day.milestone;
  const major = day.milestone === 'day14';

  return (
    <div
      role="listitem"
      aria-label={`Day ${day.day}: ${day.exp} EXP${milestone ? ', milestone reward' : ''}, ${day.state}`}
      className={cn(
        'relative flex min-h-[112px] flex-col justify-between rounded-xl border p-3 transition-all',
        claimed && 'border-ink-900 bg-ink-900 text-white dark:border-white dark:bg-white dark:text-black',
        today && 'border-gold bg-gold/10 text-ink-900 ring-2 ring-gold/60 ring-offset-2 ring-offset-cream-100 dark:ring-offset-black dark:text-neutral-50',
        !claimed && !today && 'border-neutral-200 bg-white text-ink-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300',
        milestone && !claimed && !today && 'border-dashed border-gold/60',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={cn('text-[10px] font-semibold uppercase tracking-[0.16em]', claimed ? 'text-white/70 dark:text-black/60' : 'text-ink-500 dark:text-neutral-500')}>
          Day {day.day}
        </span>
        {claimed ? (
          <Icon name="check_circle" filled size={16} className="text-gold" />
        ) : today ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
          </span>
        ) : milestone ? (
          <Icon name={major ? 'workspace_premium' : 'redeem'} size={16} className="text-gold-dim dark:text-gold" />
        ) : null}
      </div>

      <div>
        <p className={cn('font-serif leading-none tabular-nums', milestone ? 'text-[26px]' : 'text-[22px]')}>
          +{day.exp}
          <span className="ml-1 font-sans text-[10px] font-semibold uppercase tracking-widest opacity-70">exp</span>
        </p>
        {day.boosted ? (
          <p className={cn('mt-1 text-[10px] font-semibold', claimed ? 'text-gold' : 'text-gold-dim dark:text-gold')}>
            Boosted · base {day.baseExp}
          </p>
        ) : null}
        {milestone ? (
          <button
            type="button"
            onClick={() => onMilestoneInfo?.(day)}
            className={cn(
              'mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest underline-offset-2 hover:underline',
              claimed ? 'text-gold' : 'text-gold-dim dark:text-gold',
            )}
          >
            <Icon name="redeem" size={12} filled />
            {major ? 'Major reward' : 'Reward pick'}
          </button>
        ) : today ? (
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-gold-dim dark:text-gold">Today</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The 14-day reward display. The cycle wraps every 14 days without touching
 * the real streak, so a 29-day streak shows Day 1 of a new round.
 */
export default function RewardTrack({ track = [], cycle, onMilestoneInfo }) {
  if (!track.length) return null;
  return (
    <section aria-label="14-day reward schedule" className="rounded-2xl border border-neutral-200/80 bg-cream-100 p-5 shadow-editorial-card dark:border-neutral-800 dark:bg-neutral-900/60 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500 dark:text-neutral-500">Reward schedule</p>
          <h2 className="mt-1 font-serif text-[24px] leading-tight text-ink-900 dark:text-neutral-50">
            14-day cycle · round {cycle?.number || 1}
          </h2>
        </div>
        <p className="text-[12px] text-ink-500 dark:text-neutral-500">
          {cycle?.cycleExp || 0} EXP per full cycle, plus two milestone rewards
        </p>
      </div>

      <div role="list" className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-7">
        {track.map((day) => (
          <DayTile key={day.day} day={day} onMilestoneInfo={onMilestoneInfo} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-ink-500 dark:text-neutral-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink-900 dark:bg-white" /> Claimed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-gold bg-gold/30" /> Today</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-gold/70" /> Milestone · choose one reward</span>
      </div>
    </section>
  );
}
