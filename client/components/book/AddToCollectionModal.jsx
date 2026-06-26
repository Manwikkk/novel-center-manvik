'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { collectionsApi } from '@/lib/collections';
import { cn } from '@/lib/cn';

export default function AddToCollectionModal({ open, book, onClose, onSaved }) {
  const bookId = book?.id;
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [newName, setNewName] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    setError('');
    try {
      const [listRes, containsRes] = await Promise.all([
        collectionsApi.list({ pageSize: 60 }),
        collectionsApi.contains([bookId]),
      ]);
      const items = listRes.items || [];
      setCollections(items);
      const inCollections = new Set(containsRes?.items?.[bookId] || []);
      setSelected(inCollections);
    } catch (err) {
      setError(err.message || 'Could not load collections');
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    if (open) load();
    else {
      setNewName('');
      setVisibility('private');
      setError('');
    }
  }, [open, load]);

  function toggleCollection(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateAndAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setBusy(true);
    setError('');
    try {
      const { collection } = await collectionsApi.create({ name: trimmed, visibility });
      await collectionsApi.addBook(collection.id, bookId);
      setCollections((prev) => [collection, ...prev]);
      setSelected((prev) => new Set(prev).add(collection.id));
      setNewName('');
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not create collection');
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!bookId) return;
    setBusy(true);
    setError('');
    try {
      const initial = new Set(
        (await collectionsApi.contains([bookId])).items?.[bookId] || [],
      );
      const toAdd = [...selected].filter((id) => !initial.has(id));
      const toRemove = [...initial].filter((id) => !selected.has(id));
      await Promise.all([
        ...toAdd.map((id) => collectionsApi.addBook(id, bookId)),
        ...toRemove.map((id) => collectionsApi.removeBook(id, bookId)),
      ]);
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Could not update collections');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to collection"
      size="md"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy || loading}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      )}
    >
      <div className="space-y-6">
        <p className="text-sm text-ink-600 dark:text-neutral-400">
          Save &ldquo;{book?.title}&rdquo; to one or more collections.
        </p>

        <div className="space-y-3">
          <label className="block text-[11px] uppercase tracking-widest text-ink-500 dark:text-neutral-500">
            New collection
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Collection name"
            maxLength={120}
            className="w-full border-b border-ink-200 bg-transparent py-2 text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none dark:border-neutral-600 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-200"
          />
          <div className="flex gap-2">
            {['private', 'public'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[11px] uppercase tracking-widest border transition-colors',
                  visibility === v
                    ? 'border-ink-900 bg-ink-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-black'
                    : 'border-ink-200 text-ink-600 hover:border-ink-400 dark:border-neutral-700 dark:text-neutral-400',
                )}
              >
                {v}
              </button>
            ))}
          </div>
          {newName.trim() ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCreateAndAdd}
              disabled={busy}
            >
              Create &amp; add
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-ink-500 dark:text-neutral-500">
            Your collections
          </p>
          {loading ? (
            <p className="text-sm text-ink-500 dark:text-neutral-500">Loading…</p>
          ) : collections.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-neutral-500">No collections yet. Create one above.</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto space-y-1 border border-ink-100 rounded-md p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
              {collections.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-3 px-2 py-2 rounded hover:bg-ink-50 dark:hover:bg-neutral-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleCollection(c.id)}
                      className="rounded border-ink-300 dark:border-neutral-600 dark:bg-neutral-900"
                    />
                    <span className="flex-1 text-sm text-ink-900 dark:text-neutral-100">{c.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-ink-400 dark:text-neutral-500">
                      {c.visibility}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}
