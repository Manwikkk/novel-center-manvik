'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { sanitizeChapterHtml } from '@/lib/sanitize';
import Icon from '@/components/ui/Icon';
import CommentThread from '@/components/comments/CommentThread';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';
import { useReaderStore } from '@/stores/readerStore';
import { readingApi } from '@/lib/reading';
import { formatTokens } from '@/lib/format';
import { cn } from '@/lib/cn';

const WPM = 220;

/**
 * Reading Interface — Stitch reader frame, wired to the global reader store
 * (theme + font-size + family) and the new /reading API.
 *
 *   • Page wrapper uses var(--reader-bg) / var(--reader-fg) so the theme
 *     pill (cream / sepia / dark) actually re-skins the article and chrome.
 *   • Article uses .prose-reader / .prose-stitch which read --reader-font-size
 *     and --reader-font-family from the same store, so A-/A+ live-resizes.
 *   • Top toolbar carries the only progress readout (small "X% · Y min"
 *     label sitting right under the 2px progress fill); the bottom bar
 *     becomes Prev / chapter title / Next so the previous "100% · 0 mins
 *     left" stack is gone.
 *   • Throttled POST /reading/progress fires on scroll, visibilitychange
 *     and unmount so the home screen's "Continue Reading" stays live.
 */
export default function ReadingInterfacePage() {
  const { chapterId } = useParams();
  const router = useRouter();

  const [chapter, setChapter] = useState(null);
  const [book, setBook] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const articleRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const pushToast = useUiStore((s) => s.pushToast);
  const apply = useReaderStore((s) => s.apply);

  useEffect(() => { apply?.(); }, [apply]);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const cRes = await api.get(`/chapters/${chapterId}`);
        if (cancel) return;
        const ch = cRes.chapter;
        setChapter(ch);

        const bks = await api.get('/books', { query: { pageSize: 50 } });
        if (cancel) return;
        const bk = (bks.items || []).find((b) => b.id === ch.bookId);
        setBook(bk || null);

        const sib = await api.get(`/books/${ch.bookId}/chapters`);
        if (cancel) return;
        setSiblings(sib.items || []);
        if (user) refreshWallet();
      } catch (err) {
        if (!cancel) setError(err);
      }
    }
    load();
    return () => { cancel = true; };
  }, [chapterId, user, refreshWallet]);

  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight);
      const passed = Math.min(total, Math.max(0, -rect.top));
      setProgress((passed / total) * 100);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [chapter]);

  // Throttled progress sync. We capture the latest progress in a ref so the
  // listeners don't get re-bound every scroll tick.
  const progressRef = useRef(0);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  useEffect(() => {
    if (!user || !chapter?.id) return;
    let lastSent = 0;
    let lastValue = -1;

    const flush = (force = false) => {
      const pct = Math.round(progressRef.current || 0);
      if (!force && pct === lastValue) return;
      lastSent = Date.now();
      lastValue = pct;
      readingApi
        .saveProgress(chapter.id, pct, Math.round(window.scrollY || 0))
        .catch(() => {});
    };

    const onScroll = () => {
      const now = Date.now();
      if (now - lastSent > 4000) flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush(true);
    };

    flush(true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('visibilitychange', onVisibility);
      flush(true);
    };
  }, [user, chapter?.id]);

  const cleanHtml = useMemo(() => sanitizeChapterHtml(chapter?.contentHtml || ''), [chapter]);

  const idx = siblings.findIndex((c) => c.id === Number(chapterId));
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const wordCount = chapter?.wordCount || 0;
  const minutesLeft = useMemo(() => {
    const remainingWords = Math.max(0, wordCount * (100 - progress) / 100);
    if (!wordCount || remainingWords < 1) return 0;
    return Math.max(1, Math.round(remainingWords / WPM));
  }, [wordCount, progress]);

  async function unlock() {
    if (!user) { router.push('/auth/login'); return; }
    setBusy(true);
    try {
      const r = await api.post(`/chapters/${chapterId}/unlock`);
      setBalance(r.balance);
      const fresh = await api.get(`/chapters/${chapterId}`);
      setChapter(fresh.chapter);
      pushToast({ type: 'success', title: 'Chapter unlocked' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Unlock failed', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--reader-bg)] text-[var(--reader-fg)]">
        <div className="text-center">
          <p className="font-ui-label-sm text-ui-label-sm uppercase opacity-70">Unavailable</p>
          <h1 className="mt-3 font-display-lg text-[28px]">This chapter could not be opened.</h1>
          <p className="mt-2 opacity-70">{error.message}</p>
          <Link href="/" className="mt-6 inline-block font-ui-label-sm text-ui-label-sm uppercase underline decoration-tertiary-fixed-dim underline-offset-4">
            Return home
          </Link>
        </div>
      </div>
    );
  }
  if (!chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--reader-bg)] text-[var(--reader-fg)] font-ui-label-sm uppercase tracking-widest opacity-70">
        Loading…
      </div>
    );
  }

  const locked = !chapter.contentHtml;
  const isPaidLocked = chapter.isPaid && !chapter.isUnlocked;

  return (
    <div className="bg-[var(--reader-bg)] text-[var(--reader-fg)] min-h-screen flex flex-col antialiased selection:bg-tertiary-fixed selection:text-on-tertiary-fixed">
      <ReaderTopToolbar
        book={book}
        chapter={chapter}
        progress={progress}
        minutesLeft={minutesLeft}
        onBack={() => router.push(book ? `/books/${book.slug}` : '/')}
      />

      <main ref={articleRef} className="flex-grow pt-32 pb-32 px-4 md:px-8 flex justify-center">
        <article className="max-w-[720px] w-full">
          <header className="mb-16 text-center">
            <h2 className="font-display-lg text-[40px] md:text-display-lg mb-4 leading-tight">
              {book?.title || chapter.title}
            </h2>
            <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest opacity-70">
              Chapter {chapter.idx} — {chapter.title}
              {chapter.readingMinutes ? ` · ${chapter.readingMinutes} min read` : ''}
            </p>
          </header>

          {locked && isPaidLocked ? (
            <div className="border border-[var(--reader-rule)] rounded-lg p-8 text-center bg-[var(--reader-bg)]/60">
              <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest opacity-70">
                Locked chapter
              </p>
              <h2 className="mt-3 font-headline-md text-headline-md">Unlock to keep reading.</h2>
              <p className="mt-3 opacity-80">
                This chapter costs {formatTokens(chapter.tokenPrice)} tokens. Your balance: {formatTokens(balance)} tokens.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={unlock}
                  disabled={busy || balance < chapter.tokenPrice}
                  className="px-6 py-3 bg-primary text-on-primary font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {busy ? 'Unlocking…' : 'Unlock chapter'}
                </button>
                <Link
                  href="/wallet"
                  className="px-6 py-3 border border-[var(--reader-rule)] font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-[var(--reader-fg)]/5 transition-colors"
                >
                  Top up
                </Link>
              </div>
            </div>
          ) : (
            <div
              className="prose-reader prose-stitch space-y-8 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />
          )}

          <div className="mt-24 flex items-center justify-center">
            <span className="h-1 w-1 bg-[var(--reader-rule)] rounded-full mx-2" />
            <span className="h-1 w-1 bg-[var(--reader-rule)] rounded-full mx-2" />
            <span className="h-1 w-1 bg-[var(--reader-rule)] rounded-full mx-2" />
          </div>
        </article>
      </main>

      <ReaderBottomBar
        prev={prev}
        next={next}
        bookHref={book ? `/books/${book.slug}` : '/'}
      />

      <section className="bg-[var(--reader-bg)] border-t border-[var(--reader-rule)] pt-24 pb-48 px-4 md:px-8">
        <div className="max-w-[720px] mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h3 className="font-headline-md text-headline-md">Reader Notes</h3>
          </div>
          <CommentThread chapterId={chapter.id} />
        </div>
      </section>
    </div>
  );
}

