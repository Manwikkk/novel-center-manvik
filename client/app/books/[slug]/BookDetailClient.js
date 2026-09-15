'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { openAuthModal } from '@/lib/authModal';
import { api } from '@/lib/api';
import { libraryApi } from '@/lib/library';
import { readingApi } from '@/lib/reading';
import Icon from '@/components/ui/Icon';
import UnlockModal from '@/components/book/UnlockModal';
import AddToCollectionModal from '@/components/book/AddToCollectionModal';
import LibraryCollectionPrompt from '@/components/book/LibraryCollectionPrompt';
import CommentThread from '@/components/comments/CommentThread';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';
import { formatTokens } from '@/lib/format';
import { isChapterLocked, isChapterReadable, isStaffFreeReader } from '@/lib/chapterAccess';
import {
  hasReadingRestriction,
  notifyReadingRestricted,
} from '@/lib/readingRestriction';

/**
 * Client island for the Book Detail page.  The server component mounts
 * three islands of the same component: `cta`, `toc`, and `comments`,
 * each rendering only the slice it owns.
 */
export default function BookDetailClient({ book, initialChapters, mode = 'all' }) {
  const [chapters, setChapters] = useState(initialChapters);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [inLibrary, setInLibrary] = useState(false);
  // Latest saved position in this book (null = none / signed out).
  const [resume, setResume] = useState(null);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [collectionPromptOpen, setCollectionPromptOpen] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [persistReady, setPersistReady] = useState(
    () => Boolean(useAuthStore.persist?.hasHydrated?.()),
  );
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const pushToast = useUiStore((s) => s.pushToast);
  const freeReader = isStaffFreeReader(user);

  useEffect(() => {
    if (persistReady) return undefined;
    const unsub = useAuthStore.persist?.onFinishHydration?.(() => setPersistReady(true));
    const t = setTimeout(() => setPersistReady(true), 50);
    return () => {
      unsub?.();
      clearTimeout(t);
    };
  }, [persistReady]);

  // Keyed on the user id (not the object) so session polling doesn't refetch and flash.
  const userId = user?.id || null;
  useEffect(() => {
    if (!persistReady) return undefined;
    let cancelled = false;
    // Optimistic: mark canRead for admin/staff so lock/coin UI never flashes.
    // Do not set isUnlocked — that badge is only for paid reader unlocks.
    if (isStaffFreeReader(useAuthStore.getState().user)) {
      setChapters((prev) => prev.map((c) => (
        c.canRead === true ? c : { ...c, canRead: true }
      )));
    }
    api.get(`/books/${book.id}/chapters`)
      .then((data) => { if (!cancelled) setChapters(data.items || []); })
      .catch(() => { /* keep server-rendered list */ });
    if (userId) {
      refreshWallet();
      if (mode === 'cta' || mode === 'all') {
        libraryApi.contains([book.id])
          .then((r) => { if (!cancelled) setInLibrary(Boolean(r?.items?.[book.id])); })
          .catch(() => { /* leave default */ });
        readingApi.latestForBook(book.id)
          .then((r) => { if (!cancelled) setResume(r?.progress || null); })
          .catch(() => { if (!cancelled) setResume(null); });
      }
    } else {
      setInLibrary(false);
      setResume(null);
    }
    return () => { cancelled = true; };
  }, [book.id, userId, refreshWallet, mode, persistReady]);

  const firstReadable = useMemo(
    () => chapters.find((c) => isChapterReadable(c, user)) || chapters[0],
    [chapters, user],
  );
  // Chapter to resume from: the saved position, as long as it is still listed.
  const resumeChapter = useMemo(() => {
    if (!user || !resume?.chapterId) return null;
    return chapters.find((c) => c.id === resume.chapterId) || null;
  }, [chapters, user, resume]);

  function guardReadingAccess() {
    const currentUser = useAuthStore.getState().user;
    if (hasReadingRestriction(currentUser)) {
      notifyReadingRestricted(pushToast);
      return false;
    }
    return true;
  }

  function goToChapter(chapterId) {
    if (!guardReadingAccess()) return;
    router.push(`/read/${chapterId}`);
  }

  async function confirmUnlock(ch) {
    if (!useAuthStore.getState().user) {
      openAuthModal({ message: 'Sign in to unlock chapters.', onSuccess: () => confirmUnlock(ch) });
      return;
    }
    if (!guardReadingAccess()) return;
    setBusy(true);
    try {
      const res = await api.post(`/chapters/${ch.id}/unlock`);
      setBalance(res.balance);
      setChapters((prev) => prev.map((c) => (c.id === ch.id ? { ...c, isUnlocked: true } : c)));
      setTarget(null);
      pushToast({ type: 'success', title: 'Chapter unlocked', message: `${ch.title} is yours to read.` });
    } catch (err) {
      if (err.code === 'INSUFFICIENT_TOKENS') {
        pushToast({ type: 'error', title: 'Not enough tokens', message: 'Visit your wallet to add more.' });
      } else {
        pushToast({ type: 'error', title: 'Unlock failed', message: err.message });
      }
    } finally {
      setBusy(false);
    }
  }

  function handleUnlockClick(ch) {
    if (!useAuthStore.getState().user) {
      openAuthModal({ message: 'Sign in to unlock chapters.', onSuccess: () => handleUnlockClick(ch) });
      return;
    }
    if (!ch.isPaid || ch.tokenPrice === 0) {
      confirmUnlock(ch);
      return;
    }
    setTarget(ch);
  }

  async function toggleLibrary() {
    if (libraryBusy) return;
    if (!useAuthStore.getState().user) {
      openAuthModal({
        message: 'Sign in to save books to your library.',
        onSuccess: () => toggleLibrary(),
      });
      return;
    }
    setLibraryBusy(true);
    const wasIn = inLibrary;
    setInLibrary(!wasIn);
    try {
      if (wasIn) {
        await libraryApi.remove(book.id);
        pushToast({ type: 'success', title: 'Removed from library', message: `${book.title} is no longer saved.` });
      } else {
        await libraryApi.add(book.id);
        pushToast({ type: 'success', title: 'Added to library', message: `${book.title} is saved to your library.` });
        setCollectionPromptOpen(true);
      }
    } catch (err) {
      setInLibrary(wasIn);
      pushToast({ type: 'error', title: 'Library update failed', message: err.message });
    } finally {
      setLibraryBusy(false);
    }
  }

  function libraryCollectionModals() {
    return (
      <>
        <LibraryCollectionPrompt
          open={collectionPromptOpen}
          bookTitle={book?.title}
          onNo={() => setCollectionPromptOpen(false)}
          onYes={() => {
            setCollectionPromptOpen(false);
            setCollectionModalOpen(true);
          }}
        />
        <AddToCollectionModal
          open={collectionModalOpen}
          book={book}
          onClose={() => setCollectionModalOpen(false)}
          onSaved={() => {
            pushToast({
              type: 'success',
              title: 'Collection updated',
              message: `${book.title} was saved to your collection.`,
            });
          }}
        />
      </>
    );
  }

  if (mode === 'cta') {
    const noChapters = chapters.length === 0;
    return (
      <>
        <div className="flex w-full items-stretch gap-2 sm:w-auto sm:flex-wrap sm:items-center sm:gap-4">
          {noChapters ? (
            <span
              className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest bg-neutral-200 text-ink-600 opacity-70 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-400 sm:flex-none sm:gap-2 sm:px-8 sm:py-4 sm:text-ui-label-lg sm:font-ui-label-lg"
              title="No chapters published yet"
            >
              <Icon name="menu_book" className="!text-[16px] sm:!text-[20px]" />
              No chapters yet
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  openAuthModal({
                    message: 'Sign in to start reading.',
                    onSuccess: () => goToChapter(firstReadable.id),
                  });
                  return;
                }
                goToChapter(resumeChapter ? resumeChapter.id : firstReadable.id);
              }}
              title={resumeChapter ? `Continue from chapter ${resumeChapter.idx}` : undefined}
              className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded bg-ink-900 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-white transition-colors hover:opacity-90 dark:bg-white dark:text-black sm:flex-none sm:gap-2 sm:px-8 sm:py-4 sm:text-ui-label-lg sm:font-ui-label-lg"
            >
              <Icon name={resumeChapter ? 'play_arrow' : 'menu_book'} className="!text-[16px] sm:!text-[20px]" />
              {resumeChapter ? `Continue Reading · Ch. ${resumeChapter.idx}` : 'Start Reading'}
            </button>
          )}
          <button
            type="button"
            onClick={toggleLibrary}
            disabled={libraryBusy}
            aria-pressed={inLibrary}
            className={
              inLibrary
                ? 'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded border border-neutral-300 bg-neutral-200 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-ink-900 transition-colors hover:bg-neutral-300 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 sm:flex-none sm:gap-2 sm:px-8 sm:py-4 sm:text-ui-label-lg sm:font-ui-label-lg'
                : 'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded border border-neutral-400 bg-transparent px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-ink-900 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-900 sm:flex-none sm:gap-2 sm:px-8 sm:py-4 sm:text-ui-label-lg sm:font-ui-label-lg'
            }
          >
            <Icon name={inLibrary ? 'bookmark' : 'bookmark_add'} filled={inLibrary} className="!text-[16px] sm:!text-[20px]" />
            {inLibrary ? 'In Library' : 'Add to Library'}
          </button>
        </div>
        {libraryCollectionModals()}
      </>
    );
  }

  if (mode === 'toc') {
    const visible = showAll ? chapters : chapters.slice(0, 6);
    return (
      <>
        {chapters.length === 0 ? (
          <p className="text-ink-600 dark:text-neutral-400 py-10">This book has no published chapters yet.</p>
        ) : (
          <div className="flex flex-col border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-lg overflow-hidden shadow-sm">
            {visible.map((ch, i) => (
              <ChapterRow
                key={ch.id}
                chapter={ch}
                isLast={i === visible.length - 1}
                onUnlockClick={handleUnlockClick}
                onReadClick={goToChapter}
                readingRestricted={hasReadingRestriction(user)}
                freeReader={freeReader}
                user={user}
                // Hide coin locks until auth persist restores admin/staff role.
                authPending={!persistReady}
                busy={busy}
              />
            ))}
          </div>
        )}

        {chapters.length > 6 && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="font-ui-label-lg text-ui-label-lg text-ink-900 dark:text-neutral-100 hover:text-ink-600 dark:hover:text-neutral-400 underline decoration-neutral-400 dark:decoration-neutral-600 underline-offset-4 transition-colors"
            >
              {showAll ? 'Collapse Chapters' : `View All ${chapters.length} Chapters`}
            </button>
          </div>
        )}

        <UnlockModal
          open={!!target}
          chapter={target}
          balance={balance}
          onClose={() => setTarget(null)}
          onConfirm={confirmUnlock}
          busy={busy}
        />
      </>
    );
  }

  if (mode === 'comments') {
    return <CommentThread bookId={book.id} />;
  }

  return null;
}

