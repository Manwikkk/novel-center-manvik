'use client';

import { useRef, useState } from 'react';
import { Upload, ImagePlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';

export default function CoverUploader({ book, onUpdated }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const pushToast = useUiStore((s) => s.pushToast);
  const [preview, setPreview] = useState(book?.coverUrl || null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      pushToast({ type: 'error', title: 'File too large', message: 'Cover must be under 5MB.' });
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('cover', file);
      const data = await api.upload(`/books/${book.id}/cover`, fd);
      setPreview(data.book.coverUrl);
      onUpdated?.(data.book);
      pushToast({ type: 'success', title: 'Cover updated' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Upload failed', message: err.message });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col items-center sm:items-start gap-4">
      <div className="w-full max-w-[160px] aspect-[3/4] bg-surface-container overflow-hidden rounded-md border border-surface-variant flex items-center justify-center text-outline mx-auto sm:mx-0">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus size={28} className="text-on-surface-variant" />
        )}
      </div>
      <div className="w-full text-center sm:text-left">
        <p className="text-[12px] text-on-surface-variant leading-relaxed">
          JPG, PNG, WebP, or AVIF. Up to 5MB. Aim for 800×1200px.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-studio-accent hover:bg-studio-accent-hover text-white text-[12px] font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
        >
          <Upload size={14} />
          {busy ? 'Uploading…' : preview ? 'Replace' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
    </div>
  );
}
