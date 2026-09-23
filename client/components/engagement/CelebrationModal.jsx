'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * Level-2 celebration: editorial, restrained motion. Never blocks reading —
 * Esc / backdrop / Continue always dismiss. Reduced-motion friendly.
 */
export default function CelebrationModal({ item, open, onClose, onPrimary }) {
  const [entered, setEntered] = useState(false);
  const meta = item?.metadata || {};
  const outcomes = Array.isArray(meta.outcomes) ? meta.outcomes : [];

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    const t = requestAnimationFrame(() => setEntered(true));
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const eyebrow = useMemo(() => {
    const et = meta.eventType || item?.metadata?.eventType;
    if (meta.milestone === 'day14' || /14/.test(item?.title || '')) return 'Major milestone';
    if (meta.milestone === 'day7' || /7 DAY/i.test(item?.title || '')) return 'Streak milestone';
    if (et === 'achievement_unlocked' || item?.category === 'achievements') return 'Achievement';
    if (et === 'lucky_platform_pass' || meta.lucky) return 'Rare reward';
    if (item?.category === 'events') return 'Event';
    if (item?.category === 'tasks') return 'Task complete';
    return 'Celebration';
  }, [item, meta]);

  if (!open || !item) return null;

  const primaryLabel = meta.openMilestoneChoice
    ? 'Choose reward'
    : item.linkUrl
      ? 'View'
      : 'Continue';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="presentation">
      <button
        type="button"
        aria-label="Dismiss celebration"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 dark:bg-black/70"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
        className={cn(
          'relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-editorial-modal',
          'dark:border-neutral-800 dark:bg-neutral-950',
          'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
          entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-gold/20 to-transparent dark:from-gold/10" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-ink-400 hover:bg-ink-900/5 hover:text-ink-900 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Close"
        >
          <Icon name="close" size={18} />
        </button>

        <p className="relative text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dim dark:text-gold">
          {eyebrow}
        </p>
        <h2 id="celebration-title" className="relative mt-3 font-serif text-[32px] leading-tight text-ink-900 dark:text-neutral-50">
          {item.title}
        </h2>
        {item.body ? (
          <p className="relative mt-3 text-[14px] leading-relaxed text-ink-600 dark:text-neutral-400">
            {item.body}
          </p>
        ) : null}

        {outcomes.length ? (
          <ul className="relative mt-5 space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            {outcomes.map((o, i) => (
              <li key={`${o.kind}-${i}`} className="flex items-center gap-2.5 text-[13px] text-ink-700 dark:text-neutral-300">
                <Icon
                  name={o.kind === 'achievement' ? 'military_tech' : o.kind === 'lucky' ? 'auto_awesome' : o.kind === 'milestone' ? 'local_fire_department' : 'check_circle'}
                  size={18}
                  filled
                  className="text-gold-dim dark:text-gold"
                />
                <span>{o.label}{o.exp ? ` · +${o.exp} EXP` : ''}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="relative mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>Continue reading</Button>
          {(meta.openMilestoneChoice || item.linkUrl) ? (
            meta.openMilestoneChoice ? (
              <Button variant="primary" size="md" onClick={() => onPrimary?.(item)}>
                {primaryLabel}
              </Button>
            ) : (
              <Link
                href={item.linkUrl}
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full bg-ink-900 px-4 py-2 text-[12px] font-semibold uppercase tracking-widest text-white dark:bg-white dark:text-black"
              >
                {primaryLabel}
              </Link>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
