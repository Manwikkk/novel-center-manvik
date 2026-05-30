'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import DashboardSiteHomeLink from '@/components/layout/DashboardSiteHomeLink';
import { cn } from '@/lib/cn';

export default function AuthorDashboardHeader({ activeTab = 'dashboard', onTabChange }) {
  const [supportOpen, setSupportOpen] = useState(false);
  const supportRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (supportRef.current && !supportRef.current.contains(e.target)) {
        setSupportOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 mb-5">
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-semibold text-on-surface">Dashboard</h1>
        <div className="flex items-center gap-1 rounded-lg border border-surface-variant p-0.5 bg-surface-container">
          <button
            type="button"
            onClick={() => onTabChange?.('dashboard')}
            className={cn(
              'px-4 py-1.5 rounded-md text-[12px] font-semibold uppercase tracking-wider transition-colors',
              activeTab === 'dashboard'
                ? 'bg-surface-container-high text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => onTabChange?.('stories')}
            className={cn(
              'px-4 py-1.5 rounded-md text-[12px] font-semibold uppercase tracking-wider transition-colors',
              activeTab === 'stories'
                ? 'bg-surface-container-high text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            Stories
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DashboardSiteHomeLink variant="topbar" />
        <div className="relative" ref={supportRef}>
        <button
          type="button"
          onClick={() => setSupportOpen((o) => !o)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-variant text-[12px] font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
        >
          Support
          <ChevronDown size={14} className={cn('transition-transform', supportOpen && 'rotate-180')} />
        </button>
        {supportOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-surface-variant bg-surface-container-lowest shadow-lg py-1 z-20">
            <a href="/about" className="block px-4 py-2.5 text-[13px] text-on-surface hover:bg-surface-container">
              Help centre
            </a>
            <a href="mailto:support@novelcentre.com" className="block px-4 py-2.5 text-[13px] text-on-surface hover:bg-surface-container">
              Contact support
            </a>
            <a href="/author/settings" className="block px-4 py-2.5 text-[13px] text-on-surface hover:bg-surface-container">
              Account settings
            </a>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
