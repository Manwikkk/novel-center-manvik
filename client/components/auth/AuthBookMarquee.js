'use client';

import { useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const FALLBACK_COVERS = [
  '/stitch/book-architecture-silence.jpg',
  '/stitch/category-thriller.jpg',
  '/stitch/category-romance.jpg',
  '/stitch/category-fantasy.jpg',
];

const ROW_CONFIG = [
  { duration: 52, reverse: false, tilt: '-2deg' },
  { duration: 68, reverse: true, tilt: '1.5deg' },
  { duration: 44, reverse: false, tilt: '-1deg' },
];

function buildRowCovers(covers, rowIndex, min = 10) {
  if (!covers.length) return FALLBACK_COVERS;
  const offset = rowIndex * 3;
  const out = [];
  while (out.length < min) {
    for (let i = 0; i < covers.length && out.length < min; i += 1) {
      out.push(covers[(i + offset) % covers.length]);
    }
  }
  return out;
}

function MarqueeRow({ covers, duration, reverse, tilt }) {
  const track = [...covers, ...covers];

  return (
    <div
      className="auth-marquee-row relative flex overflow-hidden py-2"
      style={{ transform: `rotate(${tilt})` }}
    >
      <div
        className={`auth-marquee-track flex shrink-0 items-center gap-4 ${reverse ? 'auth-marquee-reverse' : ''}`}
        style={{ '--auth-marquee-duration': `${duration}s` }}
      >
        {track.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="auth-marquee-book relative h-[148px] w-[99px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-ink-800 shadow-[0_12px_40px_rgba(0,0,0,0.45)] sm:h-[168px] sm:w-[112px]"
          >
            <img
              src={src}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthBookMarquee() {
  const [covers, setCovers] = useState(FALLBACK_COVERS);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const r = await fetch(`${API_BASE}/api/v1/books?pageSize=24&status=published`, {
          cache: 'no-store',
        });
        if (!r.ok) return;
        const data = await r.json();
        const urls = (data.items || [])
          .map((b) => b.coverUrl)
          .filter(Boolean);
        if (!cancel && urls.length >= 4) setCovers(urls);
      } catch (_e) {
        /* keep fallbacks */
      }
    }
    load();
    return () => { cancel = true; };
  }, []);

  const rows = useMemo(
    () => ROW_CONFIG.map((cfg, i) => ({
      ...cfg,
      covers: buildRowCovers(covers, i, 12),
    })),
    [covers],
  );

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 flex flex-col justify-center gap-3">
        {rows.map((row) => (
          <MarqueeRow
            key={row.duration + String(row.reverse)}
            covers={row.covers}
            duration={row.duration}
            reverse={row.reverse}
            tilt={row.tilt}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25" />
    </div>
  );
}
