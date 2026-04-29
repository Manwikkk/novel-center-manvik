'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

export default function BookEditorForm({ book, onSaved }) {
  const router = useRouter();
  const pushToast = useUiStore((s) => s.pushToast);
  const [form, setForm] = useState({
    title: book?.title || '',
    synopsis: book?.synopsis || '',
    category: book?.category || '',
    language: book?.language || 'en',
    status: book?.status || 'draft',
  });
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      let saved;
      if (book) {
        const r = await api.patch(`/books/${book.id}`, form);
        saved = r.book;
      } else {
        const r = await api.post('/books', form);
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
        <TextInput label="Category" value={form.category} onChange={update('category')} />
        <TextInput label="Language" value={form.language} onChange={update('language')} />
      </div>
      <div>
        <p className="label-sm uppercase text-ink-400">Status</p>
        <div className="mt-3 inline-flex rounded border border-ink-300 overflow-hidden">
          {['draft','published','archived'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForm((f) => ({ ...f, status: s }))}
              className={
                'px-4 py-2 text-[12px] tracking-labelTight uppercase ' +
                (form.status === s ? 'bg-ink-900 text-cream-100' : 'text-ink-700 hover:text-ink-900')
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="pt-2 flex items-center gap-3">
        <Button type="submit" variant="primary" size="md" disabled={busy}>
          {busy ? 'Saving…' : book ? 'Save changes' : 'Create book'}
        </Button>
        {book && (
          <Button href={`/books/${book.slug}`} variant="ghost" size="md">View public page</Button>
        )}
      </div>
    </form>
  );
}
