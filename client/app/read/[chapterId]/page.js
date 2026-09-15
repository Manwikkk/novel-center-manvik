'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { sanitizeChapterHtml } from '@/lib/sanitize';
import Icon from '@/components/ui/Icon';
import ChapterCommentsPanel from '@/components/comments/ChapterCommentsPanel';
import CreatorsThoughtCard from '@/components/read/CreatorsThoughtCard';
import AddToLibraryPrompt from '@/components/book/AddToLibraryPrompt';
import TopUpModal from '@/components/wallet/TopUpModal';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';
import { useReaderStore } from '@/stores/readerStore';
import { readingApi } from '@/lib/reading';
import { libraryApi } from '@/lib/library';
import { formatTokens } from '@/lib/format';
import { openAuthModal } from '@/lib/authModal';
import { isChapterLocked, isStaffFreeReader } from '@/lib/chapterAccess';
import {
  hasReadingRestriction,
  READING_RESTRICTED_MESSAGE,
  READING_RESTRICTED_TITLE,
} from '@/lib/readingRestriction';
import { cn } from '@/lib/cn';

const WPM = 220;
const RAIL_W = 56; // px — w-14
const AGE_GATE_CODES = ['AGE_VERIFICATION_REQUIRED', 'AGE_RESTRICTED'];
const ERROR_CTA =
  'inline-block font-ui-label-sm text-ui-label-sm uppercase underline decoration-tertiary-fixed-dim underline-offset-4';

// Chapter text is not copyable from the reader (bug 41).
function blockCopy(e) {
  e.preventDefault();
}
const TOOLBAR_H = 56; // px — h-14 fixed top toolbar
const DEFAULT_COVER = '/stitch/book-architecture-silence.jpg';
// Fraction of the viewport height used as the "reading line" that decides which chapter is active.
const READING_LINE = 0.35;

function clampPct(n) {
  return Math.max(0, Math.min(100, n));
}

/**
 * Reading page: chapters stream continuously — when the reader nears the end of
 * the current chapter the next published one is appended below it. The URL, top
 * toolbar, progress and comments follow the chapter in view. Locked (paid)
 * chapters render their unlock card in the stream instead of a separate screen.
 * Right rail: TOC, display options (gear), comments, help.
 */
