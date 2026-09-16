'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/ui/Icon';
import Badge from '@/components/badges/Badge';
import BadgeDetailModal from '@/components/badges/BadgeDetailModal';
import { profileApi } from '@/lib/profileApi';
import { useUiStore } from '@/stores/uiStore';
import { CATEGORY_ORDER, categoryMeta, tierFor, formatEarnedDate } from '@/lib/badges';
import { cn } from '@/lib/cn';

const TIER_DOT = {
  legendary: 'bg-gold',
  rare: 'bg-violet-500',
  common: 'bg-neutral-400',
  special: 'bg-sky-500',
};

function CompletionRing({ earned, total }) {
  const pct = total ? Math.round((earned / total) * 100) : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[84px] w-[84px] shrink-0">
      <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" strokeWidth="7" className="stroke-white/15" />
        <circle
          cx="38" cy="38" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
          className="stroke-gold transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-[20px] leading-none text-white tabular-nums">{pct}%</span>
        <span className="text-[9px] uppercase tracking-widest text-white/60">done</span>
      </div>
    </div>
  );
}

function BadgeCard({ badge, onOpen }) {
  const tier = tierFor(badge);
  const cat = categoryMeta(badge.category);
  const p = badge.progress;
  return (
    <button
      type="button"
      onClick={() => onOpen(badge)}
      className={cn(
        'group flex flex-col items-center rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-editorial-card',
        badge.earned
          ? 'border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-950'
          : 'border-dashed border-neutral-300 bg-white/70 dark:border-neutral-700 dark:bg-neutral-950/60',
      )}
    >
      <div className="relative">
        <Badge badge={badge} size="lg" />
        {badge.pinned ? (
          <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-white shadow dark:bg-white dark:text-black" title="In your showcase">
            <Icon name="keep" size={14} filled />
          </span>
        ) : null}
      </div>
      <p className={cn('mt-3 text-[13px] font-semibold leading-tight', badge.earned ? 'text-ink-900 dark:text-neutral-100' : 'text-ink-500 dark:text-neutral-400')}>
        {badge.title}
      </p>
      <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400 dark:text-neutral-500">
        <span className={cn('h-1.5 w-1.5 rounded-full', TIER_DOT[tier.key])} /> {tier.label} · {cat.label}
      </p>
      {badge.earned ? (
        <p className="mt-2 text-[11px] text-ink-500 dark:text-neutral-500">Earned {formatEarnedDate(badge.earnedAt)}</p>
      ) : p && p.current != null ? (
        <div className="mt-2 w-full">
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold" style={{ width: `${p.percent}%` }} />
          </div>
          <p className="mt-1 text-[11px] tabular-nums text-ink-500 dark:text-neutral-500">{p.current} / {p.target}</p>
        </div>
      ) : (
        <p className="mt-2 line-clamp-2 text-[11px] text-ink-500 dark:text-neutral-500">{badge.description}</p>
      )}
    </button>
  );
}

/**
 * Achievements tab: completion summary, category filters, nearly-there strip
 * and the badge grid. Clicking a badge opens its detail (pin / share).
 */
