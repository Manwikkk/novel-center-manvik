'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export default function CommentForm({ onSubmit, placeholder = 'Share your thoughts…', compact = false }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await onSubmit?.({ body: trimmed });
      setBody('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('w-full')}>
      <textarea
        rows={compact ? 3 : 4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-cream-200/60 border border-ink-200/60 rounded p-3 text-[15px] text-ink-900 placeholder-ink-400 focus:border-ink-900 focus:outline-none"
      />
      <div className="mt-3 flex items-center justify-end gap-3">
        <span className="text-[12px] text-ink-400">{2000 - body.length} characters left</span>
        <Button type="submit" size="sm" disabled={busy || !body.trim()}>
          {busy ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </form>
  );
}
