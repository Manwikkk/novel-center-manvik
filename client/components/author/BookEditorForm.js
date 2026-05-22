'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { emptyBookForm, formToPayload } from '@/lib/bookFormOptions';
import {
  FormSection,
  NovelInformationFields,
  StoryDetailsFields,
  useBookCatalog,
} from '@/components/author/BookFormFields';

export default function BookEditorForm({ book, onSaved }) {
  const pushToast = useUiStore((s) => s.pushToast);
  const { catalog, loading: catalogLoading } = useBookCatalog();
  const [form, setForm] = useState(() => emptyBookForm(book));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (book) setForm(emptyBookForm(book));
  }, [book]);

  useEffect(() => {
    if (!book || catalogLoading || form.languageId) return;
    const en = catalog.languages.find((l) => l.code === 'en');
    if (en) setForm((f) => ({ ...f, languageId: String(en.id) }));
  }, [book, catalog.languages, catalogLoading, form.languageId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = formToPayload(form);
      const r = await api.patch(`/books/${book.id}`, payload);
      const saved = r.book;
      onSaved?.(saved);
      pushToast({ type: 'success', title: 'Saved' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Save failed', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy
    && !catalogLoading
    && form.title.trim()
    && form.languageId;

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <FormSection title="Novel information">
          <NovelInformationFields
            form={form}
            setForm={setForm}
            catalog={catalog}
            catalogLoading={catalogLoading}
            showCover={false}
          />
        </FormSection>

        <FormSection title="Story details">
          <StoryDetailsFields
            form={form}
            setForm={setForm}
            catalog={catalog}
            catalogLoading={catalogLoading}
          />
        </FormSection>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center px-8 py-2.5 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-[12px] font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