export default function ReadingInterfacePage() {
  const { chapterId } = useParams();
  const router = useRouter();

  const [entries, setEntries] = useState([]); // loaded chapters, in reading order
  const [book, setBook] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [progress, setProgress] = useState(0); // percent through the active chapter
  const [error, setError] = useState(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rightPanel, setRightPanel] = useState(null); // null | 'settings' | 'toc' | 'comments'
  const [commentsChapterId, setCommentsChapterId] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});
  const [inLibrary, setInLibrary] = useState(null); // null = unknown
  const [libraryPromptOpen, setLibraryPromptOpen] = useState(false);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [topUp, setTopUp] = useState(null); // { requiredTokens } | null

  const sectionRefs = useRef(new Map());
  const sentinelRef = useRef(null);
  const entriesRef = useRef([]);
  const siblingsRef = useRef([]);
  const bookRef = useRef(null);
  const loadingNextRef = useRef(false);
  const pendingScrollRef = useRef(null);
  const pendingLeaveRef = useRef(null);
  const countedRef = useRef(new Set());

  const user = useAuthStore((s) => s.user);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const userId = user?.id || null;
  const [persistReady, setPersistReady] = useState(false);
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const pushToast = useUiStore((s) => s.pushToast);
  const apply = useReaderStore((s) => s.apply);

  useEffect(() => { apply?.(); }, [apply]);
  useEffect(() => { entriesRef.current = entries; }, [entries]);
  useEffect(() => { siblingsRef.current = siblings; }, [siblings]);
  useEffect(() => { bookRef.current = book; }, [book]);

  // Wait for zustand persist to restore user from localStorage before fetching,
  // so the first chapter request includes admin/staff free-read context.
  useEffect(() => {
    const finish = () => setPersistReady(true);
    if (useAuthStore.persist?.hasHydrated?.()) {
      finish();
      return undefined;
    }
    const unsub = useAuthStore.persist?.onFinishHydration?.(finish);
    // Fallback if persist API is unavailable
    const t = setTimeout(finish, 50);
    return () => {
      unsub?.();
      clearTimeout(t);
    };
  }, []);

  // Route change (or sign-in/out): start a fresh stream at the requested chapter.
  // Keyed on the user *id*, not the user object — session polling must not reset the reader.
  const lastParamRef = useRef(null);
  const activeIdRef = useRef(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => {
    if (!persistReady) return undefined;
    let cancel = false;
    const paramId = Number(chapterId);
    // A sign-in/out restarts at the chapter currently in view, not the one in the route.
    const routeChanged = lastParamRef.current !== paramId;
    lastParamRef.current = paramId;
    const targetId = routeChanged ? paramId : (activeIdRef.current || paramId);
    setError(null);
    setEntries([]);
    setActiveId(targetId);
    setProgress(0);
    setRightPanel(null);
    setCommentsChapterId(null);
    pendingScrollRef.current = null;

    async function load() {
      try {
        const cRes = await api.get(`/chapters/${targetId}`);
        if (cancel) return;
        const ch = cRes.chapter;
        setEntries([ch]);

        // Book + table of contents are reused when jumping within the same book.
        if (!bookRef.current || Number(bookRef.current.id) !== Number(ch.bookId)) {
          const bRes = await api.get(`/books/by-id/${ch.bookId}`);
          if (cancel) return;
          setBook(bRes.book || null);
        }
        const sib = await api.get(`/books/${ch.bookId}/chapters`);
        if (cancel) return;
        setSiblings(sib.items || []);
        if (userId) refreshWallet();
      } catch (err) {
        if (!cancel) setError(err);
      }
    }
    load();
    return () => { cancel = true; };
  }, [chapterId, userId, refreshWallet, persistReady]);

  // Library membership (drives the "save to library?" prompt when leaving).
  useEffect(() => {
    if (!userId || !book?.id) {
      setInLibrary(null);
      return undefined;
    }
    let cancel = false;
    libraryApi.contains([book.id])
      .then((r) => { if (!cancel) setInLibrary(Boolean(r?.items?.[book.id])); })
      .catch(() => { if (!cancel) setInLibrary(null); });
    return () => { cancel = true; };
  }, [userId, book?.id]);

  // Comment counts for every loaded chapter (rail badge + per-chapter trigger).
  useEffect(() => {
    const pending = entries.filter((e) => !countedRef.current.has(e.id));
    if (!pending.length) return undefined;
    let cancel = false;
    for (const entry of pending) {
      countedRef.current.add(entry.id);
      api
        .get('/comments', { query: { chapterId: entry.id, pageSize: 1, page: 1 } })
        .then((d) => {
          if (cancel) return;
          setCommentCounts((prev) => ({ ...prev, [entry.id]: Number(d.totalRoots) || 0 }));
        })
        .catch(() => { countedRef.current.delete(entry.id); });
    }
    return () => { cancel = true; };
  }, [entries]);

  // Which chapter is in view + how far through it the reader is.
  const computeScroll = useCallback(() => {
    const list = entriesRef.current;
    if (!list.length) return;
    const line = window.innerHeight * READING_LINE;
    let active = list[0].id;
    for (const entry of list) {
      const el = sectionRefs.current.get(entry.id);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= line) active = entry.id;
      else break;
    }
    const el = sectionRefs.current.get(active);
    let pct = 0;
    if (el) {
      const rect = el.getBoundingClientRect();
      const height = Math.max(1, rect.height);
      // How far the bottom of the viewport has travelled into this chapter.
      const passed = Math.min(height, Math.max(0, window.innerHeight - rect.top));
      pct = clampPct((passed / height) * 100);
    }
    setActiveId((prev) => (prev === active ? prev : active));
    setProgress(pct);

    const sentinel = sentinelRef.current;
    if (sentinel && canAutoContinueRef.current) {
      if (sentinel.getBoundingClientRect().top < window.innerHeight + 800) {
        appendNextRef.current?.();
      }
    }
  }, []);
  const canAutoContinueRef = useRef(false);
  const appendNextRef = useRef(null);

  // Keep the address bar on the chapter being read (no navigation, no remount).
  useEffect(() => {
    if (!activeId) return;
    const target = `/read/${activeId}`;
    if (window.location.pathname !== target) {
      window.history.replaceState(null, '', target);
    }
  }, [activeId]);

  // Scroll to a chapter that was just appended on request (Next button / TOC).
  useEffect(() => {
    const wanted = pendingScrollRef.current;
    if (!wanted) return;
    if (entries.some((e) => e.id === wanted)) {
      pendingScrollRef.current = null;
      scrollToEntry(wanted);
    }
  }, [entries]);

  const progressRef = useRef(0);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  // Save reading progress for the active chapter (throttled; flushed on hide / chapter change).
  useEffect(() => {
    if (!userId || !activeId) return undefined;
    const id = activeId;
    let lastSent = 0;
    let lastValue = -1;

    const flush = (force = false) => {
      const pct = Math.round(progressRef.current || 0);
      if (!force && pct === lastValue) return;
      lastSent = Date.now();
      lastValue = pct;
      readingApi
        .saveProgress(id, pct, Math.round(window.scrollY || 0))
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
  }, [userId, activeId]);

  const freeReader = isStaffFreeReader(user);
  const readingRestricted = hasReadingRestriction(user);

  const activeChapter = useMemo(
    () => entries.find((e) => e.id === activeId) || siblings.find((c) => c.id === activeId) || null,
    [entries, siblings, activeId],
  );
  const activeIdx = siblings.findIndex((c) => c.id === activeId);
  const prev = activeIdx > 0 ? siblings[activeIdx - 1] : null;
  const next = activeIdx >= 0 && activeIdx < siblings.length - 1 ? siblings[activeIdx + 1] : null;

  const lastEntry = entries[entries.length - 1] || null;
  const lastEntryIdx = lastEntry ? siblings.findIndex((c) => c.id === lastEntry.id) : -1;
  const nextAfterLast = lastEntryIdx >= 0 && lastEntryIdx < siblings.length - 1
    ? siblings[lastEntryIdx + 1]
    : null;
  // Keep streaming only while the last loaded chapter is actually readable.
  const canAutoContinue = Boolean(
    lastEntry
    && nextAfterLast
    && !isChapterLocked(lastEntry, user)
    && !(readingRestricted && lastEntry.canRead === false && !freeReader),
  );

  const wordCount = activeChapter?.wordCount || 0;
  const minutesLeft = useMemo(() => {
    const remainingWords = Math.max(0, wordCount * (100 - progress) / 100);
    if (!wordCount || remainingWords < 1) return 0;
    return Math.max(1, Math.round(remainingWords / WPM));
  }, [wordCount, progress]);

  const appendNext = useCallback(async () => {
    if (loadingNextRef.current) return null;
    const list = entriesRef.current;
    const sibs = siblingsRef.current;
    const last = list[list.length - 1];
    if (!last) return null;
    const i = sibs.findIndex((c) => c.id === last.id);
    const target = i >= 0 ? sibs[i + 1] : null;
    if (!target) return null;
    if (list.some((e) => e.id === target.id)) return target.id;

    loadingNextRef.current = true;
    setLoadingNext(true);
    try {
      const res = await api.get(`/chapters/${target.id}`);
      const ch = res.chapter;
      setEntries((cur) => (cur.some((e) => e.id === ch.id) ? cur : [...cur, ch]));
      return ch.id;
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not load the next chapter', message: err.message });
      return null;
    } finally {
      loadingNextRef.current = false;
      setLoadingNext(false);
    }
  }, [pushToast]);

  // Append the next chapter as the reader approaches the end of the stream.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !canAutoContinue) return undefined;
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((r) => r.isIntersecting)) appendNext();
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [canAutoContinue, appendNext, entries.length]);

  useEffect(() => { canAutoContinueRef.current = canAutoContinue; }, [canAutoContinue]);
  useEffect(() => { appendNextRef.current = appendNext; }, [appendNext]);

  useEffect(() => {
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = null;
        computeScroll();
      });
    };
    computeScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [computeScroll, entries, canAutoContinue]);

  function scrollToEntry(id) {
    const el = sectionRefs.current.get(id);
    if (!el) return false;
    const top = el.getBoundingClientRect().top + window.scrollY - (TOOLBAR_H + 16);
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    return true;
  }

  function openChapter(id) {
    if (id == null) return;
    if (entriesRef.current.some((e) => e.id === id)) {
      scrollToEntry(id);
      return;
    }
    router.push(`/read/${id}`);
  }

  async function goNext() {
    if (!next) return;
    if (entriesRef.current.some((e) => e.id === next.id)) {
      scrollToEntry(next.id);
      return;
    }
    pendingScrollRef.current = next.id;
    const id = await appendNext();
    if (!id) pendingScrollRef.current = null;
  }

  function goPrev() {
    if (!prev) return;
    openChapter(prev.id);
  }

  const bookHref = book ? `/books/${book.slug}` : '/';

  // Leaving the reader: offer to save the book first when it isn't in the library yet.
  function leaveToBook() {
    if (userId && book && inLibrary === false) {
      pendingLeaveRef.current = bookHref;
      setLibraryPromptOpen(true);
      return;
    }
    router.push(bookHref);
  }

  function finishLeave() {
    const href = pendingLeaveRef.current || bookHref;
    pendingLeaveRef.current = null;
    setLibraryPromptOpen(false);
    router.push(href);
  }

  async function addToLibraryAndLeave() {
    if (!book || libraryBusy) return;
    setLibraryBusy(true);
    try {
      await libraryApi.add(book.id);
      setInLibrary(true);
      pushToast({ type: 'success', title: 'Added to library', message: `${book.title} is saved to your library.` });
      finishLeave();
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not save', message: err.message });
    } finally {
      setLibraryBusy(false);
    }
  }

  async function unlock(entry) {
    if (!useAuthStore.getState().user) {
      openAuthModal({ message: 'Sign in to unlock this chapter.', onSuccess: () => unlock(entry) });
      return;
    }
    setBusy(true);
    try {
      const r = await api.post(`/chapters/${entry.id}/unlock`);
      setBalance(r.balance);
      const fresh = await api.get(`/chapters/${entry.id}`);
      setEntries((cur) => cur.map((e) => (e.id === entry.id ? fresh.chapter : e)));
      setSiblings((cur) => cur.map((c) => (
        c.id === entry.id ? { ...c, isUnlocked: true, canRead: fresh.chapter.canRead } : c
      )));
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

  function openComments(id) {
    setCommentsChapterId(id);
    setRightPanel('comments');
  }

  function toggleCommentsPanel() {
    if (rightPanel === 'comments') {
      closePanel();
      return;
    }
    openComments(activeId);
  }

  // Comment count for the chapter whose panel is open. Stable identity so the
  // panel's fetch effect does not re-run on every reader re-render.
  const panelChapterId = commentsChapterId || activeId;
  const onPanelCountChange = useCallback((n) => {
    if (!panelChapterId) return;
    setCommentCounts((cur) => (cur[panelChapterId] === n ? cur : { ...cur, [panelChapterId]: n }));
  }, [panelChapterId]);

  useEffect(() => {
    if (!rightPanel) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closePanel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rightPanel]);

  if (error) {
    const readingBlocked = /reading is restricted/i.test(error.message || '');
    // Mature novels: the API refuses chapter content until the reader is a verified adult.
    const ageGated = AGE_GATE_CODES.includes(error.code);
    const needsSignIn = ageGated && !user;
    const needsBirthDate = error.code === 'AGE_VERIFICATION_REQUIRED' && !!user;
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--reader-bg)] text-[var(--reader-fg)]">
        <div className="text-center max-w-md px-6">
          <p className="font-ui-label-sm text-ui-label-sm uppercase opacity-70">
            {readingBlocked ? READING_RESTRICTED_TITLE : ageGated ? 'Mature content' : 'Unavailable'}
          </p>
          <h1 className="mt-3 font-display-lg text-[28px]">
            {readingBlocked
              ? 'Reading is restricted'
              : error.code === 'AGE_RESTRICTED'
                ? 'This novel is for adult readers'
                : ageGated
                  ? 'Verify your age to continue'
                  : 'This chapter could not be opened.'}
          </h1>
          <p className="mt-2 opacity-70">
            {readingBlocked ? READING_RESTRICTED_MESSAGE : error.message}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {needsSignIn ? (
              <button
                type="button"
                onClick={() => openAuthModal({ message: 'Sign in to verify your age.' })}
                className={ERROR_CTA}
              >
                Sign in
              </button>
            ) : null}
            {needsBirthDate ? (
              <Link href="/account" className={ERROR_CTA}>
                Add your date of birth
              </Link>
            ) : null}
            <Link href={bookRef.current?.slug ? `/books/${bookRef.current.slug}` : '/'} className={ERROR_CTA}>
              {bookRef.current?.slug ? 'Back to the novel' : 'Return home'}
            </Link>
          </div>
        </div>
      </div>
    );
  }
  // Full-screen loading only on the very first load; in-book jumps keep the chrome.
  if (!persistReady || (!book && entries.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--reader-bg)] text-[var(--reader-fg)] font-ui-label-sm uppercase tracking-widest opacity-70">
        Loading…
      </div>
    );
  }

  const commentsFor = commentsChapterId || activeId;
  const activeCommentCount = commentCounts[activeId] || 0;

  return (
    <div className="bg-[var(--reader-bg)] text-[var(--reader-fg)] min-h-screen flex flex-col antialiased selection:bg-tertiary-fixed selection:text-on-tertiary-fixed pr-14">
      <ReaderTopToolbar
        chapter={activeChapter}
        progress={progress}
        minutesLeft={minutesLeft}
        onBack={leaveToBook}
      />

      <ReaderRightRail
        onToc={() => setRightPanel((p) => (p === 'toc' ? null : 'toc'))}
        onSettings={() => setRightPanel((p) => (p === 'settings' ? null : 'settings'))}
        onComments={toggleCommentsPanel}
        tocActive={rightPanel === 'toc'}
        settingsActive={rightPanel === 'settings'}
        commentsActive={rightPanel === 'comments'}
        commentCount={activeCommentCount}
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
              currentId={activeId}
              onSelect={(id) => { closePanel(); openChapter(id); }}
              onLeave={() => { closePanel(); leaveToBook(); }}
              onClose={closePanel}
              railPx={RAIL_W}
              user={user}
            />
          ) : null}
          {rightPanel === 'comments' && commentsFor ? (
            <ChapterCommentsPanel
              key={commentsFor}
              chapterId={commentsFor}
              open
              onClose={closePanel}
              railPx={RAIL_W}
              onCountChange={onPanelCountChange}
            />
          ) : null}
        </>
      ) : null}

      <main className="flex-grow pt-[4.5rem] pb-32 px-4 md:px-8 flex justify-center">
        <div className="max-w-[720px] w-full">
          {entries.length === 0 ? (
            <p className="py-16 text-center font-ui-label-sm uppercase tracking-widest opacity-70">
              Loading chapter…
            </p>
          ) : (
            entries.map((entry, index) => (
              <ChapterSection
                key={entry.id}
                entry={entry}
                index={index}
                book={book}
                user={user}
                authHydrated={authHydrated}
                freeReader={freeReader}
                readingRestricted={readingRestricted}
                balance={balance}
                busy={busy}
                commentCount={commentCounts[entry.id] || 0}
                onUnlock={unlock}
                onTopUp={(entryToUnlock) => setTopUp({ requiredTokens: Number(entryToUnlock.tokenPrice) || 0 })}
                onOpenComments={openComments}
                onBackToBook={leaveToBook}
                sectionRef={(el) => {
                  if (el) sectionRefs.current.set(entry.id, el);
                  else sectionRefs.current.delete(entry.id);
                }}
              />
            ))
          )}

          {loadingNext ? (
            <p className="mt-16 py-8 text-center font-ui-label-sm uppercase tracking-widest opacity-70">
              Loading next chapter…
            </p>
          ) : null}
          <div ref={sentinelRef} aria-hidden className="h-px" />

          {entries.length > 0 && !nextAfterLast && !loadingNext ? (
            <div className="mt-20 pt-10 border-t border-[var(--reader-rule)] text-center">
              <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest opacity-60">
                End of book
              </p>
              <p className="mt-3 text-sm text-[var(--reader-muted)]">
                You&rsquo;re caught up on every published chapter.
              </p>
              <button
                type="button"
                onClick={leaveToBook}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 border border-[var(--reader-rule)] font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-[var(--reader-fg)]/5 transition-colors"
              >
                Back to book
              </button>
            </div>
          ) : null}
        </div>
      </main>

      <ReaderBottomBar
        prev={prev}
        next={next}
        onPrev={goPrev}
        onNext={goNext}
        onLeave={leaveToBook}
      />

      <AddToLibraryPrompt
        open={libraryPromptOpen}
        bookTitle={book?.title}
        busy={libraryBusy}
        onAdd={addToLibraryAndLeave}
        onSkip={finishLeave}
      />

      <TopUpModal
        open={!!topUp}
        requiredTokens={topUp?.requiredTokens || 0}
        onClose={() => setTopUp(null)}
      />
    </div>
  );
}