function ReaderTopToolbar({ book, chapter, progress, minutesLeft, onBack }) {
  const { fontSize, theme, bumpFont, setTheme } = useReaderStore();

  return (
    <header className="fixed top-0 w-full z-40 bg-[var(--reader-bg)]/90 backdrop-blur-md border-b border-[var(--reader-rule)] transition-transform duration-300">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go Back"
            className="p-2 hover:bg-[var(--reader-fg)]/5 rounded-full transition-colors group"
          >
            <Icon name="arrow_back" size={22} weight={300} className="opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="font-ui-label-sm text-ui-label-sm uppercase opacity-70">
              Chapter {chapter?.idx}
            </span>
            <h1 className="font-ui-label-lg text-ui-label-lg truncate">
              {chapter?.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center bg-[var(--reader-fg)]/5 rounded-full p-1 border border-[var(--reader-rule)] mr-2">
            <button
              type="button"
              aria-label="Decrease Font Size"
              onClick={() => bumpFont(-1)}
              className="p-1.5 rounded-full hover:bg-[var(--reader-fg)]/10 transition-colors opacity-80"
            >
              <Icon name="text_decrease" size={18} />
            </button>
            <span className="font-ui-label-sm text-ui-label-sm px-2 tabular-nums">{fontSize}</span>
            <button
              type="button"
              aria-label="Increase Font Size"
              onClick={() => bumpFont(1)}
              className="p-1.5 rounded-full hover:bg-[var(--reader-fg)]/10 transition-colors opacity-80"
            >
              <Icon name="text_increase" size={18} />
            </button>
          </div>

          <div className="flex items-center bg-[var(--reader-fg)]/5 rounded-full p-1 border border-[var(--reader-rule)]">
            <ThemeButton active={theme === 'cream'} onClick={() => setTheme('cream')} icon="light_mode" label="Light Theme" />
            <ThemeButton active={theme === 'sepia'} onClick={() => setTheme('sepia')} icon="auto_stories" label="Sepia Theme" />
            <ThemeButton active={theme === 'dark'} onClick={() => setTheme('dark')} icon="dark_mode" label="Dark Theme" />
          </div>
        </div>
      </div>

      {/* 2px progress fill + a small "X% · Y min" label tucked under it */}
      <div className="absolute bottom-0 left-0 w-full">
        <div className="h-[2px] w-full bg-[var(--reader-rule)]/60">
          <div
            className="h-full bg-tertiary-container transition-all duration-300"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
        <div className="flex justify-end pr-4 md:pr-8">
          <span className="mt-0.5 inline-block text-[10px] tracking-widest uppercase opacity-60 font-ui-label-sm tabular-nums">
            {Math.round(progress)}%
            {minutesLeft > 0 ? ` · ${minutesLeft} min` : ''}
          </span>
        </div>
      </div>
    </header>
  );
}

function ThemeButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'p-1.5 rounded-full transition-colors',
        active
          ? 'bg-[var(--reader-bg)] shadow-sm text-[var(--reader-fg)]'
          : 'hover:bg-[var(--reader-fg)]/10 opacity-70',
      )}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

