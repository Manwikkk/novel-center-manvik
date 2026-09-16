'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatDuration, secondsUntil } from '@/lib/checkinApi';

function Stat({ label, value, hint }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{label}</p>
      <p className="mt-1 font-serif text-[26px] leading-none text-white tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-white/50">{hint}</p> : null}
    </div>
  );
}

function Pill({ children, tone = 'neutral', icon }) {
  const tones = {
    neutral: 'border-neutral-200 bg-neutral-50 text-ink-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300',
    gold: 'border-gold/50 bg-gold/10 text-gold-dim dark:text-gold',
    green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    violet: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', tones[tone])}>
      {icon ? <Icon name={icon} size={14} filled /> : null}
      {children}
    </span>
  );
}

/** Live countdown to the next calendar day in the platform timezone. */
function useCountdown(iso) {
  const [left, setLeft] = useState(() => secondsUntil(iso));
  useEffect(() => {
    setLeft(secondsUntil(iso));
    const t = setInterval(() => setLeft(secondsUntil(iso)), 1000);
    return () => clearInterval(t);
  }, [iso]);
  return left;
}

export default function StreakHero({ status, claiming, onClaim, onOpenMilestone }) {
  const secondsToReset = useCountdown(status?.nextResetAt);
  if (!status) return null;

  const { streak, cycle, todayReward, claimedToday, campaign, pendingMilestones = [] } = status;
  const pending = pendingMilestones[0] || null;
  const milestoneToday = !!todayReward.milestone;
  const isDay14 = todayReward.milestone === 'day14';
  const dayProgress = Math.round(((claimedToday ? cycle.day : cycle.day - 1) / cycle.length) * 100);
  const nextDay = cycle.day >= cycle.length ? 1 : cycle.day + 1;

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]" aria-label="Streak overview">
      {/* Streak panel */}
      <div className="relative overflow-hidden rounded-2xl bg-ink-900 p-6 text-white shadow-editorial-card dark:bg-neutral-900 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Continuous streak</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="font-serif text-[76px] leading-[0.85] tabular-nums sm:text-[96px]">{streak.current}</span>
              <span className="mb-2 text-[15px] text-white/70">
                {streak.current === 1 ? 'day' : 'days'} in a row
              </span>
            </div>
          </div>
          <div
            className={cn(
              'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border',
              streak.current > 0
                ? 'border-gold/40 bg-gold/15 text-gold'
                : 'border-white/15 bg-white/5 text-white/50',
            )}
            aria-hidden="true"
          >
            <Icon name="local_fire_department" filled size={34} />
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          {claimedToday ? (
            <Pill tone="green" icon="task_alt">Claimed today</Pill>
          ) : streak.broken ? (
            <Pill tone="neutral" icon="restart_alt">Streak restarts today</Pill>
          ) : streak.current > 0 ? (
            <Pill tone="gold" icon="bolt">Claim to keep it alive</Pill>
          ) : (
            <Pill tone="gold" icon="bolt">Start your streak today</Pill>
          )}
          {milestoneToday ? (
            <Pill tone="violet" icon="redeem">{isDay14 ? 'Day 14 · major milestone' : 'Day 7 · milestone'}</Pill>
          ) : null}
          {campaign ? (
            <Pill tone="gold" icon="celebration">{campaign.name}</Pill>
          ) : null}
        </div>

        {streak.broken && streak.missedDays > 0 ? (
          <p className="relative mt-4 text-[13px] leading-relaxed text-white/65">
            You missed {streak.missedDays === 1 ? 'a day' : `${streak.missedDays} days`}, so the streak starts again at Day 1.
            Your longest streak of {streak.longest} and everything you earned are kept.
          </p>
        ) : null}

        <div className="relative mt-7 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
          <Stat label="Longest" value={streak.longest} hint="days" />
          <Stat label="Total" value={streak.total} hint="check-ins" />
          <Stat label="Cycle" value={`${cycle.day}/${cycle.length}`} hint={`round ${cycle.number}`} />
        </div>

        <div className="relative mt-5">
          <div className="flex items-center justify-between text-[11px] text-white/55">
            <span>14-day reward cycle</span>
            <span className="tabular-nums">{dayProgress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-700" style={{ width: `${dayProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Today's reward panel */}
      <div className="flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-editorial-card dark:border-neutral-800 dark:bg-neutral-950 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500 dark:text-neutral-500">
              Today · Day {todayReward.day} of {cycle.length}
            </p>
            <h2 className="mt-2 font-serif text-[28px] leading-tight text-ink-900 dark:text-neutral-50 sm:text-[32px]">
              {claimedToday ? 'Reward claimed.' : milestoneToday ? 'Milestone day.' : 'Today’s reward'}
            </h2>
          </div>
          <div className="text-right">
            <p className="font-serif text-[40px] leading-none text-ink-900 dark:text-neutral-50 tabular-nums">+{todayReward.exp}</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-neutral-500">EXP</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {todayReward.levelBonusCoins > 0 ? (
            <Pill tone="gold" icon="toll">+{todayReward.levelBonusCoins} bonus coins · level perk</Pill>
          ) : null}
          {campaign?.expMultiplier && campaign.expMultiplier !== 1 ? (
            <Pill tone="gold" icon="trending_up">×{campaign.expMultiplier} EXP · {campaign.name}</Pill>
          ) : null}
          {todayReward.campaignCoins > 0 ? (
            <Pill tone="gold" icon="toll">+{todayReward.campaignCoins} coins · {campaign?.name}</Pill>
          ) : null}
          {milestoneToday ? (
            <Pill tone="violet" icon="redeem">Choose 1 of {status.milestones[todayReward.milestone].options.length} rewards</Pill>
          ) : null}
        </div>

        <p className="mt-4 text-[14px] leading-relaxed text-ink-600 dark:text-neutral-400">
          {claimedToday
            ? `Come back after the daily reset to claim Day ${nextDay}. Missing a day resets the streak to 1, but nothing you earned is ever taken away.`
            : 'Rewards are never claimed automatically — tap the button once a day to add EXP and keep the streak counting.'}
        </p>

        {pending ? (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-gold/50 bg-gold/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold text-ink-900">
                <Icon name="redeem" size={22} filled />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-ink-900 dark:text-neutral-50">
                  {pending.displayDay === 14 ? 'Day 14 major milestone reward is waiting' : 'Day 7 milestone reward is waiting'}
                </p>
                <p className="text-[12px] text-ink-600 dark:text-neutral-400">
                  Pick one reward · streak {pending.streak} · {pending.date}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenMilestone(pending)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink-900 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-ink-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              Choose reward
              <Icon name="arrow_forward" size={16} />
            </button>
          </div>
        ) : null}

        <div className="mt-auto pt-6">
          {claimedToday ? (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Icon name="check" size={20} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-ink-900 dark:text-neutral-100">Next check-in in</p>
                  <p className="text-[12px] text-ink-500 dark:text-neutral-500">Daily reset at midnight ({status.timezone})</p>
                </div>
              </div>
              <p className="shrink-0 whitespace-nowrap font-serif text-[24px] tabular-nums text-ink-900 dark:text-neutral-50">
                {formatDuration(secondsToReset, { withSeconds: secondsToReset < 3600 })}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClaim}
              disabled={claiming || status.enabled === false}
              className={cn(
                'group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl px-6 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] transition-all',
                'bg-ink-900 text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60',
                'dark:bg-white dark:text-black dark:hover:bg-neutral-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black',
              )}
            >
              <Icon name={claiming ? 'progress_activity' : 'local_fire_department'} filled size={20} className={cn(claiming && 'animate-spin', !claiming && 'text-gold')} />
              {claiming ? 'Claiming…' : status.enabled === false ? 'Check-in paused' : `Claim Day ${todayReward.day} · +${todayReward.exp} EXP`}
            </button>
          )}
          {!claimedToday ? (
            <p className="mt-3 text-center text-[11px] text-ink-400 dark:text-neutral-500">
              Resets in {formatDuration(secondsToReset)} · {status.today} ({status.timezone})
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
