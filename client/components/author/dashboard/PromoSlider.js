'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function PromoSlider({ slides, variant = 'feature', autoMs = 6000, className }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, autoMs);
    return () => clearInterval(id);
  }, [slides.length, autoMs]);

  if (!slide) return null;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-lg border border-surface-variant bg-surface-container-lowest overflow-hidden',
        className,
      )}
    >
      {variant === 'contest' && slide.seeAllHref && (
        <a
          href={slide.seeAllHref}
          className="absolute top-2.5 right-3 z-10 text-[10px] font-semibold uppercase tracking-wider text-studio-accent hover:underline flex items-center gap-0.5"
        >
          See all <ChevronRight size={11} />
        </a>
      )}

      <div className="flex items-center gap-3 px-3 py-3 min-h-[108px]">
        {slide.image && (
          <div className="shrink-0 w-[72px] h-[72px] rounded-md overflow-hidden bg-surface-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {variant === 'contest' && slide.badge && (
          <div className="shrink-0 w-[72px] h-[72px] rounded-md bg-gradient-to-br from-studio-accent/25 to-surface-container flex flex-col items-center justify-center border border-surface-variant">
            <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant leading-tight">Writing</span>
            <span className="text-[10px] font-bold text-on-surface">contests</span>
            <span className="text-sm font-bold text-studio-accent mt-1">{slide.badge}</span>
          </div>
        )}
        <div className="flex-1 min-w-0 py-0.5">
          {slide.eyebrow && (
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-0.5">{slide.eyebrow}</p>
          )}
          <h3 className="text-[13px] font-semibold text-on-surface leading-snug line-clamp-2">
            {slide.title}
          </h3>
          {slide.description && (
            <p className="mt-1 text-[12px] text-on-surface-variant line-clamp-2 leading-snug">
              {slide.description}
            </p>
          )}
          {slide.countdown && (
            <p className="mt-1 text-[12px] text-on-surface-variant">
              <span className="text-on-surface font-medium">{slide.countdown}</span>
            </p>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-2.5 pt-0">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn('studio-dot', i === index && 'studio-dot-active')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const DUMMY_FEATURE_SLIDES = [
  {
    title: 'First Blood Call: Noob to Veteran',
    description: 'Join the featured serial — tips on pacing, hooks, and weekly release cadence for new authors.',
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=280&fit=crop',
  },
  {
    title: 'Build your reader funnel',
    description: 'Learn how top writers on Novel Centre turn chapter one into loyal subscribers.',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&h=280&fit=crop',
  },
  {
    title: 'Editor picks: Spring 2026',
    description: 'Stories our team is highlighting this season — add yours to the queue.',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=280&fit=crop',
  },
];

export const DUMMY_CONTEST_SLIDES = [
  {
    eyebrow: 'Writing contests',
    title: 'WPC MAY 2026',
    countdown: 'in 23 days',
    badge: 'WPC',
    seeAllHref: '#',
  },
  {
    eyebrow: 'Writing contests',
    title: 'Summer Flash Fiction',
    countdown: 'in 41 days',
    badge: 'SFF',
    seeAllHref: '#',
  },
];
