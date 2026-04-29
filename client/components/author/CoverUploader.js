'use client';

import { useRef, useState } from 'react';
import { Upload, ImagePlus } from 'lucide-react';
import { api } from '@/lib/api';
import Button from '@/components/ui/Button';
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
    <div>
      <p className="label-sm uppercase text-ink-400">Cover</p>
      <div className="mt-3 flex gap-4">
        <div className="w-32 aspect-[3/4] bg-cream-300 overflow-hidden rounded-sm border border-ink-200/60 flex items-center justify-center text-ink-400">
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={20} />}
        </div>
        <div className="flex-1">
          <p className="text-[13px] text-ink-700">
            JPG, PNG, WebP, or AVIF. Up to 5MB. Aim for 800×1200px.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} className="mr-2" /> {busy ? 'Uploading…' : preview ? 'Replace cover' : 'Upload cover'}
          </Button>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </div>
      </div>
    </div>
  );
}
