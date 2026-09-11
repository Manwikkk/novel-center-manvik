'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

const SECTION_ROWS = [
  { key: 'weekly_book',      label: 'Weekly Book',      hint: 'Hero — left column'   },
  { key: 'meet_webnovel',    label: 'Meet Novel Centre', hint: 'Hero — right column'  },
  { key: 'recommended',      label: 'Recommended',      hint: 'Home feed'            },
  { key: 'continue_reading', label: 'Continue Reading', hint: 'Logged-in users'      },
  { key: 'new_arrivals',     label: 'New Arrivals',     hint: 'Home feed'            },
  { key: 'ranking_novels',   label: 'Ranking Novels',   hint: 'Home feed'            },
  { key: 'updated_today',    label: 'Updated Today',    hint: 'Home feed'            },
  { key: 'completed_novels', label: 'Completed Novels', hint: 'Lower row — left'     },
  { key: 'editors_choice',   label: "Editors' Choice",  hint: 'Lower row — right'    },
  { key: 'gs_originals',     label: 'GS Originals',     hint: 'Home feed'            },
];

function SectionSwitch({ on, disabled, onToggle, id }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        // Track: 52px wide, 30px tall — gives enough room for the knob
        'relative inline-flex h-[30px] w-[52px] shrink-0 cursor-pointer items-center',
        'rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100 dark:focus-visible:ring-offset-neutral-900',
        on ? 'bg-ink-900 dark:bg-neutral-200' : 'bg-ink-300 dark:bg-neutral-600',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        aria-hidden
        className={cn(
          // Knob: 22px, sits inside the 30px track (border-2 eats 4px → inner height 26px)
          // Off: translateX(0), On: translateX(22px) = 52 - 4(borders) - 22(knob) - 4(gap) = 22
          'pointer-events-none h-[22px] w-[22px] rounded-full bg-white',
          'shadow-[0_1px_4px_rgba(0,0,0,0.3)] ring-0',
          'transition-transform duration-200 ease-in-out',
          on ? 'translate-x-[22px]' : 'translate-x-0',
        )}
      />
    </button>
  );
}

function bookLabel(book) {
  return book.authorName ? `${book.title} · ${book.authorName}` : book.title;
}

