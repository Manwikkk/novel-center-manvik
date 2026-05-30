'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, HelpCircle, Upload, ImagePlus } from 'lucide-react';
import ContentTagPicker from '@/components/author/ContentTagPicker';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  BOOK_TYPES,
  LEADING_GENDERS,
  GENRE_OPTIONS,
  BOOK_LENGTHS,
  WARNING_NOTICES,
  PUBLISH_CHOICES,
  TITLE_MAX,
  ABBREVIATION_MAX,
} from '@/lib/bookFormOptions';

export const selectCls = cn(
  'w-full rounded-md border border-outline bg-surface-container-lowest px-3 py-2.5 text-[14px] text-on-surface',
  'focus:outline-none focus:ring-2 focus:ring-studio-accent/40',
);

export function FormSection({ title, children, className }) {
  return (
    <section
      className={cn(
        'rounded-xl border border-surface-variant bg-surface-container-lowest p-5 md:p-6',
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-surface-variant">
        <FileText size={18} className="text-on-surface-variant" />
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-on-surface">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function FieldLabel({ children, required, hint }) {
  return (
    <div className="mb-2">
      <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
        {required && <span className="text-studio-highlight">*</span>}
        {children}
        {hint && (
          <span className="inline-flex text-on-surface-variant/80" title={hint}>
            <HelpCircle size={12} />
          </span>
        )}
      </label>
    </div>
  );
}

export function RadioRow({ name, value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-4">
      {options.map((opt) => (
        <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-4 w-4 accent-studio-accent border-outline"
          />
          <span className="text-[13px] font-semibold uppercase tracking-wide text-on-surface">
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function CharCountInput({
  label,
  value,
  onChange,
  max,
  placeholder,
  required,
  multiline,
  rows = 4,
}) {
  const len = (value || '').length;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <FieldLabel required={required}>{label}</FieldLabel>
        <span className="text-[11px] text-on-surface-variant tabular-nums">
          {len}/{max}
        </span>
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, max))}
          rows={rows}
          placeholder={placeholder}
          required={required}
          className={cn(selectCls, 'resize-y min-h-[120px]')}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, max))}
          placeholder={placeholder}
          required={required}
          className={selectCls}
        />
      )}
    </div>
  );
}

