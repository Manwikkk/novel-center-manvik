'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function ChapterFooterNav({ prev, next, bookHref }) {
  return (
    <nav className="border-t border-[var(--reader-rule)] mt-16">
      <div className="mx-auto max-w-reading px-4 md:px-0 py-10 grid grid-cols-2 gap-4">
        {prev ? (
          <Link href={`/read/${prev.id}`} className="group">
            <p className="label-sm uppercase text-[var(--reader-fg)]/60 inline-flex items-center gap-2">
              <ArrowLeft size={14} /> Previous
            </p>
            <p className="mt-2 font-serif text-[18px] leading-tight text-[var(--reader-fg)] group-hover:underline decoration-gold underline-offset-4">
              {String(prev.idx).padStart(2, '0')} · {prev.title}
            </p>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/read/${next.id}`} className="group text-right">
            <p className="label-sm uppercase text-[var(--reader-fg)]/60 inline-flex items-center gap-2 justify-end w-full">
              Next <ArrowRight size={14} />
            </p>
            <p className="mt-2 font-serif text-[18px] leading-tight text-[var(--reader-fg)] group-hover:underline decoration-gold underline-offset-4">
              {String(next.idx).padStart(2, '0')} · {next.title}
            </p>
          </Link>
        ) : (
          <Link href={bookHref} className="text-right group">
            <p className="label-sm uppercase text-[var(--reader-fg)]/60 inline-flex items-center gap-2 justify-end w-full">
              Back to book <BookOpen size={14} />
            </p>
            <p className={cn('mt-2 font-serif text-[18px] text-[var(--reader-fg)] group-hover:underline decoration-gold underline-offset-4')}>
              You&rsquo;re at the end.
            </p>
          </Link>
        )}
      </div>
    </nav>
  );
}