/** One chapter in the stream: header, body (or unlock / restricted card), author's thought, comment trigger. */
const ChapterSection = memo(function ChapterSection({
  entry,
  index,
  book,
  user,
  authHydrated,
  freeReader,
  readingRestricted,
  balance,
  busy,
  commentCount,
  onUnlock,
  onTopUp,
  onOpenComments,
  onBackToBook,
  sectionRef,
}) {
  const cleanHtml = useMemo(() => sanitizeChapterHtml(entry.contentHtml || ''), [entry.contentHtml]);
  const locked = isChapterLocked(entry, user);
  const readingBlocked = readingRestricted && !entry.canRead && !freeReader;
  const awaitingFreeContent = freeReader && !entry.contentHtml;
  const isPaidLocked = locked && !readingBlocked && !freeReader && entry.isPaid && Number(entry.tokenPrice) > 0;
  const showTitlePage = entry.idx === 1 && book?.isOriginal;
  const price = Number(entry.tokenPrice) || 0;

  return (
    <article
      ref={sectionRef}
      data-chapter-id={entry.id}
      className={cn(index > 0 && 'mt-24 pt-16 border-t border-[var(--reader-rule)]')}
    >
      {showTitlePage ? (
        <TitlePageHero book={book} chapter={entry} />
      ) : (
        <header className="mb-12">
          <h2 className="font-display-lg text-[28px] md:text-[34px] mb-2 leading-tight text-[var(--reader-fg)]">
            Chapter {entry.idx}: {entry.title}
          </h2>
          {entry.readingMinutes ? (
            <p className="text-sm text-[var(--reader-muted)]">
              {entry.readingMinutes} min read
            </p>
          ) : null}
        </header>
      )}

      {readingBlocked ? (
        <div className="border border-danger/30 rounded-lg p-8 text-center bg-danger/5">
          <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest text-danger">
            {READING_RESTRICTED_TITLE}
          </p>
          <h2 className="mt-3 font-headline-md text-headline-md">Reading is restricted</h2>
          <p className="mt-3 opacity-80">{READING_RESTRICTED_MESSAGE}</p>
          <button
            type="button"
            onClick={onBackToBook}
            className="mt-6 inline-block px-6 py-3 border border-[var(--reader-rule)] font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-[var(--reader-fg)]/5 transition-colors"
          >
            Back to book
          </button>
        </div>
      ) : awaitingFreeContent || (!authHydrated && !entry.contentHtml) ? (
        <p className="py-16 text-center font-ui-label-sm uppercase tracking-widest opacity-70">
          Loading chapter…
        </p>
      ) : isPaidLocked ? (
        <div className="border border-[var(--reader-rule)] rounded-lg p-8 text-center bg-[var(--reader-bg)]/60">
          <p className="font-ui-label-sm text-ui-label-sm uppercase tracking-widest opacity-70">
            Locked chapter
          </p>
          <h2 className="mt-3 font-headline-md text-headline-md">Unlock to keep reading.</h2>
          <p className="mt-3 opacity-80">
            This chapter costs {formatTokens(price)} tokens. Your balance: {formatTokens(balance)} tokens.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onUnlock(entry)}
              disabled={busy || balance < price}
              className="px-6 py-3 bg-primary text-on-primary font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {busy ? 'Unlocking…' : 'Unlock chapter'}
            </button>
            <button
              type="button"
              onClick={() => onTopUp(entry)}
              className="px-6 py-3 border border-[var(--reader-rule)] font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-[var(--reader-fg)]/5 transition-colors"
            >
              Top up
            </button>
          </div>
        </div>
      ) : (
        <div
          className="prose-reader prose-stitch space-y-8 leading-relaxed select-none"
          onCopy={blockCopy}
          onCut={blockCopy}
          onContextMenu={blockCopy}
          onDragStart={blockCopy}
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      )}

      <CreatorsThoughtCard
        authorName={book?.authorName}
        authorAvatarUrl={book?.authorAvatarUrl}
        thought={entry.authorThought}
      />

      <div className="mt-16 flex justify-center">
        <ChapterCommentTrigger
          count={commentCount}
          onClick={() => onOpenComments(entry.id)}
        />
      </div>
    </article>
  );
});

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
          Author:{' '}
          {book.authorId ? (
            <Link
              href={`/authors/${book.authorId}`}
              className="text-[#2f6bff] hover:underline underline-offset-2"
            >
              {book.authorName}
            </Link>
          ) : (
            book.authorName
          )}
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