function ChapterRow({
  chapter,
  onUnlockClick,
  onReadClick,
  readingRestricted,
  freeReader,
  user,
  authPending,
  busy,
  isLast,
}) {
  const suspended = readingRestricted && chapter.canRead === false && !freeReader;
  const locked = !authPending && !freeReader && (suspended || isChapterLocked(chapter, user));
  const paidLock = locked && !suspended;
  const isTrulyFree = !chapter.isPaid || Number(chapter.tokenPrice) === 0;
  // Paid chapters unlocked with coins (readers only — not admin free-pass).
  const showUnlocked = !freeReader && !authPending && chapter.isPaid && chapter.isUnlocked;
  const dateLabel = new Date(chapter.updatedAt || chapter.createdAt || Date.now())
    .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const Body = (
    <div className="flex items-center gap-6 min-w-0 flex-1">
      <span className="font-ui-label-sm text-ui-label-sm text-ink-400 dark:text-neutral-400 w-12 shrink-0 tabular-nums">
        {String(chapter.idx).padStart(2, '0')}
      </span>
      <div className="min-w-0">
        <h3 className="font-ui-label-lg text-ui-label-lg text-ink-900 dark:text-neutral-100 flex items-center gap-2 truncate">
          {chapter.title}
          {locked && <Icon name="lock" size={16} className="text-ink-500 dark:text-neutral-500" />}
        </h3>
        <p className="font-ui-label-sm text-ui-label-sm text-ink-600 dark:text-neutral-400 mt-1 truncate">
          {dateLabel}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={`flex items-center justify-between p-6 transition-colors gap-4 ${
        isLast ? '' : 'border-b border-neutral-200 dark:border-neutral-800'
      } ${locked ? 'bg-neutral-50 dark:bg-neutral-900/80 opacity-90 hover:opacity-100' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'} group`}
    >
      {locked ? (
        <div className="flex items-center gap-6 min-w-0 flex-1">{Body}</div>
      ) : (
        <button
          type="button"
          onClick={() => onReadClick?.(chapter.id)}
          className="flex items-center gap-6 min-w-0 flex-1 text-left"
        >
          {Body}
        </button>
      )}

      <div className="flex items-center gap-4 shrink-0">
        {isTrulyFree && !freeReader && (
          <span className="px-2 py-1 bg-neutral-200 dark:bg-neutral-800 text-ink-700 dark:text-neutral-300 font-ui-label-sm uppercase rounded text-[10px]">
            Free
          </span>
        )}
        {freeReader && (
          <span className="px-2 py-1 bg-neutral-200 dark:bg-neutral-800 text-ink-700 dark:text-neutral-300 font-ui-label-sm uppercase rounded text-[10px]">
            Free access
          </span>
        )}
        {showUnlocked && (
          <span className="px-2 py-1 bg-tertiary-fixed/40 text-on-tertiary-container font-ui-label-sm uppercase rounded text-[10px] inline-flex items-center gap-1">
            <Icon name="check_circle" filled size={14} /> Unlocked
          </span>
        )}
        {suspended && (
          <button
            type="button"
            onClick={() => onReadClick?.(chapter.id)}
            disabled={busy}
            className="px-4 py-2 border border-danger/40 text-danger font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-danger/5 transition-colors text-[10px] disabled:opacity-60"
          >
            Restricted
          </button>
        )}
        {paidLock && (
          <>
            <div className="hidden sm:flex items-center gap-1 bg-tertiary-fixed/20 dark:bg-tertiary-container/60 px-3 py-1 rounded-full border border-tertiary-fixed-dim/30 dark:border-on-tertiary-container/40">
              <Icon name="toll" filled size={14} className="text-on-tertiary-container" />
              <span className="font-ui-label-sm text-ui-label-sm text-on-tertiary-container">
                {formatTokens(chapter.tokenPrice)} Tokens
              </span>
            </div>
            <button
              type="button"
              onClick={() => onUnlockClick?.(chapter)}
              disabled={busy}
              className="px-4 py-2 bg-ink-900 text-white dark:bg-white dark:text-black font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:opacity-90 transition-colors text-[10px] disabled:opacity-60"
            >
              Unlock
            </button>
          </>
        )}
        {(freeReader || showUnlocked) && !suspended && (
          <button
            type="button"
            onClick={() => onReadClick?.(chapter.id)}
            className="px-4 py-2 border border-neutral-400 dark:border-neutral-600 text-ink-900 dark:text-neutral-100 font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-[10px]"
          >
            Read
          </button>
        )}
      </div>
    </div>
  );
}
