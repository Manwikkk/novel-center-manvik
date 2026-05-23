'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { libraryApi } from '@/lib/library';
import Icon from '@/components/ui/Icon';
import UnlockModal from '@/components/book/UnlockModal';
import CommentThread from '@/components/comments/CommentThread';
import { useAuthStore } from '@/stores/authStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUiStore } from '@/stores/uiStore';
import { formatTokens } from '@/lib/format';

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
  const [libraryBusy, setLibraryBusy] = useState(false);
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const balance = useWalletStore((s) => s.balance);
  const setBalance = useWalletStore((s) => s.setBalance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => {
    let cancelled = false;
    api.get(`/books/${book.id}/chapters`)
      .then((data) => { if (!cancelled) setChapters(data.items || []); })
      .catch(() => { /* keep server-rendered list */ });
    if (user) {
      refreshWallet();
      if (mode === 'cta' || mode === 'all') {
        libraryApi.contains([book.id])
          .then((r) => { if (!cancelled) setInLibrary(Boolean(r?.items?.[book.id])); })
          .catch(() => { /* leave default */ });
      }
    } else {
      setInLibrary(false);
    }
    return () => { cancelled = true; };
  }, [book.id, user, refreshWallet, mode]);

  const firstReadable = useMemo(
    () => chapters.find((c) => !c.isPaid || c.isUnlocked) || chapters[0],
    [chapters],
  );

  async function confirmUnlock(ch) {
    if (!user) { router.push('/auth/login'); return; }
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
    if (!user) { router.push('/auth/login'); return; }
    if (!ch.isPaid || ch.tokenPrice === 0) {
      confirmUnlock(ch);
      return;
    }
    setTarget(ch);
  }

  async function toggleLibrary() {
    if (libraryBusy) return;
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(`/books/${book.slug}`)}`);
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
      }
    } catch (err) {
      setInLibrary(wasIn);
      pushToast({ type: 'error', title: 'Library update failed', message: err.message });
    } finally {
      setLibraryBusy(false);
    }
  }

  if (mode === 'cta') {
    const noChapters = chapters.length === 0;
    return (
      <div className="flex flex-wrap items-center gap-4">
        {noChapters ? (
          <span
            className="px-8 py-4 bg-neutral-200 dark:bg-neutral-800 text-ink-600 dark:text-neutral-400 font-ui-label-lg text-ui-label-lg uppercase tracking-widest rounded flex items-center gap-2 cursor-not-allowed opacity-70"
            title="No chapters published yet"
          >
            <Icon name="menu_book" size={20} />
            No chapters yet
          </span>
        ) : (
          <Link
            href={user ? `/read/${firstReadable.id}` : `/auth/login?next=/books/${book.slug}`}
            className="px-8 py-4 bg-ink-900 text-white dark:bg-white dark:text-black font-ui-label-lg text-ui-label-lg uppercase tracking-widest rounded hover:opacity-90 transition-colors flex items-center gap-2"
          >
            <Icon name="menu_book" size={20} />
            Start Reading
          </Link>
        )}
        <button
          type="button"
          onClick={toggleLibrary}
          disabled={libraryBusy}
          aria-pressed={inLibrary}
          className={
            inLibrary
              ? 'px-8 py-4 bg-neutral-200 dark:bg-neutral-800 text-ink-900 dark:text-neutral-100 font-ui-label-lg text-ui-label-lg uppercase tracking-widest rounded hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2 border border-neutral-300 dark:border-neutral-600 disabled:opacity-60'
              : 'px-8 py-4 bg-transparent border border-neutral-400 dark:border-neutral-600 text-ink-900 dark:text-neutral-100 font-ui-label-lg text-ui-label-lg uppercase tracking-widest rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors flex items-center gap-2 disabled:opacity-60'
          }
        >
          <Icon name={inLibrary ? 'bookmark' : 'bookmark_add'} filled={inLibrary} size={20} />
          {inLibrary ? 'In Library' : 'Add to Library'}
        </button>
      </div>
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

function ChapterRow({ chapter, onUnlockClick, busy, isLast }) {
  const free = !chapter.isPaid || chapter.tokenPrice === 0;
  const locked = !free && !chapter.isUnlocked;
  const dateLabel = new Date(chapter.updatedAt || chapter.createdAt || Date.now())
    .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const Body = (
    <div className="flex items-center gap-6 min-w-0 flex-1">
      <span className="font-ui-label-sm text-ui-label-sm text-ink-500 dark:text-neutral-500 w-12 opacity-50 shrink-0">
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
        <Link href={`/read/${chapter.id}`} className="flex items-center gap-6 min-w-0 flex-1">
          {Body}
        </Link>
      )}

      <div className="flex items-center gap-4 shrink-0">
        {free && (
          <span className="px-2 py-1 bg-neutral-200 dark:bg-neutral-800 text-ink-700 dark:text-neutral-300 font-ui-label-sm uppercase rounded text-[10px]">
            Free
          </span>
        )}
        {chapter.isPaid && chapter.isUnlocked && (
          <span className="px-2 py-1 bg-tertiary-fixed/40 text-on-tertiary-container font-ui-label-sm uppercase rounded text-[10px] inline-flex items-center gap-1">
            <Icon name="check_circle" filled size={14} /> Unlocked
          </span>
        )}
        {locked && (
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
        {!free && chapter.isUnlocked && (
          <Link
            href={`/read/${chapter.id}`}
            className="px-4 py-2 border border-neutral-400 dark:border-neutral-600 text-ink-900 dark:text-neutral-100 font-ui-label-sm text-ui-label-sm uppercase tracking-widest rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-[10px]"
          >
            Read
          </Link>
        )}
      </div>
    </div>
  );
}
