'use client';

import { useCallback, useEffect, useRef } from 'react';

const KEY_PREFIX = 'nc.draft.chapter.';
const DEBOUNCE_MS = 500;

function keyFor(chapterId) {
  return `${KEY_PREFIX}${chapterId}`;
}

export function useChapterDraft() {
  const timerRef = useRef(null);
  const pendingRef = useRef(null);

  const loadDraft = useCallback((chapterId) => {
    if (typeof window === 'undefined' || !chapterId) return null;
    try {
      const raw = window.localStorage.getItem(keyFor(chapterId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (_e) {
      return null;
    }
  }, []);

  const writeNow = useCallback((chapterId, snapshot) => {
    if (typeof window === 'undefined' || !chapterId) return;
    try {
      const payload = { ...snapshot, savedAt: Date.now() };
      window.localStorage.setItem(keyFor(chapterId), JSON.stringify(payload));
    } catch (_e) {
      // localStorage may be full or disabled - silently ignore.
    }
  }, []);

  const saveDraftDebounced = useCallback((chapterId, snapshot) => {
    if (!chapterId) return;
    pendingRef.current = { chapterId, snapshot };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const p = pendingRef.current;
      timerRef.current = null;
      pendingRef.current = null;
      if (p) writeNow(p.chapterId, p.snapshot);
    }, DEBOUNCE_MS);
  }, [writeNow]);

  const flushDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const p = pendingRef.current;
    pendingRef.current = null;
    if (p) writeNow(p.chapterId, p.snapshot);
  }, [writeNow]);

  const clearDraft = useCallback((chapterId) => {
    if (typeof window === 'undefined' || !chapterId) return;
    if (timerRef.current && pendingRef.current?.chapterId === chapterId) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      pendingRef.current = null;
    }
    try {
      window.localStorage.removeItem(keyFor(chapterId));
    } catch (_e) { /* ignore */ }
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { loadDraft, saveDraftDebounced, flushDraft, clearDraft };
}