export default function BadgeGallery({ payload, loading, isOwner, profile, onShowcaseChange }) {
  const pushToast = useUiStore((s) => s.pushToast);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('all');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState(null);
  const [pinBusy, setPinBusy] = useState(false);

  const items = payload?.items || [];
  const summary = payload?.summary || { earned: 0, total: items.length, xpFromBadges: 0, pinned: 0, showcaseMax: 4 };

  const categories = useMemo(() => {
    const counts = {};
    for (const b of items) counts[b.category] = (counts[b.category] || 0) + 1;
    return CATEGORY_ORDER.filter((c) => counts[c]).map((c) => ({ key: c, count: counts[c], ...categoryMeta(c) }));
  }, [items]);

  const visible = useMemo(() => {
    let list = items;
    if (filter !== 'all') list = list.filter((b) => b.category === filter);
    if (view === 'earned') list = list.filter((b) => b.earned);
    if (view === 'locked') list = list.filter((b) => !b.earned);
    const sorted = [...list];
    if (sort === 'recent') {
      sorted.sort((a, b) => Number(b.earned) - Number(a.earned) || new Date(b.earnedAt || 0) - new Date(a.earnedAt || 0) || (b.progress?.percent || 0) - (a.progress?.percent || 0));
    } else if (sort === 'progress') {
      sorted.sort((a, b) => Number(a.earned) - Number(b.earned) || (b.progress?.percent || 0) - (a.progress?.percent || 0));
    } else if (sort === 'xp') {
      sorted.sort((a, b) => b.xpReward - a.xpReward);
    }
    return sorted;
  }, [items, filter, view, sort]);

  const nearlyThere = useMemo(
    () => items.filter((b) => !b.earned && b.progress?.current != null && b.progress.percent > 0)
      .sort((a, b) => b.progress.percent - a.progress.percent)
      .slice(0, 3),
    [items],
  );

  async function togglePin(badge) {
    if (!isOwner) return;
    setPinBusy(true);
    try {
      const pinned = items.filter((b) => b.pinned).sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0)).map((b) => b.code);
      const next = badge.pinned ? pinned.filter((c) => c !== badge.code) : [...pinned, badge.code].slice(0, summary.showcaseMax || 4);
      const res = await profileApi.setBadgeShowcase(next);
      onShowcaseChange?.(res);
      const fresh = res.items.find((b) => b.code === badge.code);
      if (fresh) setSelected(fresh);
      pushToast({ type: 'success', title: badge.pinned ? 'Removed from showcase' : 'Pinned to your showcase' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update showcase', message: err.message });
    } finally {
      setPinBusy(false);
    }
  }

  const shareUrl = typeof window !== 'undefined' && profile?.id ? `${window.location.origin}/users/${profile.id}` : undefined;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="flex flex-col gap-5 rounded-2xl bg-ink-900 p-5 text-white shadow-editorial-card dark:bg-neutral-900 sm:flex-row sm:items-center sm:p-6">
        <CompletionRing earned={summary.earned} total={summary.total || items.length} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Badge collection</p>
          <p className="mt-1 font-serif text-[26px] leading-tight">
            {summary.earned} of {summary.total || items.length} badges earned
          </p>
          <p className="mt-1 text-[13px] text-white/65">
            {summary.xpFromBadges} EXP collected from badges · {summary.pinned}/{summary.showcaseMax} showcased
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {[
            { label: 'Legendary', value: items.filter((b) => b.earned && tierFor(b).key === 'legendary').length, dot: 'bg-gold' },
            { label: 'Rare', value: items.filter((b) => b.earned && tierFor(b).key === 'rare').length, dot: 'bg-violet-400' },
            { label: 'Common', value: items.filter((b) => b.earned && tierFor(b).key === 'common').length, dot: 'bg-neutral-300' },
          ].map((t) => (
            <div key={t.label} className="text-center">
              <p className="font-serif text-[24px] leading-none tabular-nums">{t.value}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/60"><span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nearly there */}
      {isOwner && nearlyThere.length ? (
        <section className="rounded-2xl border border-gold/40 bg-gold/5 p-4 dark:bg-gold/10 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dim dark:text-gold">Nearly there</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {nearlyThere.map((b) => (
              <button key={b.code} type="button" onClick={() => setSelected(b)} className="flex items-center gap-3 rounded-xl bg-white/80 p-3 text-left transition-colors hover:bg-white dark:bg-neutral-950/70 dark:hover:bg-neutral-950">
                <Badge badge={b} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink-900 dark:text-neutral-100">{b.title}</span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <span className="block h-full rounded-full bg-gold" style={{ width: `${b.progress.percent}%` }} />
                  </span>
                  <span className="mt-1 block text-[11px] tabular-nums text-ink-500 dark:text-neutral-500">{b.progress.current} / {b.progress.target} · {b.progress.target - b.progress.current} to go</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilter('all')} className={cn('rounded-full px-3 py-1.5 text-[12px] font-semibold', filter === 'all' ? 'bg-ink-900 text-white dark:bg-white dark:text-black' : 'bg-white text-ink-600 dark:bg-neutral-900 dark:text-neutral-400')}>
            All · {items.length}
          </button>
          {categories.map((c) => (
            <button key={c.key} type="button" onClick={() => setFilter(c.key)} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold', filter === c.key ? 'bg-ink-900 text-white dark:bg-white dark:text-black' : 'bg-white text-ink-600 dark:bg-neutral-900 dark:text-neutral-400')}>
              <Icon name={c.icon} size={14} filled /> {c.label} · {c.count}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-full bg-white p-0.5 dark:bg-neutral-900">
            {['all', 'earned', 'locked'].map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={cn('rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest', view === v ? 'bg-neutral-200 text-ink-900 dark:bg-neutral-700 dark:text-white' : 'text-ink-500 dark:text-neutral-400')}>
                {v}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300" aria-label="Sort badges">
            <option value="recent">Recently earned</option>
            <option value="progress">Closest to earning</option>
            <option value="xp">Highest EXP</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-ink-500">Loading…</p>
      ) : visible.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((b) => <BadgeCard key={b.id || b.code} badge={b} onOpen={setSelected} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-950">
          <p className="text-[16px] font-semibold text-ink-900 dark:text-neutral-100">Nothing here yet</p>
          <p className="mt-1 text-[13px] text-ink-500 dark:text-neutral-500">Keep reading, checking in and joining the conversation to unlock badges.</p>
        </div>
      )}

      <BadgeDetailModal
        badge={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        isOwner={isOwner}
        canPin={summary.pinned < (summary.showcaseMax || 4)}
        pinBusy={pinBusy}
        onTogglePin={togglePin}
        shareUrl={shareUrl}
      />
    </div>
  );
}
