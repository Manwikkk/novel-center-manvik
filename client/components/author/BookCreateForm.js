'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { emptyBookForm, formToPayload } from '@/lib/bookFormOptions';
import {
  FormSection,
  NovelInformationFields,
  StoryDetailsFields,
  PublishOnCreateChoice,
  useBookCatalog,
} from '@/components/author/BookFormFields';

export default function BookCreateForm() {
  const router = useRouter();
  const pushToast = useUiStore((s) => s.pushToast);
  const { catalog, loading: catalogLoading, addContentTag } = useBookCatalog();
  const [form, setForm] = useState(emptyBookForm());
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (form.languageId || catalogLoading) return;
    const en = catalog.languages.find((l) => l.code === 'en');
    if (en) setForm((f) => ({ ...f, languageId: String(en.id) }));
  }, [catalog.languages, catalogLoading, form.languageId]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  function onCoverFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      pushToast({ type: 'error', title: 'File too large', message: 'Cover must be under 5MB.' });
      return;
    }
    setCoverFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.synopsis.trim()) {
      pushToast({ type: 'error', title: 'Synopsis required', message: 'Please add a synopsis before creating.' });
      return;
    }
    setBusy(true);
    try {
      const payload = formToPayload(form, { includeStatus: true });
      const r = await api.post('/books', payload);
      let saved = r.book;

      if (coverFile && saved?.id) {
        const fd = new FormData();
        fd.append('cover', coverFile);
        const up = await api.upload(`/books/${saved.id}/cover`, fd);
        saved = up.book;
      }

      pushToast({
        type: 'success',
        title: saved.status === 'published' ? 'Book published' : 'Draft saved',
        message: 'Add chapters on the next screen.',
      });
      router.push(`/author/books/${saved.id}/edit?created=1`);
    } catch (err) {
      pushToast({ type: 'error', title: 'Create failed', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy
    && !catalogLoading
    && form.title.trim()
    && form.synopsis.trim()
    && form.genre
    && form.languageId
    && form.bookLength
    && form.warningNotice;

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <FormSection title="Novel information">
          <NovelInformationFields
            form={form}
            setForm={setForm}
            catalog={catalog}
            catalogLoading={catalogLoading}
            coverPreview={coverPreview}
            onCoverFile={onCoverFile}
          />
        </FormSection>

        <FormSection title="Story details">
          <StoryDetailsFields
            form={form}
            setForm={setForm}
            catalog={catalog}
            catalogLoading={catalogLoading}
            onTagCreated={addContentTag}
          />
        </FormSection>
      </div>

      <PublishOnCreateChoice form={form} setForm={setForm} />

      <div className="pt-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center px-10 py-3 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-[13px] font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
        >
          {busy ? 'Creating…' : form.publishChoice === 'published' ? 'Create & publish' : 'Create draft'}
        </button>
      </div>
    </form>
  );
}
