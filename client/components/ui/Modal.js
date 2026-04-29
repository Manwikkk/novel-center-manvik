'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
      />
      <div className={cn('relative w-full bg-cream-100 rounded-lg shadow-editorial-modal p-6', sizes[size])}>
        {title && (
          <div className="flex items-start justify-between mb-4">
            <h2 className="font-serif text-[24px] leading-[1.25]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-ink-400 hover:text-ink-900"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="text-ink-700">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
