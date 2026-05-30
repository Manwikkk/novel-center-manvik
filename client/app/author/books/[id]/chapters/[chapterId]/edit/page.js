'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import TextInput from '@/components/ui/TextInput';
import ChapterEditor from '@/components/author/ChapterEditor';
import AuthorThoughtModal from '@/components/author/AuthorThoughtModal';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { useChapterDraft } from '@/lib/useChapterDraft';
import { cn } from '@/lib/cn';

const SERVER_DEBOUNCE_MS = 3000;
const DEFAULT_CHAPTER_TITLE = 'Untitled chapter';

function normalizeChapterPayload(data) {
  if (!data) return null;
  return {
    ...data,
    title: String(data.title ?? '').trim() || DEFAULT_CHAPTER_TITLE,
  };
}

function relativeFromNow(ts) {
  if (!ts) return '';
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function SaveStatus({ state, lastSavedAt }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (state !== 'saved') return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, [state]);

  let message = '';
  if (state === 'dirty') message = 'Unsaved changes';
  else if (state === 'saving') message = 'Saving…';
  else if (state === 'error') message = 'Save failed';
  else if (state === 'saved') message = `Saved ${relativeFromNow(lastSavedAt)}`;

  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'hidden md:inline-flex items-center justify-end shrink-0 whitespace-nowrap',
        'min-w-[9.5rem] text-[12px] font-semibold uppercase tracking-wider tabular-nums',
        state === 'dirty' && 'text-amber-700 dark:text-amber-400',
        state === 'saving' && 'text-on-surface-variant',
        state === 'error' && 'text-error',
        state === 'saved' && 'text-emerald-700 dark:text-emerald-400',
        state === 'idle' && 'text-transparent select-none',
      )}
    >
      {message || '\u00a0'}
    </span>
  );
}

