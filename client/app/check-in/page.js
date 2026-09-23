'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import AuthGuard from '@/components/layout/AuthGuard';
import Icon from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import StreakHero from '@/components/checkin/StreakHero';
import RewardTrack from '@/components/checkin/RewardTrack';
import MilestoneModal from '@/components/checkin/MilestoneModal';
import ActivatePassModal from '@/components/checkin/ActivatePassModal';
import RewardInventory from '@/components/checkin/RewardInventory';
import CheckInCalendar from '@/components/checkin/CheckInCalendar';
import { RewardIcon } from '@/components/checkin/RewardOptionCard';
import { checkinApi } from '@/lib/checkinApi';
import { useUiStore } from '@/stores/uiStore';
import { useWalletStore } from '@/stores/walletStore';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { refreshEngagementSurface } from '@/components/engagement/EngagementHost';

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
      <Skeleton className="h-[300px] rounded-2xl" />
    </div>
  );
}

function InfoCard({ eyebrow, title, children, icon }) {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-editorial-card dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold-dim dark:text-gold">
          <Icon name={icon} filled size={22} />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-neutral-500">{eyebrow}</p>
          <h3 className="font-serif text-[19px] leading-tight text-ink-900 dark:text-neutral-50">{title}</h3>
        </div>
      </div>
      <div className="mt-4 text-[13px] leading-relaxed text-ink-600 dark:text-neutral-400">{children}</div>
    </div>
  );
}

