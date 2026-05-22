'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { sanitizeChapterHtml } from '@/lib/sanitize';
import Icon from '@/components/ui/Icon';
import ChapterCommentsPanel from '@/components/comments/ChapterCommentsPanel';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';
import { useReaderStore } from '@/stores/readerStore';
import { readingApi } from '@/lib/reading';
import { formatTokens } from '@/lib/format';
import { cn } from '@/lib/cn';

const WPM = 220;
const RAIL_W = 56; // px — w-14
const DEFAULT_COVER = '/stitch/book-architecture-silence.jpg';

/**
 * Reading page: title page (cover → © Novel Center) for chapter 1, then body.
 * Right rail: TOC, display options (gear), jump to notes, help.
 * Progress: text-only % and minutes (no growing bar).
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
  const [rightPanel, setRightPanel] = useState(null); // null | 'settings' | 'toc' | 'comments'
  const [commentCount, setCommentCount] = useState(0);

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

        const bRes = await api.get(`/books/by-id/${ch.bookId}`);
        if (cancel) return;
        setBook(bRes.book || null);

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
    if (!chapter?.id) return;
    let cancel = false;
    api
      .get('/comments', { query: { chapterId: chapter.id, pageSize: 1, page: 1 } })
      .then((d) => {
        if (!cancel) setCommentCount(Number(d.totalRoots) || 0);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [chapter?.id]);

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

  function closePanel() {
    setRightPanel(null);
  }

  function toggleCommentsPanel() {
    setRightPanel((p) => (p === 'comments' ? null : 'comments'));
  }

  useEffect(() => {
    if (!rightPanel) return;
    const onKey = (e) => { if (e.key === 'Escape') closePanel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rightPanel]);

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
  const showTitlePage = chapter.idx === 1 && book;

  return (
    <div className="bg-[var(--reader-bg)] text-[var(--reader-fg)] min-h-screen flex flex-col antialiased selection:bg-tertiary-fixed selection:text-on-tertiary-fixed pr-14">
      <ReaderTopToolbar
        chapter={chapter}
        progress={progress}
        minutesLeft={minutesLeft}
        onBack={() => router.push(book ? `/books/${book.slug}` : '/')}
      />

      <ReaderRightRail
        onToc={() => setRightPanel((p) => (p === 'toc' ? null : 'toc'))}
        onSettings={() => setRightPanel((p) => (p === 'settings' ? null : 'settings'))}
        onComments={toggleCommentsPanel}
        tocActive={rightPanel === 'toc'}
        settingsActive={rightPanel === 'settings'}
        commentsActive={rightPanel === 'comments'}
        commentCount={commentCount}
      />

      {rightPanel ? (
        <>
          <button
            type="button"
            aria-label="Close panel"
            className="fixed inset-0 z-[45] bg-black/25 md:bg-black/20"
            style={{ right: RAIL_W }}
            onClick={closePanel}
          />
          {rightPanel === 'settings' ? (
            <DisplayOptionsPanel onClose={closePanel} railPx={RAIL_W} />
          ) : null}
          {rightPanel === 'toc' ? (
            <TocPanel
              chapters={siblings}
              currentId={chapter.id}
              bookSlug={book?.slug}
              onClose={closePanel}
              railPx={RAIL_W}
            />
          ) : null}
          {rightPanel === 'comments' && chapter?.id ? (
            <ChapterCommentsPanel
              chapterId={chapter.id}
              open
              onClose={closePanel}
              railPx={RAIL_W}
              onCountChange={setCommentCount}
            />
          ) : null}
        </>
      ) : null}

      <main ref={articleRef} className="flex-grow pt-[4.5rem] pb-32 px-4 md:px-8 flex justify-center">
        <article className="max-w-[720px] w-full">
          {showTitlePage ? (
            <TitlePageHero book={book} chapter={chapter} />
          ) : (
            <header className="mb-12">
              <h2 className="font-display-lg text-[28px] md:text-[34px] mb-2 leading-tight text-[var(--reader-fg)]">
                Chapter {chapter.idx}: {chapter.title}
              </h2>
              {chapter.readingMinutes ? (
                <p className="text-sm text-[var(--reader-muted)]">
                  {chapter.readingMinutes} min read
                </p>
              ) : null}
            </header>
          )}

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

          <div className="mt-16 flex justify-center">
            <ChapterCommentTrigger
              count={commentCount}
              onClick={toggleCommentsPanel}
            />
          </div>
        </article>
      </main>

      <ReaderBottomBar
        prev={prev}
        next={next}
        bookHref={book ? `/books/${book.slug}` : '/'}
      />

    </div>
  );
}

function formatProgressPct(p) {
  if (p <= 0) return '0';
  if (p < 1) return p.toFixed(2);
  if (p < 10) return p.toFixed(1);
  return String(Math.round(p));
}

function ReaderTopToolbar({ chapter, progress, minutesLeft, onBack }) {
  const pct = formatProgressPct(progress);
  const sub = minutesLeft > 0 ? `${minutesLeft} min left` : null;

  return (
    <header
      className={cn(
        'fixed top-0 left-0 z-40 bg-[var(--reader-bg)]/95 backdrop-blur-md border-b border-[var(--reader-rule)]',
      )}
      style={{ right: RAIL_W }}
    >
      <div className="relative h-14 flex items-center px-3 md:px-6">
        <div className="flex items-center gap-2 min-w-0 max-w-[42%]">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="p-2 hover:bg-[var(--reader-fg)]/5 rounded-full transition-colors shrink-0"
          >
            <Icon name="arrow_back" size={22} weight={300} className="opacity-70" />
          </button>
          <div className="min-w-0">
            <span className="block text-[10px] uppercase tracking-widest opacity-60 font-ui-label-sm truncate">
              Chapter {chapter?.idx}
            </span>
            <span className="block font-ui-label-lg text-ui-label-lg truncate">
              {chapter?.title}
            </span>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center px-2">
          <p className="text-[11px] md:text-xs tracking-wide text-[var(--reader-muted)] tabular-nums whitespace-nowrap">
            <span className="text-[var(--reader-fg)] font-medium">{pct}%</span>
            {' read'}
            {sub ? (
              <>
                <span className="opacity-50 mx-1">·</span>
                <span>{sub}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </header>
  );
}

function ChapterCommentTrigger({ count, onClick }) {
  const label = count === 1 ? '1 comment' : `${count} comments`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-3 rounded-lg border border-[var(--reader-rule)] bg-[var(--reader-fg)]/[0.04] px-4 py-2.5 hover:bg-[var(--reader-fg)]/[0.08] transition-colors text-left"
    >
      <Icon name="chat_bubble_outline" size={22} className="text-[var(--reader-muted)] shrink-0" />
      <span className="flex flex-col">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--reader-fg)]">
          Comment
        </span>
        <span className="text-[12px] text-[var(--reader-muted)]">{label}</span>
      </span>
    </button>
  );
}

function TitlePageHero({ book, chapter }) {
  const cover = book.coverUrl || DEFAULT_COVER;

  return (
    <div className="mb-16 md:mb-20 text-center">
      <div className="mx-auto w-[200px] md:w-[240px] aspect-[2/3] shadow-lg rounded-sm overflow-hidden bg-[var(--reader-rule)]/30">
        <img
          src={cover}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
      <h1 className="mt-10 font-display-lg text-[26px] md:text-[34px] leading-tight px-2 text-[var(--reader-fg)]">
        {book.title}
      </h1>
      {book.authorName ? (
        <p className="mt-4 text-base md:text-lg text-[var(--reader-fg)] font-serif">
          Author: {book.authorName}
        </p>
      ) : null}
      <p className="mt-8 text-sm text-[var(--reader-muted)] tracking-wide">
        © Novel Center
      </p>

      <div className="mt-12 flex items-center gap-3 max-w-md mx-auto">
        <div className="flex-1 h-px bg-[var(--reader-rule)]" />
        <Icon name="menu_book" size={22} weight={300} className="text-[var(--reader-muted)] shrink-0" />
        <div className="flex-1 h-px bg-[var(--reader-rule)]" />
      </div>

      <div className="mt-4 flex flex-wrap items-baseline justify-center gap-3 text-left">
        <h2 className="font-display-lg text-[22px] md:text-[28px] leading-snug text-[var(--reader-fg)]">
          Chapter {chapter.idx}: {chapter.title}
        </h2>
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-[var(--reader-rule)] text-xs text-[var(--reader-muted)] tabular-nums shrink-0"
          aria-hidden
        >
          {chapter.idx}
        </span>
      </div>
    </div>
  );
}

function ReaderRightRail({
  onToc,
  onSettings,
  onComments,
  tocActive,
  settingsActive,
  commentsActive,
  commentCount = 0,
}) {
  const btn =
    'flex items-center justify-center w-10 h-10 rounded-lg transition-colors text-white/85 hover:text-white hover:bg-white/10';
  const active = 'bg-[#2563eb] text-white hover:bg-[#2563eb] hover:text-white';

  return (
    <aside
      className="fixed right-0 top-0 bottom-0 z-50 w-14 flex flex-col items-center pt-4 pb-6 gap-2 bg-[#1a1b1f] border-l border-black/20 shadow-[-4px_0_24px_rgba(0,0,0,0.12)]"
      aria-label="Reader tools"
    >
      <button type="button" className={cn(btn, tocActive && active)} onClick={onToc} aria-label="Table of contents">
        <Icon name="menu" size={22} weight={300} />
      </button>
      <button
        type="button"
        className={cn(btn, settingsActive && active)}
        onClick={onSettings}
        aria-label="Display options"
      >
        <Icon name="settings" size={22} weight={300} />
      </button>
      <button
        type="button"
        className={cn(btn, commentsActive && active)}
        onClick={onComments}
        aria-label="Chapter comments"
      >
        <span className="relative inline-flex">
          <Icon name="chat_bubble_outline" size={22} weight={300} />
          {commentCount > 0 ? (
            <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#2563eb] text-[10px] font-bold leading-[18px] text-white text-center">
              {commentCount > 99 ? '99+' : commentCount}
            </span>
          ) : null}
        </span>
      </button>
      <Link href="/" className={cn(btn, 'mt-auto')} aria-label="Help" title="Home">
        <Icon name="help_outline" size={22} weight={300} />
      </Link>
    </aside>
  );
}

function DisplayOptionsPanel({ onClose, railPx }) {
  const fontSize = useReaderStore((s) => s.fontSize);
  const fontFamily = useReaderStore((s) => s.fontFamily);
  const theme = useReaderStore((s) => s.theme);
  const bumpFont = useReaderStore((s) => s.bumpFont);
  const setFontFamily = useReaderStore((s) => s.setFontFamily);
  const setTheme = useReaderStore((s) => s.setTheme);

  return (
    <div
      className="fixed top-0 bottom-0 z-[48] w-[min(100vw-3.5rem,20rem)] bg-[var(--reader-bg)] text-[var(--reader-fg)] shadow-2xl border-l border-[var(--reader-rule)] flex flex-col"
      style={{ right: railPx }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--reader-rule)]">
        <h2 className="font-ui-label-lg text-ui-label-lg">Display Options</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[var(--reader-fg)]/5"
          aria-label="Close"
        >
          <Icon name="close" size={22} weight={300} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        <section>
          <p className="text-xs uppercase tracking-wider text-[var(--reader-muted)] mb-3">Background</p>
          <div className="flex gap-3">
            <ThemeSwatch theme="cream" current={theme} onPick={setTheme} label="White" />
            <ThemeSwatch theme="sepia" current={theme} onPick={setTheme} label="Sepia" />
            <ThemeSwatch theme="dark" current={theme} onPick={setTheme} label="Dark" moon />
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-wider text-[var(--reader-muted)] mb-3">Font</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFontFamily('sans')}
              className={cn(
                'flex-1 py-2.5 px-3 rounded-lg border text-sm transition-colors',
                fontFamily === 'sans'
                  ? 'border-[#2563eb] ring-1 ring-[#2563eb]/30 bg-[var(--reader-fg)]/[0.04]'
                  : 'border-[var(--reader-rule)] hover:bg-[var(--reader-fg)]/5',
              )}
            >
              Sans
            </button>
            <button
              type="button"
              onClick={() => setFontFamily('serif')}
              className={cn(
                'flex-1 py-2.5 px-3 rounded-lg border text-sm font-serif transition-colors',
                fontFamily === 'serif'
                  ? 'border-[#2563eb] ring-1 ring-[#2563eb]/30 bg-[var(--reader-fg)]/[0.04]'
                  : 'border-[var(--reader-rule)] hover:bg-[var(--reader-fg)]/5',
              )}
            >
              Serif
            </button>
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-wider text-[var(--reader-muted)] mb-3">Size</p>
          <div className="flex rounded-lg border border-[var(--reader-rule)] overflow-hidden">
            <button
              type="button"
              aria-label="Smaller text"
              onClick={() => bumpFont(-1)}
              className="flex-1 py-3 hover:bg-[var(--reader-fg)]/5 font-medium"
            >
              A−
            </button>
            <div className="w-px bg-[var(--reader-rule)]" />
            <span className="flex-1 py-3 text-center tabular-nums font-medium">{fontSize}</span>
            <div className="w-px bg-[var(--reader-rule)]" />
            <button
              type="button"
              aria-label="Larger text"
              onClick={() => bumpFont(1)}
              className="flex-1 py-3 hover:bg-[var(--reader-fg)]/5 font-medium"
            >
              A+
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ThemeSwatch({ theme, current, onPick, label, moon }) {
  const active = current === theme;
  const bg =
    theme === 'cream' ? '#ffffff' : theme === 'sepia' ? '#f6ecd8' : '#14110d';

  return (
    <button
      type="button"
      onClick={() => onPick(theme)}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'w-11 h-11 rounded-full border-2 flex items-center justify-center transition-shadow',
        active ? 'border-[#2563eb] ring-2 ring-[#2563eb]/25' : 'border-[var(--reader-rule)]',
      )}
      style={{ backgroundColor: bg }}
    >
      {moon ? <Icon name="dark_mode" size={18} weight={300} className="text-[#ece4d6]" /> : null}
    </button>
  );
}

function TocPanel({ chapters, currentId, bookSlug, onClose, railPx }) {
  return (
    <div
      className="fixed top-0 bottom-0 z-[48] w-[min(100vw-3.5rem,20rem)] bg-[var(--reader-bg)] text-[var(--reader-fg)] shadow-2xl border-l border-[var(--reader-rule)] flex flex-col"
      style={{ right: railPx }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--reader-rule)]">
        <h2 className="font-ui-label-lg text-ui-label-lg">Contents</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--reader-fg)]/5" aria-label="Close">
          <Icon name="close" size={22} weight={300} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5">
          {chapters.map((ch) => {
            const isCurrent = ch.id === currentId;
            return (
              <li key={ch.id}>
                <Link
                  href={`/read/${ch.id}`}
                  onClick={onClose}
                  className={cn(
                    'block px-4 py-2.5 text-sm border-l-2 transition-colors',
                    isCurrent
                      ? 'border-[#2563eb] bg-[var(--reader-fg)]/[0.06] font-medium'
                      : 'border-transparent hover:bg-[var(--reader-fg)]/[0.04]',
                  )}
                >
                  <span className="text-[var(--reader-muted)] tabular-nums mr-2">{ch.idx}.</span>
                  {ch.title}
                </Link>
              </li>
            );
          })}
        </ul>
        {bookSlug ? (
          <div className="px-4 pt-4 pb-6">
            <Link
              href={`/books/${bookSlug}`}
              className="text-xs uppercase tracking-widest text-[var(--reader-muted)] hover:text-[var(--reader-fg)] underline-offset-4 hover:underline"
              onClick={onClose}
            >
              Book page
            </Link>
          </div>
        ) : null}
      </nav>
    </div>
  );
}

function ReaderBottomBar({ prev, next, bookHref }) {
  return (
    <div
      className="fixed bottom-0 z-40 bg-[var(--reader-bg)]/95 backdrop-blur-sm border-t border-[var(--reader-rule)] shadow-reader-bar"
      style={{ left: 0, right: RAIL_W }}
    >
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
