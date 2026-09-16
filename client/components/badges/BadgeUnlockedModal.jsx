'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import Badge from '@/components/badges/Badge';
import { tierFor, categoryMeta, themeFor } from '@/lib/badges';
import { cn } from '@/lib/cn';

const SPARKS = 14;

/**
 * Celebration for freshly earned badges: the medal pops in with a burst of
 * sparkles; several badges are stepped through one at a time.
 */
export default function BadgeUnlockedModal({ badges = [], open, onClose }) {
  const [index, setIndex] = useState(0);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setBurst((n) => n + 1);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const badge = badges[index] || null;
  const theme = badge ? themeFor(badge) : null;
  const sparks = useMemo(() => Array.from({ length: SPARKS }, (_, i) => {
    const angle = (i / SPARKS) * Math.PI * 2 + (burst % 2 ? 0.2 : 0);
    const dist = 90 + (i % 3) * 28;
    return { dx: `${Math.round(Math.cos(angle) * dist)}px`, dy: `${Math.round(Math.sin(angle) * dist)}px`, delay: `${1700 + (i % 5) * 60}ms`, size: 6 + (i % 3) * 3 };
  }), [burst]);

  if (!open || !badge) return null;
  const tier = tierFor(badge);
  const cat = categoryMeta(badge.category);
  const last = index >= badges.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Badge unlocked: ${badge.title}`}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-ink-900 p-8 text-center text-white shadow-editorial-modal"
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 35%, ${theme.glow} 0%, transparent 55%)` }} />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">Badge unlocked</p>

        <div className="relative mx-auto mt-6 flex h-[180px] w-[180px] items-center justify-center" key={`${badge.code}-${burst}`}>
          {sparks.map((sp, i) => (
            <span
              key={i}
              className="badge-sparkle absolute left-1/2 top-1/2 rounded-full"
              style={{ '--dx': sp.dx, '--dy': sp.dy, animationDelay: sp.delay, width: sp.size, height: sp.size, background: i % 2 ? '#f6e27a' : '#ffffff', boxShadow: '0 0 8px rgba(255,240,180,0.9)' }}
              aria-hidden="true"
            />
          ))}
          <Badge badge={{ ...badge, earned: true }} size="xl" celebrate />
        </div>

        <div className="relative mt-4 flex items-center justify-center gap-2">
          <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest', tier.key === 'legendary' ? 'bg-gold text-ink-900' : 'bg-white/15 text-white')}>{tier.label}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
            <Icon name={cat.icon} size={12} filled /> {cat.label}
          </span>
        </div>
        <h2 className="relative mt-3 font-serif text-[30px] leading-tight">{badge.title}</h2>
        <p className="relative mt-2 text-[14px] leading-relaxed text-white/70">{badge.description}</p>
        {badge.xpReward ? <p className="relative mt-3 font-serif text-[22px] text-gold">+{badge.xpReward} EXP</p> : null}

        <div className="relative mt-6 flex items-center justify-center gap-3">
          {last ? (
            <>
              <Link href="/account" className="rounded-full border border-white/30 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-white/10">
                Show it off
              </Link>
              <button type="button" onClick={onClose} className="rounded-full bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-black hover:bg-neutral-200">
                Continue
              </button>
            </>
          ) : (
            <button type="button" onClick={() => { setIndex((i) => i + 1); setBurst((n) => n + 1); }} className="rounded-full bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-black hover:bg-neutral-200">
              Next badge ({index + 1}/{badges.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
