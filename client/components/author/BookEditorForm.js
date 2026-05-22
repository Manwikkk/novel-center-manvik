'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

const selectCls = cn(
  'w-full rounded-md border border-outline bg-surface-container-lowest px-3 py-2.5 text-[14px] text-on-surface',
  'dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
  'focus:outline-none focus:ring-2 focus:ring-outline/30 dark:focus:ring-neutral-500/30',
);

export default function BookEditorForm({ book, onSaved }) {
  const router = useRouter();
  const pushToast = useUiStore((s) => s.pushToast);
  const [catalog, setCatalog] = useState({ categories: [], languages: [], contentTags: [] });
  const [catalogLoading, setCatalogLoading] = useState(true);

  const initialTagIds = useMemo(
    () => (book?.contentTags || []).map((t) => t.id),
    [book],
  );

  const [form, setForm] = useState({
    title: book?.title || '',
    synopsis: book?.synopsis || '',
    categoryId: book?.categoryId != null ? String(book.categoryId) : '',
    languageId: book?.languageId != null ? String(book.languageId) : '',
    contentTagIds: new Set(initialTagIds),
    status: book?.status || 'draft',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    Promise.all([
      api.get('/catalog/categories').catch(() => ({ items: [] })),
      api.get('/catalog/languages').catch(() => ({ items: [] })),
      api.get('/catalog/content-tags').catch(() => ({ items: [] })),
    ])
      .then(([c, l, t]) => {
        if (cancelled) return;
        setCatalog({
          categories: c.items || [],
          languages: l.items || [],
          contentTags: t.items || [],
        });
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!book || catalogLoading) return;
    if (form.languageId) return;
    const en = catalog.languages.find((l) => l.code === 'en');
    if (en) setForm((f) => ({ ...f, languageId: String(en.id) }));
  }, [book, catalog.languages, catalogLoading, form.languageId]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function toggleContentTag(id) {
    setForm((f) => {
      const next = new Set(f.contentTagIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...f, contentTagIds: next };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        synopsis: form.synopsis,
        status: form.status,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        languageId: form.languageId ? Number(form.languageId) : null,
        contentTagIds: Array.from(form.contentTagIds),
      };
      let saved;
      if (book) {
        const r = await api.patch(`/books/${book.id}`, payload);
        saved = r.book;
      } else {
        const r = await api.post('/books', payload);
        saved = r.book;
        router.push(`/author/books/${saved.id}/edit`);
      }
      onSaved?.(saved);
      pushToast({ type: 'success', title: 'Saved' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Save failed', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <TextInput label="Title" value={form.title} onChange={update('title')} required />
      <TextInput label="Synopsis" value={form.synopsis} onChange={update('synopsis')} multiline rows={5} />

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="block label-sm uppercase text-ink-400 dark:text-neutral-500 mb-2">Category</label>
          <select
            className={selectCls}
            value={form.categoryId}
            onChange={update('categoryId')}
            disabled={catalogLoading}
          >
            <option value="">— None —</option>
            {catalog.categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.label}
              </option>
            ))}
          </select>
          {catalogLoading && (
            <p className="mt-1 text-[12px] text-ink-400 dark:text-neutral-500">Loading catalog…</p>
          )}
        </div>
        <div>
          <label className="block label-sm uppercase text-ink-400 dark:text-neutral-500 mb-2">Language</label>
          <select
            className={selectCls}
            value={form.languageId}
            onChange={update('languageId')}
            disabled={catalogLoading}
            required
          >
            <option value="">— Select —</option>
            {catalog.languages.map((l) => (
              <option key={l.id} value={String(l.id)}>
                {l.label} ({l.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="label-sm uppercase text-ink-400 dark:text-neutral-500 mb-2">Tags</p>
        <p className="text-[13px] text-ink-500 dark:text-neutral-400 mb-3">
          Choose any labels that fit this work (curated by the editorial team).
        </p>
        <div className="flex flex-wrap gap-2">
          {catalog.contentTags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleContentTag(t.id)}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/25 rounded-full"
            >
              <Chip active={form.contentTagIds.has(t.id)} as="span">
                {t.label}
              </Chip>
            </button>
          ))}
        </div>
        {catalog.contentTags.length === 0 && !catalogLoading && (
          <p className="text-[13px] text-ink-400 dark:text-neutral-500 mt-2">No tags available yet.</p>
        )}
      </div>

      <div>
        <p className="label-sm uppercase text-ink-400">Status</p>
        <div className="mt-3 inline-flex rounded border border-ink-300 dark:border-neutral-600 overflow-hidden">
          {['draft', 'published', 'archived'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForm((f) => ({ ...f, status: s }))}
              className={
                'px-4 py-2 text-[12px] tracking-labelTight uppercase ' +
                (form.status === s
                  ? 'bg-ink-900 text-cream-100 dark:bg-neutral-100 dark:text-ink-900'
                  : 'text-ink-700 hover:text-ink-900 dark:text-neutral-300 dark:hover:text-neutral-100')
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 flex items-center gap-3">
        <Button type="submit" variant="primary" size="md" disabled={busy || catalogLoading || !form.languageId}>
          {busy ? 'Saving…' : book ? 'Save changes' : 'Create book'}
        </Button>
        {book && (
          <Button href={`/books/${book.slug}`} variant="ghost" size="md">
            View public page
          </Button>
        )}
      </div>
    </form>
  );
}