function TocPanel({ chapters, currentId, onSelect, onLeave, onClose, railPx, user }) {
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
            const locked = isChapterLocked(ch, user);
            return (
              <li key={ch.id}>
                {locked ? (
                  <div
                    className={cn(
                      'block px-4 py-2.5 text-sm border-l-2 opacity-70',
                      isCurrent
                        ? 'border-[#2563eb] bg-[var(--reader-fg)]/[0.06] font-medium'
                        : 'border-transparent',
                    )}
                  >
                    <span className="text-[var(--reader-muted)] tabular-nums mr-2">{ch.idx}.</span>
                    {ch.title}
                    <Icon name="lock" size={14} className="inline ml-2 align-text-bottom opacity-60" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect(ch.id)}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={cn(
                      'block w-full text-left px-4 py-2.5 text-sm border-l-2 transition-colors',
                      isCurrent
                        ? 'border-[#2563eb] bg-[var(--reader-fg)]/[0.06] font-medium'
                        : 'border-transparent hover:bg-[var(--reader-fg)]/[0.04]',
                    )}
                  >
                    <span className="text-[var(--reader-muted)] tabular-nums mr-2">{ch.idx}.</span>
                    {ch.title}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <div className="px-4 pt-4 pb-6">
          <button
            type="button"
            onClick={onLeave}
            className="text-xs uppercase tracking-widest text-[var(--reader-muted)] hover:text-[var(--reader-fg)] underline-offset-4 hover:underline"
          >
            Book page
          </button>
        </div>
      </nav>
    </div>
  );
}

function ReaderBottomBar({ prev, next, onPrev, onNext, onLeave }) {
  return (
    <div
      className="fixed bottom-0 z-40 bg-[var(--reader-bg)]/95 backdrop-blur-sm border-t border-[var(--reader-rule)] shadow-reader-bar"
      style={{ left: 0, right: RAIL_W }}
    >
      <div className="max-w-[720px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        {prev ? (
          <button
            type="button"
            onClick={onPrev}
            className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity group font-ui-label-sm text-ui-label-sm uppercase"
          >
            <Icon name="arrow_back_ios" size={20} weight={300} className="group-hover:-translate-x-1 transition-transform" />
            Previous
          </button>
        ) : (
          <button
            type="button"
            onClick={onLeave}
            className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity group font-ui-label-sm text-ui-label-sm uppercase"
          >
            <Icon name="arrow_back_ios" size={20} weight={300} />
            Book
          </button>
        )}

        <span className="hidden md:block font-ui-label-sm text-ui-label-sm uppercase opacity-50 tracking-widest truncate max-w-[40%] text-center">
          {prev || next ? 'Reader' : 'End of book'}
        </span>

        {next ? (
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity group font-ui-label-sm text-ui-label-sm uppercase"
          >
            Next
            <Icon name="arrow_forward_ios" size={20} weight={300} className="group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onLeave}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity group font-ui-label-sm text-ui-label-sm uppercase"
          >
            Finish
            <Icon name="arrow_forward_ios" size={20} weight={300} />
          </button>
        )}
      </div>
    </div>
  );
}
