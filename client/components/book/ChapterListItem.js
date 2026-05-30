'use client';

import Link from 'next/link';
import { Lock, Check, BookOpen } from 'lucide-react';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { formatTokens } from '@/lib/format';
import { isChapterLocked } from '@/lib/chapterAccess';
import { cn } from '@/lib/cn';

export default function ChapterListItem({ chapter, onUnlockClick, busy = false }) {
  const free = !chapter.isPaid || chapter.tokenPrice === 0;
  const locked = isChapterLocked(chapter);

  return (
    <li className="py-5 border-b border-ink-200/60 last:border-b-0 flex items-center gap-4">
      <span className={cn(
        'h-8 w-8 inline-flex items-center justify-center rounded-full label-sm shrink-0',
        locked ? 'bg-cream-300 text-ink-400' : 'bg-ink-900 text-cream-100',
      )}>
        {String(chapter.idx).padStart(2, '0')}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h4 className="font-serif text-[20px] text-ink-900 leading-tight">{chapter.title}</h4>
          {free && <Chip>Free</Chip>}
          {chapter.isPaid && chapter.isUnlocked && (
            <span className="inline-flex items-center gap-1 text-[12px] tracking-labelTight uppercase text-gold-dim">
              <Check size={14} /> Unlocked
            </span>
          )}
          {chapter.isPaid && !chapter.isUnlocked && (
            <span className="inline-flex items-center gap-1 text-[12px] tracking-labelTight uppercase text-ink-400">
              <Lock size={14} /> {formatTokens(chapter.tokenPrice)} tokens
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {locked ? (
          <Button size="sm" variant="primary" onClick={() => onUnlockClick?.(chapter)} disabled={busy}>
            Unlock
          </Button>
        ) : (
          <Button as={Link} href={`/read/${chapter.id}`} size="sm" variant="secondary">
            <BookOpen size={14} className="mr-2" /> Read
          </Button>
        )}
      </div>
    </li>
  );
}
