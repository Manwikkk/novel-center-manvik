'use client';

import { useEffect, useState } from 'react';
import CompactBookTile from '@/components/book/CompactBookTile';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { readingApi } from '@/lib/reading';
import { cn } from '@/lib/cn';

const LIMIT = 7;

export default function ContinueReadingSection() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!hydrated) return undefined;
    if (!user) {
      setItems([]);
      return undefined;
    }
    let cancelled = false;
    setItems(null);
    readingApi
      .recent(LIMIT)
      .then((res) => {
        if (cancelled) return;
        setItems(Array.isArray(res?.items) ? res.items : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => { cancelled = true; };
  }, [hydrated, user]);

  if (!hydrated || !user) return null;

  const loading = items === null;
  if (!loading && items.length === 0) return null;

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-edge mt-14 md:mt-16">
      <h2 className="font-headline-md text-headline-md text-ink-900 dark:text-neutral-100 mb-6">
        Continue Reading
      </h2>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} className={cn('min-w-0', i >= 6 && 'hidden sm:block')}>
              <Skeleton className="aspect-[2/3] w-full max-w-[120px] rounded-xl" />
              <Skeleton className="mt-3 h-4 w-full max-w-[120px]" />
              <Skeleton className="mt-1 h-3 w-2/3 max-w-[80px]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8">
          {items.slice(0, LIMIT).map((entry, i) => {
            const pct = Math.max(0, Math.min(100, Math.round(entry.percent || 0)));
            return (
              <CompactBookTile
                key={entry.book.id}
                book={entry.book}
                href={`/read/${entry.chapter.id}`}
                subtitle={`Ch. ${entry.chapter.idx} · ${pct}%`}
                className={cn(i >= 6 && 'hidden sm:block')}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