function ChapterEditInner() {
  const { id, chapterId } = useParams();
  const router = useRouter();
  const pushToast = useUiStore((s) => s.pushToast);
  const { loadDraft, saveDraftDebounced, flushDraft, clearDraft } = useChapterDraft();

  const [chapter, setChapter] = useState(null);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [creatingNext, setCreatingNext] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [thoughtModalOpen, setThoughtModalOpen] = useState(false);

  const hydratedRef = useRef(false);
  const serverTimerRef = useRef(null);
  const persistRef = useRef(null);
  const lastSavedSnapshotRef = useRef(null);

  const snapshot = useMemo(() => {
    if (!chapter) return null;
    return {
      title: chapter.title,
      contentHtml: content,
      idx: Number(chapter.idx),
      isPaid: !!chapter.isPaid,
      tokenPrice: chapter.isPaid ? Number(chapter.tokenPrice) || 0 : 0,
      status: chapter.status,
      authorThought: chapter.authorThought || '',
    };
  }, [chapter, content]);

  useEffect(() => {
    let cancel = false;
    hydratedRef.current = false;
    lastSavedSnapshotRef.current = null;
    api.get(`/chapters/${chapterId}`)
      .then((data) => {
        if (cancel) return;
        const serverChapter = data.chapter;
        const serverTime = serverChapter.updatedAt
          ? new Date(serverChapter.updatedAt).getTime()
          : 0;
        const draft = loadDraft(chapterId);

        const serverSnapshot = {
          title: serverChapter.title,
          contentHtml: serverChapter.contentHtml || '',
          idx: Number(serverChapter.idx),
          isPaid: !!serverChapter.isPaid,
          tokenPrice: serverChapter.isPaid ? Number(serverChapter.tokenPrice) || 0 : 0,
          status: serverChapter.status,
          authorThought: serverChapter.authorThought || '',
        };
        lastSavedSnapshotRef.current = JSON.stringify(normalizeChapterPayload(serverSnapshot));

        if (draft && Number(draft.savedAt || 0) > serverTime) {
          setChapter({
            ...serverChapter,
            title: draft.title ?? serverChapter.title,
            idx: draft.idx ?? serverChapter.idx,
            isPaid: draft.isPaid ?? serverChapter.isPaid,
            tokenPrice: draft.tokenPrice ?? serverChapter.tokenPrice,
            status: draft.status ?? serverChapter.status,
            authorThought: draft.authorThought ?? serverChapter.authorThought ?? '',
          });
          setContent(draft.contentHtml ?? serverChapter.contentHtml ?? '');
          setSaveState('dirty');
          pushToast({ type: 'success', title: 'Unsaved changes restored' });
        } else {
          if (draft) clearDraft(chapterId);
          setChapter(serverChapter);
          setContent(serverChapter.contentHtml || '');
          setSaveState('idle');
        }

        hydratedRef.current = true;
      })
      .catch((err) => {
        if (!cancel) pushToast({ type: 'error', title: 'Could not load chapter', message: err.message });
      });
    return () => { cancel = true; };
  }, [chapterId, loadDraft, clearDraft, pushToast]);

  function update(field, value) {
    setChapter((c) => ({ ...c, [field]: value }));
  }

  const persist = useCallback(async ({ manual = false, statusOverride } = {}) => {
    if (!chapter || !snapshot) return false;
    const payload = normalizeChapterPayload(
      statusOverride ? { ...snapshot, status: statusOverride } : snapshot,
    );
    const sentSerialized = JSON.stringify(payload);
    if (!manual && sentSerialized === lastSavedSnapshotRef.current) {
      return true;
    }
    if (manual) setBusy(true);
    setSaveState('saving');
    try {
      const r = await api.patch(`/chapters/${chapter.id}`, payload);
      lastSavedSnapshotRef.current = sentSerialized;
      setLastSavedAt(Date.now());
      setSaveState('saved');
      setChapter((c) => (
        c
          ? {
              ...c,
              title: r.chapter.title,
              status: r.chapter.status,
              updatedAt: r.chapter.updatedAt,
            }
          : c
      ));
      clearDraft(chapter.id);
      if (manual) pushToast({ type: 'success', title: 'Chapter saved' });
      return true;
    } catch (err) {
      setSaveState('error');
      if (manual) pushToast({ type: 'error', title: 'Save failed', message: err.message });
      return false;
    } finally {
      if (manual) setBusy(false);
    }
  }, [chapter, snapshot, clearDraft, pushToast]);

  const saveAndNewChapter = useCallback(async (targetStatus) => {
    if (!chapter || !snapshot || creatingNext || busy) return;
    if (serverTimerRef.current) {
      clearTimeout(serverTimerRef.current);
      serverTimerRef.current = null;
    }
    setCreatingNext(true);
    setSaveState('saving');
    try {
      const payload = normalizeChapterPayload({ ...snapshot, status: targetStatus });
      await api.patch(`/chapters/${chapter.id}`, payload);
      clearDraft(chapter.id);
      const r = await api.post(`/books/${id}/chapters`, {
        title: DEFAULT_CHAPTER_TITLE,
        contentHtml: '<p></p>',
        isPaid: false,
        tokenPrice: 0,
        status: 'draft',
      });
      pushToast({
        type: 'success',
        title: targetStatus === 'published' ? 'Chapter published' : 'Chapter saved as draft',
        message: 'Opening a new chapter.',
      });
      router.push(`/author/books/${id}/chapters/${r.chapter.id}/edit`);
    } catch (err) {
      setSaveState('error');
      pushToast({ type: 'error', title: 'Could not continue', message: err.message });
    } finally {
      setCreatingNext(false);
    }
  }, [chapter, snapshot, creatingNext, busy, id, router, clearDraft, pushToast]);

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    if (!hydratedRef.current || !chapter || !snapshot) return undefined;

    const serialized = JSON.stringify(normalizeChapterPayload(snapshot));
    if (serialized === lastSavedSnapshotRef.current) {
      setSaveState((prev) => (prev === 'dirty' || prev === 'saving' ? 'saved' : prev));
      return undefined;
    }

    setSaveState((prev) => (prev === 'saving' ? prev : 'dirty'));
    saveDraftDebounced(chapter.id, snapshot);

    if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
    serverTimerRef.current = setTimeout(() => {
      serverTimerRef.current = null;
      persistRef.current?.();
    }, SERVER_DEBOUNCE_MS);

    return () => {
      if (serverTimerRef.current) {
        clearTimeout(serverTimerRef.current);
        serverTimerRef.current = null;
      }
    };
  }, [chapter, snapshot, saveDraftDebounced]);

  useEffect(() => {
    function onBeforeUnload(e) {
      if (saveState === 'dirty' || saveState === 'saving') {
        flushDraft();
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveState, flushDraft]);

  useEffect(() => () => {
    if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
    flushDraft();
  }, [flushDraft]);

  if (!chapter) {
    return (
      <DashboardShell kind="author">
        <DashboardTopbar subtitle="Author studio" title="Loading chapter…" />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell kind="author">
      <DashboardTopbar
        subtitle={`Editing chapter ${chapter.idx}`}
        title={chapter.title || DEFAULT_CHAPTER_TITLE}
        actions={
          <>
            <SaveStatus state={saveState} lastSavedAt={lastSavedAt} />
            <Link
              href={`/author/books/${id}/edit`}
              className="shrink-0 whitespace-nowrap text-[12px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Back to book
            </Link>
            <button
              type="button"
              onClick={() => persist({ manual: true })}
              disabled={busy || creatingNext || saveState === 'saving'}
              className="shrink-0 whitespace-nowrap px-4 py-2 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-[12px] font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
            >
              {busy || saveState === 'saving' ? 'Saving…' : 'Save chapter'}
            </button>
          </>
        }
      />
      <div className="px-4 md:px-edge py-8 grid lg:grid-cols-[1fr_320px] gap-10">
          <div className="space-y-6 min-w-0">
            <TextInput
              label="Chapter title"
              variant="dashboard"
              value={chapter.title}
              onChange={(e) => update('title', e.target.value)}
              hint={
                !(chapter.title || '').trim()
                  ? `If left empty, this chapter saves as "${DEFAULT_CHAPTER_TITLE}".`
                  : undefined
              }
            />
            <ChapterEditor value={content} onChange={setContent} />
            <div className="pt-2 border-t border-surface-variant">
              {chapter.authorThought ? (
                <p className="mb-3 text-[14px] leading-relaxed text-on-surface-variant line-clamp-3 italic">
                  &ldquo;{chapter.authorThought}&rdquo;
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setThoughtModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded border border-studio-accent text-studio-accent text-[12px] font-bold uppercase tracking-wider hover:bg-studio-accent/10 transition-colors"
              >
                <span className="text-[16px] leading-none" aria-hidden>+</span>
                {chapter.authorThought ? "Edit author's thought" : "Add author's thought"}
              </button>
            </div>
          </div>
          <aside className="space-y-6 rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
            <div>
              <p className="label-sm uppercase text-on-surface-variant">Order</p>
              <input
                type="number"
                min={1}
                value={chapter.idx}
                onChange={(e) => update('idx', Number(e.target.value))}
                className="mt-2 w-full bg-transparent border-b border-surface-variant focus:border-on-surface focus:outline-none py-2 text-[18px] text-on-surface no-spin"
              />
            </div>
            <div>
              <p className="label-sm uppercase text-on-surface-variant">Status</p>
              <div className="mt-2 inline-flex rounded-md border border-surface-variant overflow-hidden">
                {['draft','published'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update('status', s)}
                    className={
                      'px-3 py-1.5 text-[12px] tracking-labelTight uppercase ' +
                      (chapter.status === s
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface')
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label-sm uppercase text-on-surface-variant">Access</p>
              <div className="mt-2 inline-flex rounded-md border border-surface-variant overflow-hidden">
                <button
                  type="button"
                  onClick={() => update('isPaid', false)}
                  className={
                    'px-3 py-1.5 text-[12px] tracking-labelTight uppercase ' +
                    (!chapter.isPaid
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface')
                  }
                >
                  Free
                </button>
                <button
                  type="button"
                  onClick={() => update('isPaid', true)}
                  className={
                    'px-3 py-1.5 text-[12px] tracking-labelTight uppercase ' +
                    (chapter.isPaid
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface')
                  }
                >
                  Paid
                </button>
              </div>
            </div>
            {chapter.isPaid && (
              <TextInput
                label="Token price"
                variant="dashboard"
                type="number"
                value={chapter.tokenPrice}
                onChange={(e) => update('tokenPrice', e.target.value)}
                hint="Tokens deducted on first unlock."
                inputClassName="no-spin"
              />
            )}

            <div className="pt-4 border-t border-surface-variant space-y-2">
              <p className="label-sm uppercase text-on-surface-variant">Next chapter</p>
              <p className="text-[12px] text-on-surface-variant leading-relaxed">
                Save this chapter, then start writing the next one.
              </p>
              <button
                type="button"
                onClick={() => saveAndNewChapter('draft')}
                disabled={busy || creatingNext || saveState === 'saving'}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-surface-variant text-on-surface text-[11px] font-bold uppercase tracking-wider hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                {creatingNext ? 'Working…' : 'Save draft & new chapter'}
              </button>
              <button
                type="button"
                onClick={() => saveAndNewChapter('published')}
                disabled={busy || creatingNext || saveState === 'saving'}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                {creatingNext ? 'Working…' : 'Publish & new chapter'}
              </button>
            </div>
          </aside>
        </div>

      <AuthorThoughtModal
        open={thoughtModalOpen}
        onClose={() => setThoughtModalOpen(false)}
        initialValue={chapter.authorThought || ''}
        onSubmit={(value) => update('authorThought', value)}
      />
    </DashboardShell>
  );
}

export default function ChapterEditPage() {
  return <AuthGuard roles={['author','admin']}><ChapterEditInner /></AuthGuard>;
}
