'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarClock, Pencil, Plus } from 'lucide-react';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import TextInput from '@/components/ui/TextInput';
import ChapterEditor from '@/components/author/ChapterEditor';
import AuthorThoughtModal from '@/components/author/AuthorThoughtModal';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useUiStore } from '@/stores/uiStore';
import { useChapterDraft } from '@/lib/useChapterDraft';
import { cn } from '@/lib/cn';
import { pricingFromContent } from '@/lib/chapterPricing';

const SERVER_DEBOUNCE_MS = 3000;
const DEFAULT_CHAPTER_TITLE = 'Untitled chapter';
const PUBLISH_MODES = [
  { id: 'draft', label: 'Draft' },
  { id: 'publishNow', label: 'Publish now' },
  { id: 'schedule', label: 'Schedule' },
];

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isCompleteDatetimeLocal(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}

function derivePublishMode(chapter) {
  if (!chapter) return 'draft';
  if (chapter.status === 'published') return 'publishNow';
  if (chapter.scheduledPublishAt) return 'schedule';
  return 'draft';
}

function normalizeChapterPayload(data) {
  if (!data) return null;
  const isPaid = !!data.isPaid;
  return {
    ...data,
    title: String(data.title ?? '').trim() || DEFAULT_CHAPTER_TITLE,
    isPaid,
    tokenPrice: isPaid ? Math.max(0, Number.parseInt(data.tokenPrice, 10) || 0) : 0,
  };
}

function buildSnapshotFromChapter(chapter, contentHtml, publishMode) {
  let status = chapter.status;
  let scheduledPublishAt = chapter.scheduledPublishAt || null;
  if (publishMode === 'draft') {
    status = 'draft';
    scheduledPublishAt = null;
  } else if (publishMode === 'publishNow') {
    status = 'published';
    scheduledPublishAt = null;
  } else if (publishMode === 'schedule') {
    status = 'draft';
    scheduledPublishAt = chapter.scheduledPublishAt || null;
  }
  return {
    title: chapter.title,
    contentHtml,
    idx: Number(chapter.idx),
    isPaid: !!chapter.isPaid,
    tokenPrice: chapter.isPaid ? Number(chapter.tokenPrice) || 0 : 0,
    status,
    scheduledPublishAt,
    authorThought: chapter.authorThought || '',
  };
}

function resolveScheduleAt(publishMode, chapter, scheduleLocal, scheduleLocalRef) {
  if (publishMode !== 'schedule') return null;
  if (chapter?.scheduledPublishAt) return chapter.scheduledPublishAt;
  const pending = scheduleLocalRef?.current || scheduleLocal;
  if (isCompleteDatetimeLocal(pending)) return fromDatetimeLocalValue(pending);
  return null;
}

function buildPersistPayload(snapshot, publishMode, scheduleAt = null) {
  const payload = normalizeChapterPayload({ ...snapshot });
  delete payload.tokenPrice;
  const at = publishMode === 'schedule' ? scheduleAt : null;
  if (at && new Date(at).getTime() > Date.now()) {
    payload.scheduledPublishAt = at;
  } else {
    payload.scheduledPublishAt = null;
  }
  return payload;
}

