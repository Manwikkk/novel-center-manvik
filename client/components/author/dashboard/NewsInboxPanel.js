'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export const DUMMY_NEWS = [
  { id: '1', title: 'Do not use AI to edit your contract application!', date: '15 Jul 2025' },
  { id: '2', title: 'April 2026 platform update — scheduled maintenance window', date: '10 Jul 2025' },
  { id: '3', title: 'New monetization tools for paid chapters are rolling out', date: '3 Jul 2025' },
  { id: '4', title: 'Community guidelines refresh for discussion threads', date: '28 Jun 2025' },
  { id: '5', title: 'Featured spotlight: how to pitch your synopsis', date: '20 Jun 2025' },
];

export const DUMMY_INBOX = [
  { id: '1', title: 'Your chapter "The Crossing" was approved', date: 'Today' },
  { id: '2', title: 'Reader left a 5-star review on The Glass Orchard', date: 'Yesterday' },
  { id: '3', title: 'Reminder: complete your author profile', date: '2 days ago' },
];

export default function NewsInboxPanel({ className }) {
  const [tab, setTab] = useState('news');
  const items = tab === 'news' ? DUMMY_NEWS : DUMMY_INBOX;

  return (
    <div
      className={cn(
        'rounded-xl border border-surface-variant bg-surface-container-lowest overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-surface-variant px-5 pt-4">
        <div className="flex gap-6">
          {[
            { id: 'news', label: 'News' },
            { id: 'inbox', label: 'Inbox' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'pb-3 text-[12px] font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px',
                tab === t.id
                  ? 'text-studio-accent border-studio-accent'
                  : 'text-on-surface-variant border-transparent hover:text-on-surface',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <a
          href="#"
          className="pb-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant hover:text-studio-accent flex items-center gap-0.5"
        >
          See all <ChevronRight size={12} />
        </a>
      </div>

      <ul className="divide-y divide-surface-variant">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-surface-container/50 transition-colors"
            >
              <span className="text-[14px] text-on-surface leading-snug flex-1">{item.title}</span>
              <span className="text-[12px] text-on-surface-variant shrink-0 whitespace-nowrap">{item.date}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
