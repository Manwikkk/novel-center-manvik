'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/image';
import { useUiStore } from '@/stores/uiStore';

const FALLBACK_SHELVES = [
  { tag: 'weekly_featured', label: 'Weekly Book' },
  { tag: 'meet_novel_centre', label: 'Meet Novel Centre' },
  { tag: 'new_arrivals', label: 'Recommended' },
  { tag: 'potential_starlet', label: 'Ranking — Most Read' },
  { tag: 'rising_fictions', label: 'Ranking — Trending' },
  { tag: 'cheering_reads', label: 'Updated Today' },
  { tag: 'completed_novel', label: 'Completed Novels' },
  { tag: 'editors_choice', label: "Editors' Choice" },
  { tag: 'originals', label: 'GS Originals' },
];

function CheckboxRow({ checked, label, disabled, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-outline-variant accent-ink-900 dark:accent-neutral-100"
      />
      <span className="text-[13px] text-on-surface">{label}</span>
    </label>
  );
}

function WhereToAddMenu({ book, shelves, busy, onSetTags }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const tags = book.tags || [];
  const allOn = shelves.length > 0 && shelves.every((s) => tags.includes(s.tag));

  const placeMenu = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = 256;
    const gap = 8;
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    const below = rect.bottom + gap;
    const estimatedHeight = 380;
    const top = below + estimatedHeight > window.innerHeight - 12
      ? Math.max(12, rect.top - estimatedHeight - gap)
      : below;
    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    placeMenu();
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [open, placeMenu]);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (buttonRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Choose sections for ${book.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-black/5 hover:text-on-surface dark:hover:bg-white/10"
      >
        <MoreVertical size={18} />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: coords.top, left: coords.left }}
              className="fixed z-[80] w-64 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest py-1 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            >
              <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                Where to add
              </p>
              <CheckboxRow
                label="All sections"
                checked={allOn}
                disabled={busy}
                onChange={(on) => onSetTags(on ? shelves.map((s) => s.tag) : [])}
              />
              <div className="mx-3 border-t border-outline-variant/70" />
              {shelves.map((shelf) => (
                <CheckboxRow
                  key={shelf.tag}
                  label={shelf.label}
                  checked={tags.includes(shelf.tag)}
                  disabled={busy}
                  onChange={(on) => {
                    const next = on
                      ? [...new Set([...tags, shelf.tag])]
                      : tags.filter((t) => t !== shelf.tag);
                    onSetTags(next);
                  }}
                />
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default function HomeBookAssigner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [search, setSearch] = useState('');
  const [books, setBooks] = useState([]);
  const [shelves, setShelves] = useState(FALLBACK_SHELVES);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (q) => {
    setLoading(true);
    try {
      const d = await api.get('/admin/home-books', { query: { q: q || undefined } });
      setBooks(d.items || []);
      if (d.shelves?.length) {
        setShelves(d.shelves.map((s) => ({ tag: s.tag, label: s.label })));
      }
    } catch (err) {
      setBooks([]);
      pushToast({ type: 'error', title: 'Could not load books', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    const q = search.trim();
    const t = setTimeout(() => {
      load(q);
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [search, load]);

  const setTags = async (book, tags) => {
    const prev = book.tags || [];
    setBooks((list) => list.map((b) => (b.id === book.id ? { ...b, tags } : b)));
    setBusyId(book.id);
    try {
      const d = await api.patch(`/admin/books/${book.id}/home-tags`, { tags });
      if (d.book) {
        setBooks((list) => list.map((b) => (b.id === book.id ? { ...b, ...d.book } : b)));
      }
    } catch (err) {
      setBooks((list) => list.map((b) => (b.id === book.id ? { ...b, tags: prev } : b)));
      pushToast({ type: 'error', title: 'Could not update sections', message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 min-w-0">
      <div>
        <p className="label-sm uppercase text-on-surface-variant">Home books</p>
        <p className="mt-1 text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">
          Search a book, then use the three dots to choose All or only some sections.
        </p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search books…"
        className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[14px] text-on-surface outline-none focus:border-on-surface"
      />

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        {loading ? (
          <div className="divide-y divide-outline-variant">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-14 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-on-surface-variant">
            No published books found.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {books.map((book) => {
              const cover = resolveImageUrl(book.coverUrl);
              const tags = book.tags || [];
              return (
                <li key={book.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-black/5 dark:bg-white/10">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-[16px] text-on-surface">{book.title}</p>
                    <p className="truncate text-[12px] text-on-surface-variant">
                      {book.authorName || 'Author'}
                    </p>
                    <p className="mt-1 text-[11px] text-on-surface-variant">
                      {tags.length
                        ? `${tags.length} section${tags.length === 1 ? '' : 's'}`
                        : 'Not on home page'}
                    </p>
                  </div>
                  <WhereToAddMenu
                    book={book}
                    shelves={shelves}
                    busy={busyId === book.id}
                    onSetTags={(next) => setTags(book, next)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
