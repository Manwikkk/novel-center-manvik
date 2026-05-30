'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/uiStore';

const inputCls = cn(
  'w-full rounded-md border border-outline bg-surface-container-lowest px-3 py-2.5 text-[14px] text-on-surface',
  'focus:outline-none focus:ring-2 focus:ring-studio-accent/40',
);

const MAX_TAGS = 32;

export default function ContentTagPicker({
  tags = [],
  selectedIds,
  onSelectedChange,
  onTagCreated,
  disabled = false,
}) {
  const pushToast = useUiStore((s) => s.pushToast);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedTags = useMemo(
    () => tags.filter((t) => selectedIds.has(t.id)),
    [tags, selectedIds],
  );

  const trimmedQuery = query.trim();
  const qLower = trimmedQuery.toLowerCase();

  const filteredTags = useMemo(() => {
    const pool = tags.filter((t) => !selectedIds.has(t.id));
    if (!qLower) return pool.slice(0, 12);
    return pool.filter((t) => t.label.toLowerCase().includes(qLower)).slice(0, 12);
  }, [tags, selectedIds, qLower]);

  const exactMatch = useMemo(() => {
    if (!qLower) return null;
    return tags.find((t) => t.label.toLowerCase() === qLower) || null;
  }, [tags, qLower]);

  const canCreate =
    trimmedQuery.length >= 2
    && !exactMatch
    && selectedIds.size < MAX_TAGS;

  const options = useMemo(() => {
    const items = filteredTags.map((t) => ({ type: 'tag', tag: t }));
    if (canCreate) items.push({ type: 'create', label: trimmedQuery });
    return items;
  }, [filteredTags, canCreate, trimmedQuery]);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  function addTag(id) {
    if (selectedIds.has(id) || selectedIds.size >= MAX_TAGS) return;
    onSelectedChange((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeTag(id) {
    onSelectedChange((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function createCustomTag(label) {
    if (creating || selectedIds.size >= MAX_TAGS) return;
    const normalized = label.trim();
    if (normalized.length < 2) return;

    const existing = tags.find((t) => t.label.toLowerCase() === normalized.toLowerCase());
    if (existing) {
      addTag(existing.id);
      return;
    }

    setCreating(true);
    try {
      const res = await api.post('/catalog/content-tags', { label: normalized });
      const tag = res.tag;
      onTagCreated?.(tag);
      onSelectedChange((prev) => {
        const next = new Set(prev);
        next.add(tag.id);
        return next;
      });
      setQuery('');
      setOpen(false);
      pushToast({ type: 'success', title: 'Tag added', message: `"${tag.label}" is ready to use.` });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not create tag', message: err.message });
    } finally {
      setCreating(false);
    }
  }

  function selectOption(option) {
    if (option.type === 'create') {
      createCustomTag(option.label);
      return;
    }
    addTag(option.tag.id);
  }

  function onInputKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, options.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (options[activeIndex]) {
        selectOption(options[activeIndex]);
      } else if (canCreate) {
        createCustomTag(trimmedQuery);
      }
    }
  }

  return (
    <div>
      <div className="mb-2">
        <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
          Content tags
        </label>
      </div>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedTags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-studio-accent/40 bg-studio-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-on-surface"
            >
              {t.label}
              <button
                type="button"
                onClick={() => removeTag(t.id)}
                className="rounded-full p-0.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                aria-label={`Remove ${t.label}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div ref={rootRef} className="relative">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled || selectedIds.size >= MAX_TAGS}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onInputKeyDown}
            placeholder={
              selectedIds.size >= MAX_TAGS
                ? `Maximum ${MAX_TAGS} tags selected`
                : 'Search or add a tag…'
            }
            className={cn(inputCls, 'pl-9 pr-4')}
            autoComplete="off"
          />
        </div>

        {open && !disabled && selectedIds.size < MAX_TAGS && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest shadow-lg">
            {options.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-on-surface-variant">
                {trimmedQuery ? 'No matching tags. Press Enter to create one.' : 'Start typing to search tags.'}
              </p>
            ) : (
              <ul className="max-h-56 overflow-y-auto py-1">
                {options.map((option, idx) => {
                  const active = idx === activeIndex;
                  if (option.type === 'create') {
                    return (
                      <li key="create">
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => selectOption(option)}
                          disabled={creating}
                          className={cn(
                            'flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px]',
                            active ? 'bg-studio-accent/10 text-on-surface' : 'text-on-surface hover:bg-surface-container',
                          )}
                        >
                          <Plus size={14} className="shrink-0 text-studio-accent" />
                          <span>
                            Create tag &ldquo;
                            <span className="font-semibold">{option.label}</span>
                            &rdquo;
                          </span>
                        </button>
                      </li>
                    );
                  }

                  const { tag } = option;
                  return (
                    <li key={tag.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => selectOption(option)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[13px]',
                          active ? 'bg-studio-accent/10 text-on-surface' : 'text-on-surface hover:bg-surface-container',
                        )}
                      >
                        <span className="truncate">{tag.label}</span>
                        {selectedIds.has(tag.id) ? (
                          <Check size={14} className="shrink-0 text-studio-accent" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="mt-2 text-[12px] text-on-surface-variant">
        {selectedIds.size}/{MAX_TAGS} tags selected
        {canCreate ? ' · Press Enter to add a custom tag' : null}
      </p>
    </div>
  );
}
