'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function ConfirmRecycleModal({
  open,
  title,
  message,
  confirmLabel = 'Move to recycle bin',
  busy,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        disabled={busy}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-md border border-outline-variant bg-surface-container-lowest p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="font-serif text-[22px] text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-on-surface-variant hover:text-on-surface disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-[14px] text-on-surface-variant normal-case tracking-normal font-sans">
          {message}
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-md border border-outline-variant text-on-surface-variant text-[12px] uppercase tracking-widest disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-danger text-white text-[12px] uppercase tracking-widest disabled:opacity-50"
          >
            {busy ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
