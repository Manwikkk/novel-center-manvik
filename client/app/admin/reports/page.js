'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import Icon from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { hasAdminCapability } from '@/lib/adminPermissions';
import { cn } from '@/lib/cn';

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function Inner() {
  const user = useAuthStore((s) => s.user);
  const canGenerate = hasAdminCapability(user, 'transactions.reports');
  const pushToast = useUiStore((s) => s.pushToast);
  const initial = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/admin/reports')
      .then((d) => {
        if (!cancelled) setItems(d.items || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          pushToast({ type: 'error', title: 'Could not load reports', message: err.message });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [pushToast]);

  async function handleDownload(reportId, title) {
    if (!canGenerate || downloading) return;
    if (!from || !to) {
      pushToast({ type: 'error', title: 'Date range required', message: 'Choose From and To dates.' });
      return;
    }
    setDownloading(reportId);
    try {
      const { blob, filename } = await api.downloadBlob(`/admin/reports/${reportId}`, {
        query: { from, to },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${reportId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast({
        type: 'success',
        title: 'Report ready',
        message: `${title} downloaded for ${from} → ${to}.`,
      });
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Download failed',
        message: err.message || 'Could not generate the report.',
      });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Administration" title="Reports" />
      <div className="px-4 md:px-edge py-8 space-y-8 max-w-[1280px]">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-sm text-on-surface-variant dark:text-neutral-400 max-w-2xl">
              Generate multi-tab Excel reports matching the finance templates. Pick a date range,
              then download any report below.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[11px] uppercase tracking-widest text-on-surface-variant">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface dark:bg-neutral-900 dark:border-neutral-700"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] uppercase tracking-widest text-on-surface-variant">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface dark:bg-neutral-900 dark:border-neutral-700"
              />
            </label>
          </div>
        </div>

        {!canGenerate ? (
          <p className="text-sm text-on-surface-variant">
            You can view this page, but generating downloads requires the finance reports capability.
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-on-surface-variant">Loading report catalog…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((report) => {
              const busy = downloading === report.id;
              return (
                <article
                  key={report.id}
                  className="rounded-xl border border-outline-variant dark:border-neutral-800 bg-surface dark:bg-neutral-950 p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[15px] text-on-surface dark:text-neutral-100">
                        {report.title}
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-on-surface-variant dark:text-neutral-400">
                        {report.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                      {report.status || 'ready'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(report.tabs || []).slice(0, 6).map((tab) => (
                      <span
                        key={tab}
                        className="rounded-md border border-outline-variant/70 dark:border-neutral-800 px-2 py-0.5 text-[10px] text-on-surface-variant"
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!canGenerate || busy || Boolean(downloading)}
                    onClick={() => handleDownload(report.id, report.title)}
                    className={cn(
                      'mt-auto inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5',
                      'bg-primary text-on-primary font-ui-label-sm text-ui-label-sm uppercase tracking-widest',
                      'hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    <Icon name="download" size={16} />
                    {busy ? 'Generating…' : 'Generate & Download'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default function AdminReportsPage() {
  return (
    <AdminPageGuard permission="reports">
      <Inner />
    </AdminPageGuard>
  );
}
