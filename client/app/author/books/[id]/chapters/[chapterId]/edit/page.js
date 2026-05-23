'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import TextInput from '@/components/ui/TextInput';
import ChapterEditor from '@/components/author/ChapterEditor';
import AuthorThoughtModal from '@/components/author/AuthorThoughtModal';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { useChapterDraft } from '@/lib/useChapterDraft';

const SERVER_DEBOUNCE_MS = 3000;

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

  if (state === 'idle') return null;
  if (state === 'dirty') {
    return <span className="text-[12px] tracking-labelTight uppercase text-on-surface-variant">Unsaved changes</span>;
  }
  if (state === 'saving') {
    return <span className="text-[12px] tracking-labelTight uppercase text-on-surface-variant">Saving…</span>;
  }
  if (state === 'error') {
    return <span className="text-[12px] tracking-labelTight uppercase text-error">Save failed · retrying</span>;
  }
  return (
    <span className="text-[12px] tracking-labelTight uppercase text-on-surface-variant">
      Saved {relativeFromNow(lastSavedAt)}
    </span>
  );
}

function ChapterEditInner() {
  const { id, chapterId } = useParams();
  const pushToast = useUiStore((s) => s.pushToast);
  const { loadDraft, saveDraftDebounced, flushDraft, clearDraft } = useChapterDraft();

  const [chapter, setChapter] = useState(null);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
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
        lastSavedSnapshotRef.current = JSON.stringify(serverSnapshot);

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

  const persist = useCallback(async ({ manual = false } = {}) => {
    if (!chapter || !snapshot) return;
    const sentSerialized = JSON.stringify(snapshot);
    if (!manual && sentSerialized === lastSavedSnapshotRef.current) {
      return;
    }
    if (manual) setBusy(true);
    setSaveState('saving');
    try {
      const r = await api.patch(`/chapters/${chapter.id}`, snapshot);
      lastSavedSnapshotRef.current = sentSerialized;
      setLastSavedAt(Date.now());
      setSaveState('saved');
      setChapter((c) => (c ? { ...c, updatedAt: r.chapter.updatedAt } : c));
      clearDraft(chapter.id);
      if (manual) pushToast({ type: 'success', title: 'Chapter saved' });
    } catch (err) {
      setSaveState('error');
      if (manual) pushToast({ type: 'error', title: 'Save failed', message: err.message });
    } finally {
      if (manual) setBusy(false);
    }
  }, [chapter, snapshot, clearDraft, pushToast]);

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    if (!hydratedRef.current || !chapter || !snapshot) return undefined;

    const serialized = JSON.stringify(snapshot);
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
        title={chapter.title || 'Untitled chapter'}
        actions={
          <>
            <SaveStatus state={saveState} lastSavedAt={lastSavedAt} />
            <Link
              href={`/author/books/${id}/edit`}
              className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Back to book
            </Link>
            <button
              type="button"
              onClick={() => persist({ manual: true })}
              disabled={busy || saveState === 'saving'}
              className="px-4 py-2 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-[12px] font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
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
