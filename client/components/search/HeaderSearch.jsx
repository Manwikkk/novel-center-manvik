'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import Avatar from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

const DEBOUNCE_MS = 280;
const MIN_QUERY = 2;
const LIMIT = 5;

function highlightMatch(text, query) {
  if (!text || !query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent font-semibold text-ink-900 dark:text-white">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function HeaderSearch({ className }) {
  const router = useRouter();
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();
  const hasResults = books.length > 0 || authors.length > 0;
  const showPanel = open && trimmed.length >= MIN_QUERY;

  const flatItems = [
    ...books.map((b) => ({ type: 'book', id: b.id, href: `/books/${b.slug}`, data: b })),
    ...authors.map((a) => ({ type: 'author', id: a.id, href: `/authors/${a.id}`, data: a })),
  ];

  const fetchSuggestions = useCallback(async (q, signal) => {
    setLoading(true);
    try {
      const [booksRes, authorsRes] = await Promise.all([
        api.get('/books', { query: { q, status: 'published', pageSize: LIMIT }, signal }),
        api.get('/authors', { query: { q, pageSize: LIMIT }, signal }),
      ]);
      setBooks(booksRes.items || []);
      setAuthors(authorsRes.items || []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setBooks([]);
      setAuthors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) {
      setBooks([]);
      setAuthors([]);
      setLoading(false);
      setActiveIndex(-1);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchSuggestions(trimmed, controller.signal);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, fetchSuggestions]);

  useEffect(() => {
    if (!showPanel) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showPanel]);

  function goDiscover(value = trimmed) {
    setOpen(false);
    const q = value.trim();
    router.push(q ? `/discover?q=${encodeURIComponent(q)}` : '/discover');
  }

  function selectItem(item) {
    setOpen(false);
    setQuery('');
    router.push(item.href);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'Enter') {
      if (activeIndex >= 0 && flatItems[activeIndex]) {
        e.preventDefault();
        selectItem(flatItems[activeIndex]);
        return;
      }
      e.preventDefault();
      goDiscover();
      return;
    }

    if (!showPanel || flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flatItems.length - 1 : i - 1));
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <form
        action="/discover"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          goDiscover();
        }}
        className="flex items-center gap-2 border-b border-ink-300 dark:border-neutral-600 pb-1"
      >
        <Icon name="search" size={20} className="text-ink-500 dark:text-neutral-500 shrink-0" />
        <input
          ref={inputRef}
          name="q"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search titles or authors…"
          className="min-w-0 flex-1 bg-transparent border-none p-0 text-sm outline-none text-ink-900 dark:text-neutral-100 placeholder:text-ink-400 dark:placeholder:text-neutral-500"
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="header-search-listbox"
          aria-autocomplete="list"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setBooks([]);
              setAuthors([]);
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="text-ink-400 hover:text-ink-900 dark:text-neutral-500 dark:hover:text-neutral-200"
            aria-label="Clear search"
          >
            <Icon name="close" size={16} />
          </button>
        ) : null}
      </form>

      {showPanel ? (
        <div
          id="header-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+10px)] z-[60] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-editorial-modal"
        >
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-ink-500 dark:text-neutral-400">
              Searching…
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-6 text-center text-sm text-ink-500 dark:text-neutral-400">
              No matches for &ldquo;{trimmed}&rdquo;
            </div>
          ) : (
            <div className="max-h-[min(70vh,420px)] overflow-y-auto py-2">
              {books.length > 0 && (
                <div className="px-2 pb-1">
                  <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-400 dark:text-neutral-500">
                    Books
                  </p>
                  <ul>
                    {books.map((book) => {
                      const idx = flatItems.findIndex((it) => it.type === 'book' && it.id === book.id);
                      return (
                        <li key={book.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={activeIndex === idx}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => selectItem(flatItems[idx])}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors',
                              activeIndex === idx
                                ? 'bg-ink-900/5 dark:bg-white/10'
                                : 'hover:bg-ink-900/5 dark:hover:bg-white/10',
                            )}
                          >
                            <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                              {book.coverUrl ? (
                                <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-400">NC</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink-900 dark:text-neutral-100">
                                {highlightMatch(book.title, trimmed)}
                              </p>
                              <p className="truncate text-xs text-ink-500 dark:text-neutral-400">
                                {book.authorName || 'Author'}
                                {book.category ? ` · ${book.category}` : ''}
                              </p>
                            </div>
                            <Icon name="menu_book" size={16} className="shrink-0 text-ink-400 dark:text-neutral-500" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {authors.length > 0 && (
                <div className="px-2 pb-1">
                  <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-400 dark:text-neutral-500">
                    Authors
                  </p>
                  <ul>
                    {authors.map((author) => {
                      const idx = flatItems.findIndex((it) => it.type === 'author' && it.id === author.id);
                      return (
                        <li key={author.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={activeIndex === idx}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => selectItem(flatItems[idx])}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors',
                              activeIndex === idx
                                ? 'bg-ink-900/5 dark:bg-white/10'
                                : 'hover:bg-ink-900/5 dark:hover:bg-white/10',
                            )}
                          >
                            <Avatar name={author.displayName} src={author.avatarUrl} size={36} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink-900 dark:text-neutral-100">
                                {highlightMatch(author.displayName, trimmed)}
                              </p>
                              <p className="truncate text-xs text-ink-500 dark:text-neutral-400">
                                {author.bookCount} {author.bookCount === 1 ? 'book' : 'books'}
                              </p>
                            </div>
                            <Icon name="person" size={16} className="shrink-0 text-ink-400 dark:text-neutral-500" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-neutral-200 dark:border-neutral-800 px-3 py-2">
            <button
              type="button"
              onClick={() => goDiscover()}
              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-ink-700 hover:bg-ink-900/5 dark:text-neutral-300 dark:hover:bg-white/10"
            >
              <span>View all results for &ldquo;{trimmed}&rdquo;</span>
              <Icon name="arrow_forward" size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
