import Image from 'next/image';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import FollowButton from '@/components/profile/FollowButton';
import { resolveImageUrl } from '@/lib/image';
import { formatTokens } from '@/lib/format';
import { cn } from '@/lib/cn';

const RANK_STYLES = [
  'bg-gold text-ink-900',
  'bg-neutral-300 text-ink-900 dark:bg-neutral-400',
  'bg-[#c68b59] text-white',
];

function Rank({ n }) {
  return (
    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums', RANK_STYLES[n - 1] || 'bg-neutral-100 text-ink-600 dark:bg-neutral-800 dark:text-neutral-300')}>
      {n}
    </span>
  );
}

function Cover({ src, title, className }) {
  const url = resolveImageUrl(src);
  return (
    <span className={cn('relative block shrink-0 overflow-hidden rounded bg-neutral-200 shadow-book dark:bg-neutral-800', className)}>
      {url ? <Image src={url} alt={title} fill sizes="80px" className="object-cover" unoptimized /> : null}
    </span>
  );
}

export function BookLeaderboard({ title, eyebrow, items = [], stat, icon }) {
  return (
    <section className="min-w-0 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-editorial-card dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold-dim dark:text-gold"><Icon name={icon} filled size={20} /></span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-neutral-500">{eyebrow}</p>
          <h2 className="font-serif text-[22px] leading-tight text-ink-900 dark:text-neutral-50">{title}</h2>
        </div>
      </div>
      <ol className="mt-4 divide-y divide-neutral-200/70 dark:divide-neutral-800">
        {items.length ? items.map((b, i) => (
          <li key={b.id}>
            <Link href={`/books/${b.slug}`} className="flex items-center gap-3 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60 -mx-2 px-2 rounded-lg">
              <Rank n={i + 1} />
              <Cover src={b.coverUrl} title={b.title} className="h-16 w-11" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink-900 dark:text-neutral-100">{b.title}</span>
                <span className="block truncate text-[12px] text-ink-500 dark:text-neutral-500">{b.authorName} · {b.category}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-serif text-[18px] leading-none text-ink-900 tabular-nums dark:text-neutral-50">{stat(b).value}</span>
                <span className="block text-[10px] uppercase tracking-widest text-ink-400 dark:text-neutral-500">{stat(b).label}</span>
              </span>
            </Link>
          </li>
        )) : <li className="py-8 text-center text-[13px] text-ink-500 dark:text-neutral-500">Nothing ranked yet.</li>}
      </ol>
    </section>
  );
}

export function AuthorLeaderboard({ items = [] }) {
  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-editorial-card dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold-dim dark:text-gold"><Icon name="edit_note" filled size={20} /></span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-neutral-500">By followers</p>
          <h2 className="font-serif text-[22px] leading-tight text-ink-900 dark:text-neutral-50">Top authors</h2>
        </div>
      </div>
      <ol className="mt-4 divide-y divide-neutral-200/70 dark:divide-neutral-800">
        {items.map((a, i) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <Rank n={i + 1} />
            <Link href={`/authors/${a.id}`} className="shrink-0"><Avatar name={a.displayName} src={a.avatarUrl} size={44} /></Link>
            <span className="min-w-0 flex-1">
              <Link href={`/authors/${a.id}`} className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900 hover:underline dark:text-neutral-100">
                <span className="truncate">{a.displayName}</span>
                {a.isVerified ? <Icon name="verified" filled size={15} className="shrink-0 text-[#1e80ff]" /> : null}
              </Link>
              <span className="block truncate text-[12px] text-ink-500 dark:text-neutral-500">
                {formatTokens(a.followers)} followers · {a.books} novel{a.books === 1 ? '' : 's'} · {formatTokens(a.views)} views
              </span>
            </span>
            <FollowButton userId={a.id} />
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ReaderLeaderboard({ items = [] }) {
  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-editorial-card dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold-dim dark:text-gold"><Icon name="military_tech" filled size={20} /></span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-neutral-500">By reader EXP</p>
          <h2 className="font-serif text-[22px] leading-tight text-ink-900 dark:text-neutral-50">Top readers</h2>
        </div>
      </div>
      <ol className="mt-4 divide-y divide-neutral-200/70 dark:divide-neutral-800">
        {items.map((r, i) => (
          <li key={r.id} className="flex items-center gap-3 py-3">
            <Rank n={i + 1} />
            <Link href={`/users/${r.id}`} className="shrink-0"><Avatar name={r.displayName} src={r.avatarUrl} size={40} /></Link>
            <span className="min-w-0 flex-1">
              <Link href={`/users/${r.id}`} className="block truncate text-[14px] font-semibold text-ink-900 hover:underline dark:text-neutral-100">{r.displayName}</Link>
              <span className="block truncate text-[12px] text-ink-500 dark:text-neutral-500">
                Lv {r.readerLevel} · {r.badges} badge{r.badges === 1 ? '' : 's'} · {r.currentStreak}-day streak
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-serif text-[18px] leading-none text-ink-900 tabular-nums dark:text-neutral-50">{formatTokens(r.xp)}</span>
              <span className="block text-[10px] uppercase tracking-widest text-ink-400 dark:text-neutral-500">exp</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function NewArrivalsStrip({ items = [] }) {
  if (!items.length) return null;
  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-neutral-500">Fresh on the shelf</p>
          <h2 className="font-serif text-[22px] leading-tight text-ink-900 dark:text-neutral-50">New arrivals</h2>
        </div>
        <Link href="/discover" className="text-[11px] font-semibold uppercase tracking-widest text-ink-600 underline-offset-4 hover:underline dark:text-neutral-400">Browse all</Link>
      </div>
      <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
        {items.map((b) => (
          <Link key={b.id} href={`/books/${b.slug}`} className="w-[132px] shrink-0">
            <Cover src={b.coverUrl} title={b.title} className="aspect-[2/3] w-full rounded-md" />
            <span className="mt-2 block truncate text-[13px] font-semibold text-ink-900 dark:text-neutral-100">{b.title}</span>
            <span className="block truncate text-[11px] text-ink-500 dark:text-neutral-500">{b.authorName}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
