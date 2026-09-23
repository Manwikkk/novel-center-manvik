'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import AuthGuard from '@/components/layout/AuthGuard';
import Icon from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { tasksApi } from '@/lib/tasksApi';
import { cn } from '@/lib/cn';

const GROUP_ICONS = {
  getting_started: 'flag',
  daily: 'today',
  weekly: 'date_range',
  monthly: 'calendar_month',
};

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

function ProgressBar({ current, target }) {
  const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" aria-hidden>
      <div className="h-full rounded-full bg-ink-900 dark:bg-neutral-100" style={{ width: `${pct}%` }} />
    </div>
  );
}

function TaskCard({ task }) {
  return (
    <article className={cn(
      'rounded-2xl border p-4 sm:p-5',
      task.completed
        ? 'border-neutral-200/80 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40'
        : 'border-neutral-200/80 bg-white shadow-editorial-card dark:border-neutral-800 dark:bg-neutral-950',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn(
            'font-serif text-[20px] leading-tight text-ink-900 dark:text-neutral-50',
            task.completed && 'text-ink-500 dark:text-neutral-400',
          )}>
            {task.title}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-600 dark:text-neutral-400">{task.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-neutral-500">
            {task.completed ? 'Done' : 'EXP'}
          </p>
          <p className="mt-1 font-serif text-[22px] leading-none text-ink-900 dark:text-neutral-50">
            {task.completed ? <Icon name="check_circle" filled size={22} className="text-emerald-600 dark:text-emerald-400" /> : `+${task.expReward}`}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <ProgressBar current={task.progress} target={task.target} />
        </div>
        <p className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-800 dark:text-neutral-200" aria-label={`Progress ${task.progressLabel}`}>
          {task.progressLabel}
        </p>
      </div>
    </article>
  );
}

function TasksInner() {
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBoard(await tasksApi.board());
    } catch (err) {
      setBoard(null);
      setError(err.message || 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f5f2] dark:bg-black">
      <SiteHeader variant="solid" />
      <main className="mx-auto w-full max-w-shell flex-1 px-4 pb-20 pt-28 md:px-edge md:pt-32">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-sm uppercase text-ink-500 dark:text-neutral-500">Tasks</p>
            <h1 className="mt-2 font-serif text-[34px] leading-[1.1] text-ink-900 dark:text-neutral-50 md:text-[44px]">
              What to do next
            </h1>
          </div>
          <p className="max-w-md text-[14px] leading-relaxed text-ink-600 dark:text-neutral-400">
            Getting Started, today, this week, and this month. Finished goals sink to the bottom of their group. Rewards are Reader EXP only.
          </p>
        </div>
        <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-ink-500 dark:text-neutral-500">
          Daily Check-In is claimed on the{' '}
          <Link href="/check-in" className="underline underline-offset-2">check-in page</Link>.
          Achievements stay on your{' '}
          <Link href="/account?tab=achievements" className="underline underline-offset-2">profile</Link>.
          Limited campaigns live in{' '}
          <Link href="/events" className="underline underline-offset-2">Events</Link>.
          {board?.timezone ? ` Resets use ${board.timezone}.` : ''}
        </p>

        {loading ? <div className="mt-8"><PageSkeleton /></div> : null}

        {!loading && error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-white p-6 dark:border-red-900/50 dark:bg-neutral-950" role="alert">
            <p className="font-serif text-[22px] text-ink-900 dark:text-neutral-50">Tasks could not be loaded</p>
            <p className="mt-2 text-[14px] text-ink-600 dark:text-neutral-400">{error}</p>
            <button type="button" onClick={load} className="mt-4 rounded-full bg-ink-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-white dark:bg-white dark:text-black">
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !error && board ? (
          <div className="mt-8 space-y-10">
            {board.groups.map((group) => (
              <section key={group.key} aria-labelledby={`tasks-${group.key}`}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold-dim dark:text-gold">
                      <Icon name={GROUP_ICONS[group.key] || 'task_alt'} filled size={22} />
                    </span>
                    <div>
                      <h2 id={`tasks-${group.key}`} className="font-serif text-[26px] leading-tight text-ink-900 dark:text-neutral-50">
                        {group.label}
                      </h2>
                      <p className="text-[13px] text-ink-500 dark:text-neutral-500">{group.description}</p>
                    </div>
                  </div>
                  {group.resetsAt ? (
                    <p className="text-[12px] uppercase tracking-widest text-ink-400 dark:text-neutral-500">
                      Resets {new Date(group.resetsAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                {group.tasks.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-neutral-300 px-5 py-8 text-[14px] text-ink-500 dark:border-neutral-700 dark:text-neutral-400">
                    Nothing is active in {group.label.toLowerCase()} right now.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {group.tasks.map((task) => <TaskCard key={task.id} task={task} />)}
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

export default function TasksPage() {
  return (
    <AuthGuard>
      <TasksInner />
    </AuthGuard>
  );
}
