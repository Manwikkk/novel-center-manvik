'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import { resolveImageUrl } from '@/lib/image';

function formatActivityTime(input) {
  if (!input) return '';
  const d = new Date(input);
  const diffSec = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) {
    const n = Math.floor(diffSec / 60);
    return `${n} ${n === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffSec < 86400) {
    const n = Math.floor(diffSec / 3600);
    return `${n} ${n === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffSec < 86400 * 30) {
    const n = Math.floor(diffSec / 86400);
    return `${n} ${n === 1 ? 'day' : 'days'} ago`;
  }
  if (diffSec < 86400 * 365) {
    const n = Math.floor(diffSec / (86400 * 30));
    return `${n} ${n === 1 ? 'month' : 'months'} ago`;
  }
  const n = Math.floor(diffSec / (86400 * 365));
  return `${n} ${n === 1 ? 'year' : 'years'} ago`;
}

function normalizeCover(url) {
  if (!url) return url;
  return url
    .replace('thumbnail/150x', 'thumbnail/240x')
    .replace('thumbnail/150&', 'thumbnail/240&');
}

/**
 * WebNovel-style activity row for profile Reviews / Comments.
 */
export default function ProfileActivityItem({
  actor,
  actionLabel = 'Commented',
  actionIcon = 'chat_bubble',
  body,
  createdAt,
  book,
  chapter,
  replyToName,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const cover = resolveImageUrl(normalizeCover(book?.coverUrl));
  const bookHref = book?.slug ? `/books/${book.slug}` : null;
  const actorHref = actor?.id ? `/users/${actor.id}` : null;

  const chapterLine = chapter
    ? `ch ${String(chapter.idx ?? '').toString().padStart(2, ' ')} ${chapter.title || ''}`.trim()
    : null;

  return (
    <article className="border-b border-neutral-200/80 py-5 last:border-b-0 dark:border-neutral-800">
      <div className="flex items-start gap-3">
        {actorHref ? (
          <Link href={actorHref} className="shrink-0">
            <Avatar name={actor?.displayName} src={actor?.avatarUrl} size={40} />
          </Link>
        ) : (
          <Avatar name={actor?.displayName} src={actor?.avatarUrl} size={40} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            {actorHref ? (
              <Link
                href={actorHref}
                className="truncate text-[15px] font-semibold text-ink-900 hover:text-[#1e80ff] dark:text-neutral-100"
              >
                {actor?.displayName || 'Reader'}
              </Link>
            ) : (
              <span className="truncate text-[15px] font-semibold text-ink-900 dark:text-neutral-100">
                {actor?.displayName || 'Reader'}
              </span>
            )}
            <time className="shrink-0 text-[12px] text-ink-400 dark:text-neutral-500">
              {formatActivityTime(createdAt)}
            </time>
          </div>

          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-ink-500 dark:text-neutral-400">
            <Icon name={actionIcon} size={15} />
            {replyToName ? (
              <span>
                Replied to <span className="font-medium text-ink-700 dark:text-neutral-300">{replyToName}</span>
              </span>
            ) : (
              <span>{actionLabel}</span>
            )}
          </p>

          {body ? (
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-800 dark:text-neutral-200">
              {body}
            </p>
          ) : null}

          {book ? (
            <div className="mt-3 overflow-hidden rounded-md bg-[#f2f2f2] dark:bg-neutral-900">
              {chapterLine ? (
                <p className="truncate px-3 pt-2.5 text-[12px] text-ink-500 dark:text-neutral-400">
                  {chapterLine}
                </p>
              ) : null}

              {bookHref ? (
                <Link
                  href={bookHref}
                  className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                >
                  <BookThumb cover={cover} title={book.title} failed={imgFailed} onError={() => setImgFailed(true)} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink-900 dark:text-neutral-100">
                      {book.title || 'Untitled'}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-ink-500 dark:text-neutral-400">
                      {[book.category || book.genre, book.authorName].filter(Boolean).join(' · ') || 'Novel'}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <BookThumb cover={cover} title={book.title} failed={imgFailed} onError={() => setImgFailed(true)} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink-500">
                      {book.title || 'Book unavailable'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function BookThumb({ cover, title, failed, onError }) {
  return (
    <div className="relative h-[56px] w-[40px] shrink-0 overflow-hidden rounded-sm bg-neutral-300 dark:bg-neutral-700">
      {cover && !failed ? (
        <Image
          src={cover}
          alt={title || 'Cover'}
          fill
          referrerPolicy="no-referrer"
          className="object-cover"
          sizes="40px"
          unoptimized
          onError={onError}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-ink-400">
          <Icon name="menu_book" size={16} />
        </div>
      )}
    </div>
  );
}