function serializePersistState(snapshot, publishMode, scheduleAt = null) {
  return JSON.stringify(buildPersistPayload(snapshot, publishMode, scheduleAt));
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
  const [publishMode, setPublishMode] = useState('draft');
  const [scheduleLocal, setScheduleLocal] = useState('');
  const [scheduleEditing, setScheduleEditing] = useState(false);

  const hydratedRef = useRef(false);
  const serverTimerRef = useRef(null);
  const persistRef = useRef(null);
  const lastSavedSnapshotRef = useRef(null);
  const schedulePickerFocusedRef = useRef(false);
  const scheduleEditingRef = useRef(false);
  const scheduleLocalRef = useRef('');
  const serverStatusRef = useRef(null);

  function syncScheduleFields(scheduledAt, { editing = false } = {}) {
    const local = toDatetimeLocalValue(scheduledAt);
    scheduleLocalRef.current = local;
    setScheduleLocal(local);
    scheduleEditingRef.current = editing;
    setScheduleEditing(editing);
  }

  function displayScheduleIso() {
    if (chapter?.scheduledPublishAt) return chapter.scheduledPublishAt;
    const pending = scheduleLocalRef.current || scheduleLocal;
    if (isCompleteDatetimeLocal(pending)) return fromDatetimeLocalValue(pending);
    return null;
  }

  const snapshot = useMemo(() => {
    if (!chapter) return null;
    return buildSnapshotFromChapter(chapter, content, publishMode);
  }, [chapter, content, publishMode]);

  const chapterPricing = useMemo(
    () => pricingFromContent(!!chapter?.isPaid, content),
    [chapter?.isPaid, content],
  );

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

        serverStatusRef.current = serverChapter.status;
        const serverContent = serverChapter.contentHtml || '';
        const serverPublished = serverChapter.status === 'published';

        // Published on server always wins — stale local drafts must not unpublish.
        if (serverPublished) {
          if (draft) clearDraft(chapterId);
          setChapter(serverChapter);
          setContent(serverContent);
          setPublishMode('publishNow');
          syncScheduleFields(null, { editing: false });
          setSaveState('idle');
          lastSavedSnapshotRef.current = serializePersistState(
            buildSnapshotFromChapter(serverChapter, serverContent, 'publishNow'),
            'publishNow',
            null,
          );
          hydratedRef.current = true;
          return;
        }

        const draftContent = draft?.contentHtml ?? '';
        const draftIsNewer = draft && Number(draft.savedAt || 0) > serverTime;
        const draftHasContentOnly = draft && !serverContent && draftContent;
        const useDraft = draftIsNewer || draftHasContentOnly;
        const draftScheduleAt = draft?.scheduledPublishAt ?? null;
        const mergedChapter = useDraft
          ? {
              ...serverChapter,
              title: draft.title ?? serverChapter.title,
              idx: draft.idx ?? serverChapter.idx,
              isPaid: draft.isPaid ?? serverChapter.isPaid,
              tokenPrice: draft.tokenPrice ?? serverChapter.tokenPrice,
              status: draftScheduleAt ? 'draft' : (draft.status ?? serverChapter.status),
              scheduledPublishAt: draftScheduleAt || serverChapter.scheduledPublishAt || null,
              authorThought: draft.authorThought ?? serverChapter.authorThought ?? '',
            }
          : serverChapter;

        const initialContent = useDraft ? draftContent : serverContent;

        if (useDraft) {
          setSaveState('dirty');
          pushToast({ type: 'success', title: 'Unsaved changes restored' });
        } else {
          if (draft) clearDraft(chapterId);
          setSaveState('idle');
        }

        setChapter(mergedChapter);
        setContent(initialContent);
        const mode = derivePublishMode(mergedChapter);
        setPublishMode(mode);
        syncScheduleFields(mergedChapter.scheduledPublishAt, {
          editing: mode === 'schedule' && !mergedChapter.scheduledPublishAt,
        });
        lastSavedSnapshotRef.current = serializePersistState(
          buildSnapshotFromChapter(mergedChapter, initialContent, mode),
          mode,
          mergedChapter.scheduledPublishAt,
        );

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

  function changePublishMode(mode) {
    setPublishMode(mode);
    if (mode === 'draft') {
      setChapter((c) => ({ ...c, status: 'draft', scheduledPublishAt: null }));
      syncScheduleFields(null, { editing: false });
    } else if (mode === 'publishNow') {
      setChapter((c) => ({ ...c, status: 'published', scheduledPublishAt: null }));
      syncScheduleFields(null, { editing: false });
    } else if (mode === 'schedule') {
      const existing = chapter?.scheduledPublishAt || null;
      setChapter((c) => ({ ...c, status: 'draft' }));
      syncScheduleFields(existing, { editing: !existing });
    }
  }

  function startReschedule() {
    syncScheduleFields(chapter?.scheduledPublishAt, { editing: true });
  }

  function commitScheduleLocal(localValue = scheduleLocalRef.current) {
    if (!isCompleteDatetimeLocal(localValue)) return;
    const iso = fromDatetimeLocalValue(localValue);
    setChapter((c) => ({ ...c, status: 'draft', scheduledPublishAt: iso }));
    scheduleEditingRef.current = false;
    setScheduleEditing(false);
  }

  function effectiveScheduledPublishAt() {
    if (publishMode !== 'schedule') return null;
    if (chapter?.scheduledPublishAt) return chapter.scheduledPublishAt;
    const pending = scheduleLocalRef.current || scheduleLocal;
    if (isCompleteDatetimeLocal(pending)) return fromDatetimeLocalValue(pending);
    return null;
  }

  const persist = useCallback(async ({ manual = false, statusOverride } = {}) => {
    if (!chapter || !snapshot) return false;
    const base = statusOverride ? { ...snapshot, status: statusOverride } : snapshot;
    const scheduleAt = resolveScheduleAt(publishMode, chapter, scheduleLocal, scheduleLocalRef);
    const payload = buildPersistPayload(base, publishMode, scheduleAt);
    if (manual && publishMode === 'schedule' && scheduleEditing && !scheduleAt) {
      pushToast({ type: 'error', title: 'Pick a publish date and time' });
      setSaveState('error');
      return false;
    }
    if (
      manual
      && scheduleEditing
      && payload.scheduledPublishAt
      && new Date(payload.scheduledPublishAt).getTime() <= Date.now()
    ) {
      pushToast({ type: 'error', title: 'Scheduled time must be in the future' });
      setSaveState('error');
      return false;
    }
    const sentSerialized = serializePersistState(base, publishMode, scheduleAt);
    if (!manual && sentSerialized === lastSavedSnapshotRef.current) {
      return true;
    }
    if (!manual && serverStatusRef.current === 'published' && payload.status !== 'published') {
      return false;
    }
    if (manual) setBusy(true);
    setSaveState('saving');
    try {
      if (!manual && payload.status === 'draft') {
        const fresh = await api.get(`/chapters/${chapter.id}`);
        if (fresh.chapter?.status === 'published') {
          serverStatusRef.current = 'published';
          const publishedContent = fresh.chapter.contentHtml || content;
          setChapter((c) => (
            c
              ? {
                  ...c,
                  status: 'published',
                  scheduledPublishAt: null,
                  isPaid: fresh.chapter.isPaid,
                  tokenPrice: fresh.chapter.tokenPrice,
                  updatedAt: fresh.chapter.updatedAt,
                }
              : c
          ));
          setPublishMode('publishNow');
          syncScheduleFields(null, { editing: false });
          clearDraft(chapter.id);
          lastSavedSnapshotRef.current = serializePersistState(
            buildSnapshotFromChapter(
              { ...chapter, status: 'published', scheduledPublishAt: null },
              publishedContent,
              'publishNow',
            ),
            'publishNow',
            null,
          );
          setSaveState('saved');
          setLastSavedAt(Date.now());
          return true;
        }
      }
      const r = await api.patch(`/chapters/${chapter.id}`, payload);
      setLastSavedAt(Date.now());
      setSaveState('saved');
      const savedScheduleAt = r.chapter.scheduledPublishAt
        || chapter.scheduledPublishAt
        || scheduleAt
        || null;
      const savedChapter = {
        ...r.chapter,
        scheduledPublishAt: savedScheduleAt,
      };
      const savedMode = (!schedulePickerFocusedRef.current && !scheduleEditingRef.current)
        ? derivePublishMode(savedChapter)
        : publishMode;
      const savedChapterState = {
        ...chapter,
        title: r.chapter.title,
        status: r.chapter.status,
        isPaid: r.chapter.isPaid,
        tokenPrice: r.chapter.tokenPrice,
        scheduledPublishAt: savedScheduleAt,
        updatedAt: r.chapter.updatedAt,
      };
      setChapter((c) => (c ? { ...c, ...savedChapterState } : c));
      if (!schedulePickerFocusedRef.current && !scheduleEditingRef.current) {
        setPublishMode(savedMode);
        syncScheduleFields(savedScheduleAt, { editing: false });
      }
      serverStatusRef.current = r.chapter.status;
      lastSavedSnapshotRef.current = serializePersistState(
        buildSnapshotFromChapter(savedChapterState, content, savedMode),
        savedMode,
        savedScheduleAt,
      );
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
  }, [chapter, snapshot, content, publishMode, scheduleLocal, clearDraft, pushToast]);

  const saveAndNewChapter = useCallback(async (targetStatus, { scheduledPublishAt = null } = {}) => {
    if (!chapter || !snapshot || creatingNext || busy) return;
    if (scheduledPublishAt && new Date(scheduledPublishAt).getTime() <= Date.now()) {
      pushToast({ type: 'error', title: 'Scheduled time must be in the future' });
      return;
    }
    if (serverTimerRef.current) {
      clearTimeout(serverTimerRef.current);
      serverTimerRef.current = null;
    }
    setCreatingNext(true);
    setSaveState('saving');
    try {
      const payload = normalizeChapterPayload({
        ...snapshot,
        status: scheduledPublishAt ? 'draft' : targetStatus,
        scheduledPublishAt: scheduledPublishAt || null,
      });
      await api.patch(`/chapters/${chapter.id}`, payload);
      clearDraft(chapter.id);
      const r = await api.post(`/books/${id}/chapters`, {
        title: DEFAULT_CHAPTER_TITLE,
        contentHtml: '<p></p>',
        isPaid: false,
        tokenPrice: 0,
        status: 'draft',
      });
      let toastTitle = 'Chapter saved as draft';
      if (scheduledPublishAt) toastTitle = 'Chapter scheduled';
      else if (targetStatus === 'published') toastTitle = 'Chapter published';
      pushToast({
        type: 'success',
        title: toastTitle,
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
    if (schedulePickerFocusedRef.current) return undefined;

    const scheduleAt = resolveScheduleAt(publishMode, chapter, scheduleLocal, scheduleLocalRef);
    const serialized = serializePersistState(snapshot, publishMode, scheduleAt);
    if (serialized === lastSavedSnapshotRef.current) {
      setSaveState((prev) => (prev === 'dirty' || prev === 'saving' || prev === 'error' ? 'saved' : prev));
      return undefined;
    }

    setSaveState((prev) => (prev === 'saving' ? prev : 'dirty'));
    saveDraftDebounced(chapter.id, snapshot);

    if (serverTimerRef.current) clearTimeout(serverTimerRef.current);
    serverTimerRef.current = setTimeout(() => {
      serverTimerRef.current = null;
      if (schedulePickerFocusedRef.current) return;
      persistRef.current?.();
    }, SERVER_DEBOUNCE_MS);

    return () => {
      if (serverTimerRef.current) {
        clearTimeout(serverTimerRef.current);
        serverTimerRef.current = null;
      }
    };
  }, [chapter, snapshot, publishMode, scheduleLocal, saveDraftDebounced]);

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
    if (serverTimerRef.current) {
      clearTimeout(serverTimerRef.current);
      serverTimerRef.current = null;
    }
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
              href={`/author/books/${id}/chapters`}
              className="shrink-0 whitespace-nowrap text-[12px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Back to chapters
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
              <p className="label-sm uppercase text-on-surface-variant">Publish mode</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {PUBLISH_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => changePublishMode(mode.id)}
                    className={cn(
                      'w-full px-3 py-2 rounded-md border text-left text-[12px] tracking-labelTight uppercase transition-colors',
                      publishMode === mode.id
                        ? 'border-studio-accent bg-studio-accent/10 text-on-surface'
                        : 'border-surface-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              {publishMode === 'schedule' && (
                <div className="mt-3 space-y-2">
                  {displayScheduleIso() && !scheduleEditing ? (
                    <div className="rounded-md border border-amber-600/30 bg-amber-500/10 px-3 py-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <CalendarClock size={16} className="shrink-0 mt-0.5 text-amber-700 dark:text-amber-300" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800/80 dark:text-amber-300/80">
                            Scheduled publish
                          </p>
                          <p className="text-[14px] font-semibold text-amber-900 dark:text-amber-100 mt-0.5">
                            {formatDateTime(displayScheduleIso())}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={startReschedule}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 hover:underline"
                      >
                        <Pencil size={12} />
                        Reschedule
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="block">
                        <span className="sr-only">Publish date and time</span>
                        <input
                          key={`schedule-edit-${chapterId}-${scheduleLocal || 'new'}`}
                          type="datetime-local"
                          defaultValue={scheduleLocal}
                          onChange={(e) => { scheduleLocalRef.current = e.target.value; }}
                          onFocus={() => { schedulePickerFocusedRef.current = true; }}
                          onBlur={(e) => {
                            schedulePickerFocusedRef.current = false;
                            const localValue = e.target.value;
                            scheduleLocalRef.current = localValue;
                            setScheduleLocal(localValue);
                            commitScheduleLocal(localValue);
                          }}
                          className="w-full rounded-md border border-surface-variant bg-transparent px-3 py-2 text-[14px] text-on-surface focus:border-on-surface focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </label>
                      {displayScheduleIso() && (
                        <button
                          type="button"
                          onClick={() => {
                            syncScheduleFields(chapter.scheduledPublishAt, { editing: false });
                          }}
                          className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant hover:text-on-surface"
                        >
                          Cancel
                        </button>
                      )}
                    </>
                  )}
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Publishes automatically at this time. Hidden from readers until then.
                  </p>
                </div>
              )}
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
              <div className="space-y-2">
                <p className="label-sm uppercase text-on-surface-variant">Chapter price</p>
                <p className="text-[14px] text-on-surface font-semibold">
                  {chapterPricing.tokenPrice} coins
                  <span className="font-normal text-on-surface-variant">
                    {' '}(based on {chapterPricing.wordCount.toLocaleString()} words)
                  </span>
                </p>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Price is calculated automatically from word count when you save.
                </p>
                {chapterPricing.pricingNote && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed border border-amber-600/30 rounded-md px-3 py-2">
                    {chapterPricing.pricingNote}
                  </p>
                )}
              </div>
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
              <button
                type="button"
                onClick={() => {
                  const at = effectiveScheduledPublishAt();
                  if (!at) {
                    pushToast({ type: 'error', title: 'Pick a publish date and time' });
                    return;
                  }
                  saveAndNewChapter('draft', { scheduledPublishAt: at });
                }}
                disabled={busy || creatingNext || saveState === 'saving' || publishMode !== 'schedule'}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-600/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider hover:bg-amber-500/10 transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                {creatingNext ? 'Working…' : 'Schedule & new chapter'}
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
