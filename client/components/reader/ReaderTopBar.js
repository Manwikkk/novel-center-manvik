'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Settings2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import ProgressBar from '@/components/ui/ProgressBar';
import { useReaderStore } from '@/stores/readerStore';

export default function ReaderTopBar({ book, chapter, progress }) {
  const [scrolled, setScrolled] = useState(false);
  const setControlsOpen = useReaderStore((s) => s.setControlsOpen);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 transition-colors duration-200 backdrop-blur-nav',
        scrolled ? 'bg-[var(--reader-bg)]/85 border-b border-[var(--reader-rule)]/50' : 'bg-transparent',
      )}
    >
      <div className="mx-auto max-w-shell px-4 md:px-edge h-14 md:h-16 flex items-center justify-between gap-4">
        <Link
          href={book ? `/books/${book.slug}` : '/library'}
          className="inline-flex items-center gap-2 label-sm uppercase text-[var(--reader-fg)]/70 hover:text-[var(--reader-fg)]"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">{book?.title || 'Library'}</span>
        </Link>

        <div className="hidden md:flex flex-col items-center min-w-0 max-w-[40%]">
          <p className="label-sm uppercase text-[var(--reader-fg)]/60 truncate">Chapter {chapter?.idx}</p>
          <p className="font-serif text-[14px] text-[var(--reader-fg)] truncate">{chapter?.title}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1 label-sm uppercase text-[var(--reader-fg)]/60">
            <BookOpen size={14} /> {Math.round(progress)}%
          </span>
          <button
            type="button"
            onClick={() => setControlsOpen(true)}
            className="inline-flex items-center gap-2 label-sm uppercase text-[var(--reader-fg)]/80 hover:text-[var(--reader-fg)]"
            aria-label="Reading controls"
          >
            <Settings2 size={16} /> <span className="hidden sm:inline">Controls</span>
          </button>
        </div>
      </div>
      <ProgressBar value={progress} />
    </header>
  );
}