function Inner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [sections,   setSections]  = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [savingKey,  setSavingKey] = useState(null);
  const [shelves, setShelves] = useState([]);
  const [shelvesLoading, setShelvesLoading] = useState(true);
  const [busyTag, setBusyTag] = useState(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/admin/page-sections')
      .then((d) => { if (!cancelled) setSections(d.pageSections || {}); })
      .catch((err) => {
        if (cancelled) return;
        setSections({});
        pushToast({ type: 'error', title: 'Could not load layout', message: err.message });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pushToast]);

  const loadShelves = useCallback(async () => {
    setShelvesLoading(true);
    try {
      const d = await api.get('/admin/home-shelves');
      setShelves(d.shelves || []);
    } catch (err) {
      setShelves([]);
      pushToast({ type: 'error', title: 'Could not load home books', message: err.message });
    } finally {
      setShelvesLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadShelves();
  }, [loadShelves]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await api.get('/admin/books', {
          query: { q, status: 'published', pageSize: 8 },
        });
        if (!cancelled) setResults(d.items || []);
      } catch (_err) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  const toggle = useCallback(
    async (key, next) => {
      if (!sections) return;
      setSavingKey(key);
      const prev = sections[key];
      setSections((s) => ({ ...s, [key]: next }));
      try {
        const d = await api.patch('/admin/page-sections', { [key]: next });
        setSections(d.pageSections || {});
      } catch (err) {
        setSections((s) => ({ ...s, [key]: prev }));
        pushToast({ type: 'error', title: 'Could not update section', message: err.message });
      } finally {
        setSavingKey(null);
      }
    },
    [sections, pushToast],
  );

  const applyShelves = (d) => setShelves(d.shelves || []);

  const addToShelf = async (tag, bookId) => {
    setBusyTag(tag);
    try {
      applyShelves(await api.post(`/admin/home-shelves/${tag}/books`, { bookId }));
      pushToast({ type: 'success', title: 'Book added to section' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not add book', message: err.message });
    } finally {
      setBusyTag(null);
    }
  };

  const addToAll = async (bookId) => {
    setBusyTag('*');
    try {
      applyShelves(await api.post('/admin/home-shelves/all', { bookId }));
      pushToast({ type: 'success', title: 'Book added to every home section' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not add book', message: err.message });
    } finally {
      setBusyTag(null);
    }
  };

  const removeFromShelf = async (tag, bookId) => {
    setBusyTag(`${tag}:${bookId}`);
    try {
      applyShelves(await api.delete(`/admin/home-shelves/${tag}/books/${bookId}`));
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not remove book', message: err.message });
    } finally {
      setBusyTag(null);
    }
  };

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar
        subtitle="Administration"
        title="Page configuration"
        actions={(
          <p className="text-[12px] text-on-surface-variant max-w-xs md:max-w-md text-right normal-case tracking-normal font-sans font-normal">
            Turn sections on or off, then pick which published books appear in each rail.
          </p>
        )}
      />

      <div className="px-4 md:px-edge py-8 space-y-10 max-w-3xl">
        <p className="label-sm uppercase text-on-surface-variant">
          Home page sections
        </p>

        <div className="border border-outline-variant rounded-md divide-y divide-outline-variant overflow-hidden">
          {loading || !sections
            ? SECTION_ROWS.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-4 px-4 py-4 bg-surface-container-lowest"
                >
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-7 w-12 rounded-full shrink-0" />
                </div>
              ))
            : SECTION_ROWS.map((row) => {
                const on = sections[row.key] !== false;
                return (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-4 px-4 py-4 bg-surface-container-lowest hover:bg-surface-container-low/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <label
                        htmlFor={`sec-${row.key}`}
                        className="font-serif text-[16px] text-on-surface cursor-pointer"
                      >
                        {row.label}
                      </label>
                      <p className="mt-0.5 text-[12px] text-on-surface-variant normal-case tracking-normal font-sans font-normal">
                        {row.hint}
                      </p>
                    </div>
                    <SectionSwitch
                      id={`sec-${row.key}`}
                      on={on}
                      disabled={savingKey === row.key}
                      onToggle={() => toggle(row.key, !on)}
                    />
                  </div>
                );
              })}
        </div>

        <div className="space-y-4">
          <div>
            <p className="label-sm uppercase text-on-surface-variant">
              Books in home sections
            </p>
            <p className="mt-1 text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">
              A section stays blank until you place at least one published book in it.
              Search a title, then add it to one rail or every rail.
            </p>
          </div>

          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search published novels…"
              className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-[14px] text-on-surface outline-none focus:border-on-surface"
            />
            {search.trim().length >= 2 ? (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest shadow-lg">
                {searching ? (
                  <p className="px-3 py-3 text-[13px] text-on-surface-variant">Searching…</p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-3 text-[13px] text-on-surface-variant">No published books found.</p>
                ) : results.map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between gap-3 border-b border-outline-variant/70 px-3 py-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-serif text-[15px] text-on-surface">{book.title}</p>
                      <p className="truncate text-[12px] text-on-surface-variant">{book.authorName || 'Author'}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busyTag === '*'}
                      onClick={() => addToAll(book.id)}
                      className="shrink-0 rounded-md bg-ink-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-cream-100 disabled:opacity-50 dark:bg-neutral-100 dark:text-ink-900"
                    >
                      Add to all
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {shelvesLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-md border border-outline-variant p-4">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="mt-3 h-10 w-full" />
                  </div>
                ))
              : shelves.map((shelf) => (
                  <div
                    key={shelf.tag}
                    className="rounded-md border border-outline-variant bg-surface-container-lowest p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-[16px] text-on-surface">{shelf.label}</p>
                        <p className="mt-0.5 text-[12px] text-on-surface-variant">{shelf.hint}</p>
                      </div>
                      <span className="text-[11px] uppercase tracking-widest text-on-surface-variant">
                        {shelf.books.length} book{shelf.books.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {results.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {results.map((book) => {
                          const already = shelf.books.some((b) => b.id === book.id);
                          return (
                            <button
                              key={`${shelf.tag}-${book.id}`}
                              type="button"
                              disabled={already || busyTag === shelf.tag}
                              onClick={() => addToShelf(shelf.tag, book.id)}
                              className="rounded-full border border-outline-variant px-3 py-1 text-[12px] text-on-surface disabled:opacity-40 hover:border-on-surface"
                            >
                              {already ? `In section · ${book.title}` : `Add ${book.title}`}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {shelf.books.length === 0 ? (
                      <p className="mt-3 text-[13px] text-on-surface-variant">No books in this section yet.</p>
                    ) : (
                      <ul className="mt-3 divide-y divide-outline-variant">
                        {shelf.books.map((book) => (
                          <li key={book.id} className="flex items-center justify-between gap-3 py-2">
                            <span className="min-w-0 truncate text-[14px] text-on-surface">
                              {bookLabel(book)}
                            </span>
                            <button
                              type="button"
                              disabled={busyTag === `${shelf.tag}:${book.id}`}
                              onClick={() => removeFromShelf(shelf.tag, book.id)}
                              className="shrink-0 text-[12px] text-on-surface-variant hover:text-on-surface"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function AdminPageConfigurationPage() {
  return (
    <AdminPageGuard permission="page_configuration">
      <Inner />
    </AdminPageGuard>
  );
}