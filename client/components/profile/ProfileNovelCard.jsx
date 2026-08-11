'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { resolveImageUrl } from '@/lib/image';

const STATUS_LABEL = {
  ongoing: 'Ongoing',
  completed: 'Completed',
  hiatus: 'Hiatus',
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
  active: 'Reading',
  on_hold: 'On hold',
  archive: 'Archive',
  dropped: 'Dropped',
};

function normalizeCover(url) {
  if (!url) return url;
  return url
    .replace('thumbnail/150x', 'thumbnail/240x')
    .replace('thumbnail/150&', 'thumbnail/240&');
}

function formatCount(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
}

function Stat({ icon, value, title, accent = false }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-0.5 tabular-nums',
        accent ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-ink-500 dark:text-neutral-400',
      )}
    >
      <Icon name={icon} size={13} filled={accent && icon === 'star'} />
      {value}
    </span>
  );
}

export default function ProfileNovelCard({
  novel,
  isOwner = false,
  onToggleVisibility,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!novel) return null;

  const cover = resolveImageUrl(normalizeCover(novel.coverUrl));
  const statusKey = novel.readingStatus || novel.status;
  const statusLabel = STATUS_LABEL[statusKey] || statusKey || 'Novel';
  const rating = novel.rating != null ? Number(novel.rating) : null;
  const views = Number(novel.views || 0);
  const bookmarks = Number(novel.bookmarks || 0);
  const chapters = Number(novel.chapters || 0);

  return (
    <article className="group flex flex-col min-w-0">
      <Link
        href={novel.slug ? `/books/${novel.slug}` : '/discover'}
        className="block relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10"
      >
        {cover && !imgFailed ? (
          <Image
            src={cover}
            alt={novel.title || 'Cover'}
            fill
            referrerPolicy="no-referrer"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 40vw, 160px"
            unoptimized
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-400 dark:text-neutral-600">
            <Icon name="menu_book" size={28} />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
          {statusLabel}
        </span>
        {chapters > 0 ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-white">
            {chapters} ch
          </span>
        ) : null}
      </Link>

      <h3 className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-ink-900 dark:text-neutral-100">
        <Link href={novel.slug ? `/books/${novel.slug}` : '/discover'}>
          {novel.title}
        </Link>
      </h3>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
        <Stat
          icon="star"
          title={rating != null ? `Rating ${rating.toFixed(1)}` : 'No ratings yet'}
          value={rating != null ? rating.toFixed(1) : '—'}
          accent={rating != null}
        />
        <Stat
          icon="visibility"
          title={`${views} views`}
          value={formatCount(views)}
        />
        <Stat
          icon="bookmark"
          title={`${bookmarks} in libraries`}
          value={formatCount(bookmarks)}
          accent={bookmarks > 0}
        />
      </div>

      {isOwner && onToggleVisibility ? (
        <button
          type="button"
          onClick={() => onToggleVisibility(novel)}
          className={cn(
            'mt-2 self-start text-[10px] font-semibold uppercase tracking-widest',
            novel.showOnProfile
              ? 'text-ink-500 hover:text-ink-900 dark:text-neutral-400 dark:hover:text-neutral-100'
              : 'text-amber-700 dark:text-amber-400',
          )}
        >
          {novel.showOnProfile ? 'Hide from profile' : 'Show on profile'}
        </button>
      ) : null}
    </article>
  );
}
