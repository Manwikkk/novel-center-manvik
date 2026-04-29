'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export default function Toast({ id, type = 'info', title, message, onDismiss, ttl = 4000 }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss?.(id), ttl);
    return () => clearTimeout(t);
  }, [id, ttl, onDismiss]);

  const Icon = ICONS[type] || Info;
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 bg-cream-100 border border-ink-200/60 rounded-lg shadow-editorial-modal p-4 min-w-[280px] max-w-sm',
        type === 'error' && 'border-danger/50',
        type === 'success' && 'border-gold/60',
      )}
    >
      <Icon size={18} className={cn('mt-0.5', type === 'error' && 'text-danger', type === 'success' && 'text-gold-dim', type === 'info' && 'text-ink-400')} />
      <div className="flex-1 text-[14px] text-ink-700">
        {title && <p className="font-semibold text-ink-900">{title}</p>}
        {message && <p className="mt-0.5">{message}</p>}
      </div>
      <button onClick={() => onDismiss?.(id)} className="text-ink-400 hover:text-ink-900" aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
