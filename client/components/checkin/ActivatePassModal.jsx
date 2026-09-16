'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { RewardIcon } from '@/components/checkin/RewardOptionCard';
import { api } from '@/lib/api';
import { libraryApi } from '@/lib/library';
import { checkinApi } from '@/lib/checkinApi';
import { resolveImageUrl } from '@/lib/image';
import { cn } from '@/lib/cn';

function NovelRow({ book, selected, onSelect }) {
  const cover = resolveImageUrl(book.coverUrl);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(book)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors',
        selected
          ? 'border-ink-900 bg-ink-900/5 dark:border-white dark:bg-white/10'
          : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900',
      )}
    >
      <span className="h-14 w-10 shrink-0 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink-900 dark:text-neutral-100">{book.title}</span>
        <span className="block truncate text-[12px] text-ink-500 dark:text-neutral-500">
          {book.authorName || book.author?.displayName || book.category || 'Novel'}
          {book.chapterCount ? ` · ${book.chapterCount} chapters` : ''}
        </span>
      </span>
      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', selected ? 'border-ink-900 bg-ink-900 text-white dark:border-white dark:bg-white dark:text-black' : 'border-neutral-300 dark:border-neutral-600')}>
        {selected ? <Icon name="check" size={14} weight={700} /> : null}
      </span>
    </button>
  );
}

/**
 * Activate a stored pass. Novel Passes need the novel they will cover; the
 * platform-wide pass just needs confirmation because the timer starts now.
 */
export default function ActivatePassModal({ reward, open, onClose, onActivated }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [library, setLibrary] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);

  const needsNovel = reward?.type === 'NOVEL_PASS';

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setResults([]);
    setSelected(null);
    setError('');
    setBusy(false);
    if (needsNovel) {
      libraryApi.list({ pageSize: 12 })
        .then((d) => setLibrary((d.items || []).map((e) => e.book).filter((b) => b && b.status === 'published')))
        .catch(() => setLibrary([]));
    }
    return undefined;
  }, [open, needsNovel]);

  useEffect(() => {
    if (!open || !needsNovel) return undefined;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const d = await api.get('/books', { query: { q, status: 'published', pageSize: 8 } });
        setResults(d.items || []);
      } catch (_e) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 260);
    return () => clearTimeout(timer.current);
  }, [query, open, needsNovel]);

  if (!reward) return null;

  async function activate() {
    if (needsNovel && !selected) return;
    setBusy(true);
    setError('');
    try {
      const res = await checkinApi.activateReward(reward.id, needsNovel ? selected.id : undefined);
      onActivated?.(res);
    } catch (err) {
      setError(err.message || 'Could not activate the pass');
    } finally {
      setBusy(false);
    }
  }

  const list = query.trim().length >= 2 ? results : library;

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      size="md"
      title={`Activate ${reward.title}`}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" size="md" onClick={activate} disabled={busy || (needsNovel && !selected)}>
            {busy ? 'Activating…' : `Start ${reward.hours}-hour pass`}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
        <RewardIcon type={reward.type} className="h-11 w-11" />
        <div className="text-[13px] leading-relaxed text-ink-600 dark:text-neutral-400">
          <p className="font-semibold text-ink-900 dark:text-neutral-100">
            {needsNovel ? 'Free reading in one novel' : 'Free reading across Novel Centre'} for {reward.hours} hours
          </p>
          <p>The timer starts the moment you activate and cannot be paused. Chapters you already bought stay yours; passes never refund coins.</p>
        </div>
      </div>

      {needsNovel ? (
        <div className="mt-5">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-neutral-500">Choose the novel</span>
            <span className="relative mt-2 block">
              <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search published novels…"
                className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-[14px] text-ink-900 outline-none focus:border-ink-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-300"
              />
            </span>
          </label>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-ink-400 dark:text-neutral-500">
            {query.trim().length >= 2 ? (searching ? 'Searching…' : `${list.length} result${list.length === 1 ? '' : 's'}`) : 'From your library'}
          </p>
          <div role="radiogroup" className="mt-2 max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {list.map((b) => (
              <NovelRow key={b.id} book={b} selected={selected?.id === b.id} onSelect={setSelected} />
            ))}
            {!list.length && !searching ? (
              <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-[13px] text-ink-500 dark:border-neutral-700 dark:text-neutral-500">
                {query.trim().length >= 2 ? 'No novels match that search.' : 'Your library is empty — search for a novel above.'}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-[13px] text-danger">{error}</p> : null}
    </Modal>
  );
}
