'use client';

import Avatar from '@/components/ui/Avatar';

function QuoteMark({ className }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      fill="currentColor"
      className={className}
    >
      <path d="M18 36h-6c0-6 3-12 9-15l-3-6c-9 3-15 12-15 21v6h15v-6zm22 0h-6c0-6 3-12 9-15l-3-6c-9 3-15 12-15 21v6h15v-6z" />
    </svg>
  );
}

export default function CreatorsThoughtCard({ authorName, authorAvatarUrl, thought }) {
  const body = (thought || '').trim();
  if (!body) return null;

  return (
    <section
      className="mt-14 mb-2 rounded-xl border border-tertiary-fixed-dim/25 bg-tertiary-fixed/15 dark:bg-tertiary-container/40 dark:border-on-tertiary-container/20 px-5 py-5 md:px-6 md:py-6 relative overflow-hidden"
      aria-label="Creator's thoughts"
    >
      <QuoteMark className="pointer-events-none absolute top-4 right-4 w-12 h-12 md:w-14 md:h-14 text-tertiary-fixed-dim/30 dark:text-on-tertiary-container/20" />

      <p className="relative mb-4 pr-14 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--reader-muted)]">
        Creators&apos; thoughts
      </p>

      <div className="relative flex items-start gap-3">
        <Avatar name={authorName} src={authorAvatarUrl} size={40} className="shrink-0" />
        <div className="min-w-0 flex-1">
          {authorName ? (
            <p className="text-[15px] font-semibold text-[var(--reader-fg)] leading-tight">
              {authorName}
            </p>
          ) : null}
          <p className="mt-2 font-serif text-[17px] md:text-[18px] leading-relaxed italic text-[var(--reader-muted)] whitespace-pre-wrap">
            {body}
          </p>
        </div>
      </div>
    </section>
  );
}
