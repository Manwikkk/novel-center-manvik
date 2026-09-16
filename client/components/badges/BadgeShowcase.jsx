'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/badges/Badge';
import BadgeDetailModal from '@/components/badges/BadgeDetailModal';
import { profileApi } from '@/lib/profileApi';
import { useUiStore } from '@/stores/uiStore';
import { tierFor } from '@/lib/badges';
import { cn } from '@/lib/cn';

const MAX = 4;

/** Pick up to four earned badges for the showcase; order = tap order. */
function ShowcasePicker({ open, onClose, badges, initial, onSave, busy }) {
  const [codes, setCodes] = useState(initial);
  const toggle = (code) => setCodes((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : cur.length >= MAX ? cur : [...cur, code]));
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      size="lg"
      title="Showcase badges"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" size="md" onClick={() => onSave(codes)} disabled={busy}>{busy ? 'Saving…' : `Save showcase (${codes.length}/${MAX})`}</Button>
        </>
      }
    >
      <p className="text-[14px] text-ink-600 dark:text-neutral-400">
        Choose up to {MAX} badges to pin at the top of your profile. Tap in the order you want them shown.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {badges.map((b) => {
          const idx = codes.indexOf(b.code);
          return (
            <button
              key={b.code}
              type="button"
              onClick={() => toggle(b.code)}
              className={cn(
                'relative flex flex-col items-center rounded-xl border p-3 transition-colors',
                idx >= 0 ? 'border-ink-900 bg-ink-900/5 dark:border-white dark:bg-white/10' : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900',
              )}
            >
              {idx >= 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-ink-900 shadow">{idx + 1}</span>
              ) : null}
              <Badge badge={b} size="sm" />
              <span className="mt-2 line-clamp-2 text-center text-[11px] font-semibold text-ink-800 dark:text-neutral-200">{b.title}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/**
 * Profile overview badge section: showcased medals on a plinth, the rest of
 * the collection as a compact strip, and showcase management for the owner.
 */
export default function BadgeShowcase({ badges = [], isOwner, profile, onChange, onViewAll }) {
  const pushToast = useUiStore((s) => s.pushToast);
  const [selected, setSelected] = useState(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const earned = useMemo(() => badges.filter((b) => b.earned !== false), [badges]);
  const pinned = useMemo(
    () => earned.filter((b) => b.pinned).sort((a, b) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0)),
    [earned],
  );
  const showcase = pinned.length
    ? pinned
    : [...earned].sort((a, b) => b.xpReward - a.xpReward || new Date(b.earnedAt || 0) - new Date(a.earnedAt || 0)).slice(0, MAX);
  const rest = earned.filter((b) => !showcase.some((s) => s.code === b.code));
  const legendary = earned.filter((b) => tierFor(b).key === 'legendary').length;

  async function saveShowcase(codes) {
    setBusy(true);
    try {
      const res = await profileApi.setBadgeShowcase(codes);
      onChange?.(res);
      setPicker(false);
      pushToast({ type: 'success', title: 'Showcase updated' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update showcase', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(badge) {
    const codes = pinned.map((b) => b.code);
    const next = badge.pinned ? codes.filter((c) => c !== badge.code) : [...codes, badge.code].slice(0, MAX);
    setBusy(true);
    try {
      const res = await profileApi.setBadgeShowcase(next);
      onChange?.(res);
      const fresh = res.items.find((b) => b.code === badge.code);
      if (fresh) setSelected(fresh);
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update showcase', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  const shareUrl = typeof window !== 'undefined' && profile?.id ? `${window.location.origin}/users/${profile.id}` : undefined;

  return (
    <section aria-label="Badges">
      <div className="flex items-end justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-[18px] font-bold text-ink-900 dark:text-neutral-100">
          Badges
          <span className="text-[14px] font-semibold text-ink-400">{earned.length}</span>
          {legendary ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gold-dim dark:text-gold">
              <Icon name="auto_awesome" size={12} filled /> {legendary} legendary
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-3">
          {isOwner && earned.length ? (
            <button type="button" onClick={() => setPicker(true)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1e80ff]">
              <Icon name="keep" size={14} /> {pinned.length ? 'Edit showcase' : 'Choose showcase'}
            </button>
          ) : null}
          {onViewAll ? (
            <button type="button" onClick={onViewAll} className="text-[12px] font-semibold text-[#1e80ff]">View all</button>
          ) : null}
        </div>
      </div>

      {earned.length ? (
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
          {/* Plinth */}
          <div className="relative bg-gradient-to-b from-ink-900 via-[#17171a] to-[#101012] px-4 pb-5 pt-6 text-white dark:from-neutral-900 dark:via-neutral-950 dark:to-black sm:px-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(194,168,120,0.28),transparent_60%)]" />
            <p className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">{pinned.length ? 'Showcase' : 'Highlights'}</p>
            <div className="relative mt-4 flex flex-wrap items-start justify-center gap-6 sm:gap-10">
              {showcase.map((b, i) => (
                <div key={b.code} className="flex w-[104px] flex-col items-center text-center">
                  <Badge badge={b} size="lg" onClick={() => setSelected(b)} className={cn(i === 0 && 'badge-float')} />
                  <p className="mt-3 line-clamp-2 text-[12px] font-semibold leading-tight">{b.title}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/50">{tierFor(b).label}</p>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          </div>

          {rest.length ? (
            <div className="flex items-center gap-3 overflow-x-auto px-4 py-3 no-scrollbar sm:px-6">
              {rest.map((b) => (
                <Badge key={b.code} badge={b} size="sm" onClick={() => setSelected(b)} showTooltip />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center dark:border-neutral-700 dark:bg-neutral-950">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-ink-400 dark:bg-neutral-900">
            <Icon name="military_tech" size={28} />
          </div>
          <p className="mt-3 text-[15px] font-semibold text-ink-900 dark:text-neutral-100">No badges yet</p>
          <p className="mt-1 text-[13px] text-ink-500 dark:text-neutral-500">
            {isOwner ? 'Read a chapter, check in daily or leave a review to earn your first badge.' : 'This reader has not earned any badges yet.'}
          </p>
        </div>
      )}

      <BadgeDetailModal
        badge={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        isOwner={isOwner}
        canPin={pinned.length < MAX}
        pinBusy={busy}
        onTogglePin={togglePin}
        shareUrl={shareUrl}
      />
      {picker ? (
        <ShowcasePicker
          open={picker}
          onClose={() => setPicker(false)}
          badges={earned}
          initial={pinned.map((b) => b.code)}
          onSave={saveShowcase}
          busy={busy}
        />
      ) : null}
    </section>
  );
}