export function CoverPicker({ previewUrl, onFileSelect, disabled }) {
  const inputRef = useRef(null);
  return (
    <div>
      <FieldLabel>Book cover</FieldLabel>
      <div className="flex gap-4 items-start">
        <div className="w-[100px] aspect-[3/4] shrink-0 rounded-md overflow-hidden border border-surface-variant bg-surface-container flex items-center justify-center">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus size={28} className="text-on-surface-variant" />
          )}
        </div>
        <div>
          <p className="text-[12px] text-on-surface-variant mb-3">
            JPG, PNG, WebP, or AVIF. Up to 5MB.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-studio-accent hover:bg-studio-accent-hover text-white text-[12px] font-bold uppercase tracking-wider disabled:opacity-50"
          >
            <Upload size={14} />
            Upload
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect?.(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function useBookCatalog() {
  const [catalog, setCatalog] = useState({ categories: [], languages: [], contentTags: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
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
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function addContentTag(tag) {
    setCatalog((prev) => addTagToCatalog(prev, tag));
  }

  return { catalog, loading, addContentTag, setCatalog };
}

function addTagToCatalog(catalog, tag) {
  if (catalog.contentTags.some((t) => t.id === tag.id)) return catalog;
  return {
    ...catalog,
    contentTags: [...catalog.contentTags, tag].sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export function NovelInformationFields({
  form,
  setForm,
  catalog,
  catalogLoading,
  coverPreview,
  onCoverFile,
  showCover = true,
}) {
  const genres = GENRE_OPTIONS[form.leadingGender] || GENRE_OPTIONS.male;

  useEffect(() => {
    if (!form.genre) return;
    const allowed = new Set(genres.map((g) => g.value));
    if (!allowed.has(form.genre)) {
      setForm((f) => ({ ...f, genre: '' }));
    }
  }, [form.leadingGender, form.genre, genres, setForm]);

  return (
    <div className="space-y-5">
      <CharCountInput
        label="Book name"
        value={form.title}
        onChange={(v) => setForm((f) => ({ ...f, title: v }))}
        max={TITLE_MAX}
        placeholder="Within 70 characters"
        required
      />

      <div>
        <FieldLabel required>Type</FieldLabel>
        <RadioRow
          name="bookType"
          value={form.bookType}
          onChange={(v) => setForm((f) => ({ ...f, bookType: v }))}
          options={BOOK_TYPES}
        />
      </div>

      <div>
        <FieldLabel required hint="Determines which genres appear in the list below.">
          Leading gender
        </FieldLabel>
        <RadioRow
          name="leadingGender"
          value={form.leadingGender}
          onChange={(v) => setForm((f) => ({ ...f, leadingGender: v, genre: '' }))}
          options={LEADING_GENDERS}
        />
      </div>

      <div>
        <FieldLabel required>Genre</FieldLabel>
        <select
          className={selectCls}
          value={form.genre}
          onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
          required
          disabled={catalogLoading}
        >
          <option value="">Select</option>
          {genres.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel>Language</FieldLabel>
        <select
          className={selectCls}
          value={form.languageId}
          onChange={(e) => setForm((f) => ({ ...f, languageId: e.target.value }))}
          required
          disabled={catalogLoading}
        >
          <option value="">Select</option>
          {catalog.languages.map((l) => (
            <option key={l.id} value={String(l.id)}>{l.label}</option>
          ))}
        </select>
      </div>

      {showCover && (
        <CoverPicker
          previewUrl={coverPreview}
          onFileSelect={onCoverFile}
          disabled={!onCoverFile}
        />
      )}
    </div>
  );
}

export function PublishOnCreateChoice({ form, setForm }) {
  return (
    <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
      <FieldLabel required>When you create this book</FieldLabel>
      <div className="mt-3 space-y-3">
        {PUBLISH_CHOICES.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
              form.publishChoice === opt.value
                ? 'border-studio-accent bg-studio-accent/10'
                : 'border-surface-variant hover:bg-surface-container',
            )}
          >
            <input
              type="radio"
              name="publishChoice"
              value={opt.value}
              checked={form.publishChoice === opt.value}
              onChange={() => setForm((f) => ({ ...f, publishChoice: opt.value }))}
              className="mt-1 h-4 w-4 accent-studio-accent"
            />
            <span>
              <span className="block text-[13px] font-bold uppercase tracking-wide text-on-surface">
                {opt.label}
              </span>
              <span className="block text-[12px] text-on-surface-variant mt-1 leading-relaxed">
                {opt.hint}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function StoryDetailsFields({ form, setForm, catalog, catalogLoading, onTagCreated }) {
  return (
    <div className="space-y-5">
      <CharCountInput
        label="Synopsis"
        value={form.synopsis}
        onChange={(v) => setForm((f) => ({ ...f, synopsis: v }))}
        max={5000}
        placeholder="Type something seriously — a wonderful synopsis can attract more readers"
        required
        multiline
        rows={5}
      />

      <div>
        <FieldLabel>Book category</FieldLabel>
        <select
          className={selectCls}
          value={form.categoryId}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          disabled={catalogLoading}
        >
          <option value="">Select category</option>
          {catalog.categories.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.label}</option>
          ))}
        </select>
      </div>

      <ContentTagPicker
        tags={catalog.contentTags}
        selectedIds={form.contentTagIds}
        disabled={catalogLoading}
        onSelectedChange={(updater) => {
          setForm((f) => ({
            ...f,
            contentTagIds: typeof updater === 'function' ? updater(f.contentTagIds) : updater,
          }));
        }}
        onTagCreated={onTagCreated}
      />

      <p className="text-[12px] text-on-surface-variant -mt-2 leading-relaxed">
        Before selecting tags, choose your target audience (male/female) in the novel information
        section. Accurate tags may raise the chances of readers finding your work.
      </p>

      <CharCountInput
        label="Abbreviation"
        value={form.abbreviation}
        onChange={(v) => setForm((f) => ({ ...f, abbreviation: v }))}
        max={ABBREVIATION_MAX}
        placeholder="Within 15 characters"
      />

      <div>
        <FieldLabel required hint="How long is this work?">Length</FieldLabel>
        <select
          className={selectCls}
          value={form.bookLength}
          onChange={(e) => setForm((f) => ({ ...f, bookLength: e.target.value }))}
          required
        >
          <option value="">Select</option>
          {BOOK_LENGTHS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel required>Warning notice</FieldLabel>
        <select
          className={selectCls}
          value={form.warningNotice}
          onChange={(e) => setForm((f) => ({ ...f, warningNotice: e.target.value }))}
          required
        >
          <option value="">Select</option>
          {WARNING_NOTICES.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
      </div>

    </div>
  );
}