function ReaderBottomBar({ prev, next, bookHref }) {
  return (
    <div className="fixed bottom-0 w-full z-40 bg-[var(--reader-bg)]/95 backdrop-blur-sm border-t border-[var(--reader-rule)] shadow-reader-bar">
      <div className="max-w-[720px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        {prev ? (
          <Link
            href={`/read/${prev.id}`}
            className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity group font-ui-label-sm text-ui-label-sm uppercase"
          >
            <Icon name="arrow_back_ios" size={20} weight={300} className="group-hover:-translate-x-1 transition-transform" />
            Previous
          </Link>
        ) : (
          <Link
            href={bookHref}
            className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity group font-ui-label-sm text-ui-label-sm uppercase"
          >
            <Icon name="arrow_back_ios" size={20} weight={300} />
            Book
          </Link>
        )}

        <span className="hidden md:block font-ui-label-sm text-ui-label-sm uppercase opacity-50 tracking-widest truncate max-w-[40%] text-center">
          {prev || next ? 'Reader' : 'End of book'}
        </span>

        {next ? (
          <Link
            href={`/read/${next.id}`}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity group font-ui-label-sm text-ui-label-sm uppercase"
          >
            Next
            <Icon name="arrow_forward_ios" size={20} weight={300} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <Link
            href={bookHref}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity group font-ui-label-sm text-ui-label-sm uppercase"
          >
            Finish
            <Icon name="arrow_forward_ios" size={20} weight={300} />
          </Link>
        )}
      </div>
    </div>
  );
}
