'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Badge from '@/components/badges/Badge';
import { categoryMeta, tierFor, formatEarnedDate } from '@/lib/badges';
import { cn } from '@/lib/cn';

const TIER_STYLES = {
  legendary: 'bg-gold/20 text-gold-dim dark:text-gold',
  rare: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  common: 'bg-neutral-200 text-ink-700 dark:bg-neutral-800 dark:text-neutral-300',
  special: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
};

/**
 * Badge detail: big medallion, how it is earned, progress (owner) and the
 * showcase pin toggle. Also the place to share a badge.
 */
export default function BadgeDetailModal({
  badge,
  open,
  onClose,
  isOwner = false,
  canPin = true,
  pinBusy = false,
  onTogglePin,
  shareUrl,
}) {
  const [copied, setCopied] = useState(false);
  if (!badge) return null;

  const tier = tierFor(badge);
  const cat = categoryMeta(badge.category);
  const earned = !!badge.earned;
  const progress = badge.progress || null;

  async function share() {
    const text = `I earned the “${badge.title}” badge on Novel Centre`;
    try {
      if (navigator.share) {
        await navigator.share({ title: badge.title, text, url: shareUrl || window.location.href });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} — ${shareUrl || window.location.href}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch (_e) { /* cancelled */ }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      footer={
        <>
          {earned ? (
            <Button variant="secondary" size="md" onClick={share}>
              <Icon name={copied ? 'check' : 'ios_share'} size={16} className="mr-2" />
              {copied ? 'Copied' : 'Share'}
            </Button>
          ) : null}
          {isOwner && earned ? (
            <Button
              variant={badge.pinned ? 'secondary' : 'primary'}
              size="md"
              disabled={pinBusy || (!badge.pinned && !canPin)}
              onClick={() => onTogglePin?.(badge)}
              title={!badge.pinned && !canPin ? 'Your showcase is full — unpin a badge first' : undefined}
            >
              <Icon name={badge.pinned ? 'keep_off' : 'keep'} size={16} className="mr-2" />
              {pinBusy ? 'Saving…' : badge.pinned ? 'Unpin from showcase' : 'Pin to showcase'}
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={onClose}>Close</Button>
          )}
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className={cn('absolute inset-0 -m-6 rounded-full blur-2xl', earned ? 'bg-gold/25' : 'bg-neutral-400/20')} aria-hidden="true" />
          <Badge badge={badge} size="xl" className={cn(earned && 'badge-float')} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest', TIER_STYLES[tier.key])}>{tier.label}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-600 dark:bg-neutral-800 dark:text-neutral-300">
            <Icon name={cat.icon} size={12} filled /> {cat.label}
          </span>
          {badge.xpReward ? (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-600 dark:bg-neutral-800 dark:text-neutral-300">
              +{badge.xpReward} EXP
            </span>
          ) : null}
        </div>
        <h2 className="mt-3 font-serif text-[28px] leading-tight text-ink-900 dark:text-neutral-50">{badge.title}</h2>
        <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-ink-600 dark:text-neutral-400">{badge.description}</p>

        {earned ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
            <Icon name="verified" size={16} filled /> Earned {formatEarnedDate(badge.earnedAt)}
            {badge.pinned ? ' · in your showcase' : ''}
          </p>
        ) : progress && progress.current != null ? (
          <div className="mt-5 w-full max-w-sm">
            <div className="flex items-center justify-between text-[12px] text-ink-600 dark:text-neutral-400">
              <span>Progress</span>
              <span className="tabular-nums font-semibold text-ink-900 dark:text-neutral-100">{progress.current} / {progress.target}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-700" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="mt-2 text-[12px] text-ink-500 dark:text-neutral-500">
              {progress.target - progress.current} to go
            </p>
          </div>
        ) : (
          <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-500 dark:text-neutral-500">
            <Icon name="lock" size={16} filled /> Not earned yet
          </p>
        )}
      </div>
    </Modal>
  );
}