function OptionList({ options }) {
  return (
    <ul className="space-y-2">
      {options.map((o) => (
        <li key={o.key} className="flex items-start gap-2.5">
          <RewardIcon type={o.type} size={16} className="mt-0.5 h-7 w-7 rounded-lg" />
          <div>
            <p className="font-semibold text-ink-900 dark:text-neutral-100">{o.title}</p>
            <p className="text-[12px]">{o.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CheckInInner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const searchParams = useSearchParams();

  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [milestone, setMilestone] = useState(null);
  const [activating, setActivating] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [infoDay, setInfoDay] = useState(null);
  const [fullInventory, setFullInventory] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await checkinApi.status();
      setStatus(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load your check-in');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Deep-link from combined celebration "Choose reward".
  useEffect(() => {
    if (!status || searchParams?.get('milestone') !== '1') return;
    const pending = status.pendingMilestones?.[0];
    if (pending) setMilestone(pending);
  }, [status, searchParams]);

  async function claim() {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await checkinApi.claim();
      setStatus(res.status);
      setHistoryKey((k) => k + 1);
      const c = res.claim;
      if (c.campaignCoins) refreshWallet();
      // Milestone choice is opened from the celebration CTA (?milestone=1) or
      // StreakHero — do not stack MilestoneModal under the celebration popup.
      refreshEngagementSurface();
    } catch (err) {
      if (err.status === 409) {
        pushToast({ type: 'info', title: 'Already claimed today' });
        load();
      } else {
        pushToast({ type: 'error', title: 'Check-in failed', message: err.message });
      }
    } finally {
      setClaiming(false);
    }
  }

  function onMilestoneClaimed(res) {
    if (res.status) setStatus(res.status);
    setHistoryKey((k) => k + 1);
    if (res.reward?.type === 'COINS') refreshWallet();
  }

  function onActivated(res) {
    setActivating(null);
    setFullInventory(res.inventory.items);
    refreshEngagementSurface();
    checkinApi.status().then(setStatus).catch(() => {});
  }

  // The status payload carries only live rewards; the full inventory (used /
  // expired history included) is fetched whenever those change.
  const liveCount = (status?.inventory?.availableCount || 0) + (status?.inventory?.activePasses?.length || 0);
  useEffect(() => {
    if (!status) return;
    checkinApi.rewards().then((d) => setFullInventory(d.items)).catch(() => {});
  }, [liveCount, status?.claimedToday]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = fullInventory || (status ? [...status.inventory.activePasses, ...status.inventory.available] : []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f5f2] dark:bg-black">
      <SiteHeader variant="solid" />

      <main className="mx-auto w-full max-w-shell flex-1 px-4 pb-20 pt-28 md:px-edge md:pt-32">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-sm uppercase text-ink-500 dark:text-neutral-500">Daily check-in</p>
            <h1 className="mt-2 font-serif text-[34px] leading-[1.1] text-ink-900 dark:text-neutral-50 md:text-[44px]">
              Come back every day.<br className="hidden sm:block" /> Keep the streak alive.
            </h1>
          </div>
          <p className="max-w-md text-[14px] leading-relaxed text-ink-600 dark:text-neutral-400">
            One manual claim per day earns Reader EXP. Every 7th and 14th day of the cycle unlocks a milestone reward you choose yourself.
          </p>
        </div>

        {status?.campaign ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/50 bg-gradient-to-r from-gold/20 via-gold/10 to-transparent px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-ink-900">
              <Icon name="celebration" filled size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink-900 dark:text-neutral-50">{status.campaign.name}</p>
              <p className="text-[12px] text-ink-600 dark:text-neutral-400">
                {[
                  status.campaign.expMultiplier !== 1 ? `×${status.campaign.expMultiplier} EXP on every check-in` : null,
                  status.campaign.bonusCoins ? `+${status.campaign.bonusCoins} coins per check-in` : null,
                  status.campaign.novelPassHours ? `${status.campaign.novelPassHours}-hour Novel Passes at milestones` : null,
                  status.campaign.description || null,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-neutral-500">
              Ends {formatDate(status.campaign.endsAt)}
            </p>
          </div>
        ) : null}

        <div className="mt-8 space-y-6">
          {!status && !error ? <PageSkeleton /> : null}
          {error && !status ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6 text-center text-danger">{error}</div>
          ) : null}

          {status ? (
            <>
              <StreakHero
                status={status}
                claiming={claiming}
                onClaim={claim}
                onOpenMilestone={(p) => setMilestone(p)}
              />

              <RewardTrack track={status.track} cycle={status.cycle} onMilestoneInfo={setInfoDay} />

              {infoDay ? (
                <div className="rounded-2xl border border-gold/50 bg-gold/5 p-5 dark:bg-gold/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-dim dark:text-gold">Day {infoDay.day} · {infoDay.milestoneTitle}</p>
                      <p className="mt-1 text-[14px] text-ink-700 dark:text-neutral-300">Claim Day {infoDay.day} and pick one of these rewards. The choice is final once issued.</p>
                    </div>
                    <button type="button" onClick={() => setInfoDay(null)} aria-label="Close" className="text-ink-400 hover:text-ink-900 dark:hover:text-white">
                      <Icon name="close" size={20} />
                    </button>
                  </div>
                  <div className="mt-4">
                    <OptionList options={status.milestones[infoDay.milestone].options} />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-3">
                <InfoCard eyebrow="Day 7" title={status.milestones.day7.title} icon="redeem">
                  <OptionList options={status.milestones.day7.options} />
                </InfoCard>
                <InfoCard eyebrow="Day 14" title={status.milestones.day14.title} icon="workspace_premium">
                  <OptionList options={status.milestones.day14.options} />
                </InfoCard>
                <InfoCard eyebrow="Rare" title={`${status.luckyPass.hours}-hour Platform Pass`} icon="auto_awesome">
                  <p>
                    {status.luckyPass.enabled
                      ? `A rare lucky reward: from a ${status.luckyPass.minStreak}-day streak onwards any claim can drop it, and a chosen Novel Pass can be upgraded to it. It opens eligible locked chapters across the whole platform for ${status.luckyPass.hours} hours.`
                      : 'Currently not in rotation. Watch this space during special events.'}
                  </p>
                  <ul className="mt-3 space-y-1.5 text-[12px]">
                    <li className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 text-gold-dim" /> Streaks never cap — the display simply wraps every 14 days.</li>
                    <li className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 text-gold-dim" /> A missed day resets the streak to 1; rewards, EXP and coins stay yours.</li>
                    <li className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 text-gold-dim" /> Passes start on activation and never stack with each other.</li>
                  </ul>
                </InfoCard>
              </div>

              <RewardInventory items={items} onActivate={(r) => setActivating(r)} />

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <CheckInCalendar today={status.today} refreshKey={historyKey} />

                <section aria-label="Recent check-ins" className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-editorial-card dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500 dark:text-neutral-500">Activity</p>
                  <h2 className="mt-1 font-serif text-[22px] leading-tight text-ink-900 dark:text-neutral-50">Recent check-ins</h2>
                  {status.recent?.length ? (
                    <ul className="mt-4 divide-y divide-neutral-200/70 dark:divide-neutral-800">
                      {status.recent.slice(0, 10).map((r) => (
                        <li key={r.id} className="flex items-center gap-3 py-3">
                          <span className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums',
                            r.milestone ? 'bg-gold text-ink-900' : 'bg-neutral-100 text-ink-700 dark:bg-neutral-900 dark:text-neutral-200',
                          )}>
                            {r.displayDay}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-ink-900 dark:text-neutral-100">
                              {formatDate(r.date)} · streak {r.streak}
                            </p>
                            <p className="truncate text-[12px] text-ink-500 dark:text-neutral-500">
                              {r.milestone
                                ? r.milestoneClaimed ? `Milestone · ${r.rewardTitle}` : 'Milestone · reward not chosen yet'
                                : 'Daily claim'}
                              {r.lucky ? ' · lucky drop' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-serif text-[18px] leading-none text-ink-900 tabular-nums dark:text-neutral-50">+{r.exp}</p>
                            <p className="text-[10px] uppercase tracking-widest text-ink-400 dark:text-neutral-500">exp{r.bonusCoins ? ` · +${r.bonusCoins}c` : ''}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-[13px] text-ink-500 dark:text-neutral-500">No check-ins yet. Claim your first reward above.</p>
                  )}
                  <p className="mt-4 text-[12px] text-ink-500 dark:text-neutral-500">
                    EXP feeds your reader level — see it on your <Link href="/account" className="font-semibold text-ink-900 underline-offset-4 hover:underline dark:text-neutral-100">profile</Link>.
                  </p>
                </section>
              </div>
            </>
          ) : null}
        </div>
      </main>

      <MilestoneModal
        pending={milestone}
        open={!!milestone}
        onClose={() => setMilestone(null)}
        onClaimed={onMilestoneClaimed}
        onActivatePass={(reward) => { setMilestone(null); setActivating(reward); }}
      />
      <ActivatePassModal
        reward={activating}
        open={!!activating}
        onClose={() => setActivating(null)}
        onActivated={onActivated}
      />

      <SiteFooter />
    </div>
  );
}

export default function CheckInPage() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <CheckInInner />
      </Suspense>
    </AuthGuard>
  );
}
