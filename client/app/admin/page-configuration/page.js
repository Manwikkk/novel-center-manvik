'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

const SECTION_ROWS = [
  { key: 'weekly_book',      label: 'Weekly Book',      hint: 'Hero — left column'   },
  { key: 'meet_webnovel',    label: 'Meet Novel Centre', hint: 'Hero — right column'  },
  { key: 'recommended',      label: 'Recommended',      hint: 'Home feed'            },
  { key: 'continue_reading', label: 'Continue Reading', hint: 'Logged-in users'      },
  { key: 'new_arrivals',     label: 'New Arrivals',     hint: 'Home feed'            },
  { key: 'ranking_novels',   label: 'Ranking Novels',   hint: 'Home feed'            },
  { key: 'updated_today',    label: 'Updated Today',    hint: 'Home feed'            },
  { key: 'completed_novels', label: 'Completed Novels', hint: 'Lower row — left'     },
  { key: 'editors_choice',   label: "Editors' Choice",  hint: 'Lower row — right'    },
  { key: 'gs_originals',     label: 'GS Originals',     hint: 'Home feed'            },
];

function SectionSwitch({ on, disabled, onToggle, id }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        // Track: 52px wide, 30px tall — gives enough room for the knob
        'relative inline-flex h-[30px] w-[52px] shrink-0 cursor-pointer items-center',
        'rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream-100 dark:focus-visible:ring-offset-neutral-900',
        on ? 'bg-ink-900 dark:bg-neutral-200' : 'bg-ink-300 dark:bg-neutral-600',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        aria-hidden
        className={cn(
          // Knob: 22px, sits inside the 30px track (border-2 eats 4px → inner height 26px)
          // Off: translateX(0), On: translateX(22px) = 52 - 4(borders) - 22(knob) - 4(gap) = 22
          'pointer-events-none h-[22px] w-[22px] rounded-full bg-white',
          'shadow-[0_1px_4px_rgba(0,0,0,0.3)] ring-0',
          'transition-transform duration-200 ease-in-out',
          on ? 'translate-x-[22px]' : 'translate-x-0',
        )}
      />
    </button>
  );
}

function Inner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [sections,   setSections]  = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [savingKey,  setSavingKey] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/admin/page-sections')
      .then((d) => { if (!cancelled) setSections(d.pageSections || {}); })
      .catch((err) => {
        if (cancelled) return;
        setSections({});
        pushToast({ type: 'error', title: 'Could not load layout', message: err.message });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pushToast]);

  const toggle = useCallback(
    async (key, next) => {
      if (!sections) return;
      setSavingKey(key);
      const prev = sections[key];
      setSections((s) => ({ ...s, [key]: next }));
      try {
        const d = await api.patch('/admin/page-sections', { [key]: next });
        setSections(d.pageSections || {});
      } catch (err) {
        setSections((s) => ({ ...s, [key]: prev }));
        pushToast({ type: 'error', title: 'Could not update section', message: err.message });
      } finally {
        setSavingKey(null);
      }
    },
    [sections, pushToast],
  );

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar
        subtitle="Administration"
        title="Page configuration"
        actions={(
          <p className="text-[12px] text-on-surface-variant max-w-xs md:max-w-md text-right normal-case tracking-normal font-sans font-normal">
            Toggles control which blocks appear on the public home page.
            Turning off one hero column lets the other span full width.
          </p>
        )}
      />

      <div className="px-4 md:px-edge py-8 space-y-6 max-w-3xl">
        <p className="label-sm uppercase text-on-surface-variant">
          Home page sections
        </p>

        <div className="border border-outline-variant rounded-md divide-y divide-outline-variant overflow-hidden">
          {loading || !sections
            ? SECTION_ROWS.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-4 px-4 py-4 bg-surface-container-lowest"
                >
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-7 w-12 rounded-full shrink-0" />
                </div>
              ))
            : SECTION_ROWS.map((row) => {
                const on = sections[row.key] !== false;
                return (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-4 px-4 py-4 bg-surface-container-lowest hover:bg-surface-container-low/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <label
                        htmlFor={`sec-${row.key}`}
                        className="font-serif text-[16px] text-on-surface cursor-pointer"
                      >
                        {row.label}
                      </label>
                      <p className="mt-0.5 text-[12px] text-on-surface-variant normal-case tracking-normal font-sans font-normal">
                        {row.hint}
                      </p>
                    </div>
                    <SectionSwitch
                      id={`sec-${row.key}`}
                      on={on}
                      disabled={savingKey === row.key}
                      onToggle={() => toggle(row.key, !on)}
                    />
                  </div>
                );
              })}
        </div>
      </div>
    </DashboardShell>
  );
}

export default function AdminPageConfigurationPage() {
  return (
    <AdminPageGuard permission="page_configuration">
      <Inner />
    </AdminPageGuard>
  );
}