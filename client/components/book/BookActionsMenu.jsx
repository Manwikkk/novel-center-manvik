'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Check, Flag } from 'lucide-react';
import { openAuthModal } from '@/lib/authModal';
import { api } from '@/lib/api';
import { libraryApi } from '@/lib/library';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import AddToCollectionModal from '@/components/book/AddToCollectionModal';
import ReportCommentModal from '@/components/comments/ReportCommentModal';
import { cn } from '@/lib/cn';

const NOVEL_REPORT_REASONS = [
  { value: 'plagiarism', label: 'Plagiarism or stolen work' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'spam', label: 'Spam or misleading listing' },
  { value: 'harassment', label: 'Harassment or hate' },
  { value: 'other', label: 'Other' },
];

const STATUS_ITEMS = [
  { key: 'archive', label: 'Add to Archive' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'dropped', label: 'Dropped' },
];

const STATUS_LABELS = {
  active: 'Library',
  archive: 'Archive',
  on_hold: 'On Hold',
  dropped: 'Dropped',
};

export default function BookActionsMenu({ book }) {
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const [open, setOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [readingStatus, setReadingStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!user || !book?.id) {
      setReadingStatus(null);
      return undefined;
    }
    let cancelled = false;
    libraryApi.statusMany([book.id])
      .then((r) => {
        if (!cancelled) setReadingStatus(r?.items?.[book.id] ?? null);
      })
      .catch(() => { if (!cancelled) setReadingStatus(null); });
    return () => { cancelled = true; };
  }, [user, book?.id]);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function requireAuth(action) {
    if (user) {
      action();
      return;
    }
    openAuthModal({
      message: 'Sign in to organize books in your library.',
      onSuccess: action,
    });
  }

  async function submitReport({ reason, details }) {
    try {
      await api.post(`/books/${book.id}/report`, { reason, details });
      pushToast({
        type: 'success',
        title: 'Report submitted',
        message: 'Thanks — our moderators will review this novel.',
      });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not report', message: err.message });
      throw err;
    }
  }

  async function setStatus(status) {
    if (busy || !book?.id) return;
    setBusy(true);
    setOpen(false);
    try {
      const res = await libraryApi.setStatus(book.id, status);
      setReadingStatus(res.readingStatus);
      pushToast({
        type: 'success',
        title: 'Updated',
        message: `"${book.title}" moved to ${STATUS_LABELS[status] || status}.`,
      });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div ref={rootRef} className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Book actions"
          disabled={busy}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 text-ink-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50"
        >
          <MoreVertical size={20} />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 min-w-[200px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg py-1"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                requireAuth(() => setCollectionOpen(true));
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-ink-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              Add to Collection
            </button>
            <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-800" />
            {STATUS_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => requireAuth(() => setStatus(item.key))}
                className={cn(
                  'w-full flex items-center justify-between gap-2 text-left px-4 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900',
                  readingStatus === item.key
                    ? 'text-ink-900 dark:text-neutral-100 font-medium'
                    : 'text-ink-700 dark:text-neutral-300',
                )}
              >
                {item.label}
                {readingStatus === item.key ? <Check size={16} className="shrink-0" /> : null}
              </button>
            ))}
            {user?.id !== book?.authorId ? (
              <>
                <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-800" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    if (user) {
                      setReportOpen(true);
                      return;
                    }
                    openAuthModal({
                      message: 'Sign in to report this novel.',
                      onSuccess: () => setReportOpen(true),
                    });
                  }}
                  className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-danger hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <Flag size={15} className="shrink-0" />
                  Report novel
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <ReportCommentModal
        open={reportOpen}
        title="Report novel"
        reasons={NOVEL_REPORT_REASONS}
        onClose={() => setReportOpen(false)}
        onSubmit={submitReport}
      />

      <AddToCollectionModal
        open={collectionOpen}
        book={book}
        onClose={() => setCollectionOpen(false)}
        onSaved={() => {
          pushToast({
            type: 'success',
            title: 'Collections updated',
            message: `"${book.title}" was added to your selected collections.`,
          });
        }}
      />
    </>
  );
}
