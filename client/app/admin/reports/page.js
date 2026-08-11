'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import ReportPreviewPanel from '@/components/admin/reports/ReportPreviewPanel';
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

function initSelections(report) {
  const selectedTabs = new Set((report?.tabs || []).map((t) => t.id));
  const selectedFields = {};
  for (const tab of report?.tabs || []) {
    selectedFields[tab.id] = new Set(tab.fields.map((f) => f.id));
  }
  return { selectedTabs, selectedFields };
}

function buildQuery(from, to, report, selectedTabs, selectedFields) {
  const query = { from, to };
  const allTabs = report.tabs.every((t) => selectedTabs.has(t.id));
  if (!allTabs) query.tabs = [...selectedTabs].join(',');

  const fieldsObj = {};
  for (const tab of report.tabs) {
    if (!selectedTabs.has(tab.id)) continue;
    const set = selectedFields[tab.id];
    if (set?.size && set.size < tab.fields.length) {
      fieldsObj[tab.id] = [...set];
    }
  }
  if (Object.keys(fieldsObj).length) query.fields = JSON.stringify(fieldsObj);
  return query;
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
  const [reportId, setReportId] = useState('');
  const [selectedTabs, setSelectedTabs] = useState(() => new Set());
  const [selectedFields, setSelectedFields] = useState({});
  const [expandedTab, setExpandedTab] = useState(null);
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const report = useMemo(() => items.find((r) => r.id === reportId) || null, [items, reportId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/admin/reports')
      .then((d) => {
        if (cancelled) return;
        const list = d.items || [];
        setItems(list);
        if (list.length) setReportId((prev) => prev || list[0].id);
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          pushToast({ type: 'error', title: 'Could not load reports', message: err.message });
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pushToast]);

  useEffect(() => {
    if (!report) return;
    const { selectedTabs: tabs, selectedFields: fields } = initSelections(report);
    setSelectedTabs(tabs);
    setSelectedFields(fields);
    setExpandedTab(null);
  }, [report]);

  const queryKey = useMemo(() => {
    if (!report || !from || !to) return '';
    return JSON.stringify(buildQuery(from, to, report, selectedTabs, selectedFields));
  }, [report, from, to, selectedTabs, selectedFields]);

  useEffect(() => {
    if (!canGenerate || !report || !from || !to || !queryKey) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError(null);
      const query = JSON.parse(queryKey);
      api.get(`/admin/reports/${report.id}/preview`, { query })
        .then((data) => { if (!cancelled) setPreview(data); })
        .catch((err) => {
          if (!cancelled) {
            setPreview(null);
            setPreviewError(err.message || 'Preview unavailable');
          }
        })
        .finally(() => { if (!cancelled) setPreviewLoading(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [canGenerate, report, from, to, queryKey]);

  const toggleTab = useCallback((tabId) => {
    setSelectedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  }, []);

  const toggleField = useCallback((tabId, fieldId) => {
    setSelectedFields((prev) => {
      const next = { ...prev };
      const set = new Set(next[tabId] || []);
      if (set.has(fieldId)) set.delete(fieldId);
      else set.add(fieldId);
      next[tabId] = set;
      return next;
    });
  }, []);

  async function handleDownload(format) {
    if (!canGenerate || downloading || !report) return;
    if (!from || !to) {
      pushToast({ type: 'error', title: 'Date range required', message: 'Choose From and To dates.' });
      return;
    }
    if (!selectedTabs.size) {
      pushToast({ type: 'error', title: 'No sections selected', message: 'Select at least one section.' });
      return;
    }

    setDownloading(format);
    try {
      const query = buildQuery(from, to, report, selectedTabs, selectedFields);
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const path = `/admin/reports/${report.id}/export/${ext}`;
      const fallbackFilename = `${report.id}-report_${from}_to_${to}.${ext}`;
      const { blob, filename } = await api.downloadBlob(path, { query, fallbackFilename });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith(`.${ext}`) ? filename : fallbackFilename;
      a.click();
      URL.revokeObjectURL(url);
      pushToast({
        type: 'success',
        title: format === 'pdf' ? 'PDF ready' : 'Excel ready',
        message: `${report.title} downloaded.`,
      });
    } catch (err) {
      pushToast({ type: 'error', title: 'Download failed', message: err.message });
    } finally {
      setDownloading(null);
    }
  }

  const dataTabs = report?.tabs?.filter((t) => t.kind !== 'kv') || [];

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Administration" title="Reports" />
      <div className="px-4 md:px-edge py-8 max-w-[1280px] mx-auto space-y-6">
        {loading ? (
          <p className="text-sm text-on-surface-variant">Loading…</p>
        ) : (
          <>
            {/* Filters — full width on top */}
            <section className="rounded-xl border border-outline-variant dark:border-neutral-800 bg-surface dark:bg-neutral-950 p-4 md:p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto] gap-4 lg:gap-3 lg:items-end">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant mb-1.5">
                    Report
                  </label>
                  <select
                    value={reportId}
                    onChange={(e) => setReportId(e.target.value)}
                    className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2.5 text-sm dark:bg-neutral-900 dark:border-neutral-700"
                  >
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                  {report ? (
                    <p className="mt-1.5 text-[12px] text-on-surface-variant dark:text-neutral-500">
                      {report.description}
                    </p>
                  ) : null}
                </div>

                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-on-surface-variant">
                  From
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                    className="rounded-md border border-outline-variant px-3 py-2.5 text-sm dark:bg-neutral-900 dark:border-neutral-700" />
                </label>

                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-on-surface-variant">
                  To
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                    className="rounded-md border border-outline-variant px-3 py-2.5 text-sm dark:bg-neutral-900 dark:border-neutral-700" />
                </label>

                {canGenerate ? (
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      disabled={Boolean(downloading) || !selectedTabs.size}
                      onClick={() => handleDownload('pdf')}
                      className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 bg-primary text-on-primary text-[11px] font-semibold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                    >
                      <Icon name="picture_as_pdf" size={16} />
                      {downloading === 'pdf' ? 'PDF…' : 'Export PDF'}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(downloading) || !selectedTabs.size}
                      onClick={() => handleDownload('xlsx')}
                      className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 border border-outline-variant dark:border-neutral-700 text-[11px] font-semibold uppercase tracking-widest hover:bg-surface-container/50 disabled:opacity-50 whitespace-nowrap"
                    >
                      <Icon name="table" size={16} />
                      {downloading === 'xlsx' ? 'Excel…' : 'Export Excel'}
                    </button>
                  </div>
                ) : null}
              </div>

              {report ? (
                <div className="pt-3 border-t border-outline-variant/50 dark:border-neutral-800 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant mr-1">
                      Sections
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTabs(new Set(report.tabs.map((t) => t.id)))}
                      className="text-[10px] text-primary uppercase tracking-wider hover:underline"
                    >
                      All
                    </button>
                    <span className="text-on-surface-variant/30">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTabs(new Set())}
                      className="text-[10px] text-on-surface-variant uppercase tracking-wider hover:underline"
                    >
                      Clear
                    </button>
                    {dataTabs.length ? (
                      <>
                        <span className="text-on-surface-variant/30">|</span>
                        <button
                          type="button"
                          onClick={() => setShowColumnFilters((v) => !v)}
                          className="text-[10px] text-on-surface-variant uppercase tracking-wider hover:underline inline-flex items-center gap-1"
                        >
                          Column filters
                          <Icon name={showColumnFilters ? 'expand_less' : 'expand_more'} size={14} />
                        </button>
                      </>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {report.tabs.map((tab) => {
                      const on = selectedTabs.has(tab.id);
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => toggleTab(tab.id)}
                          className={cn(
                            'rounded-full px-3 py-1 text-[11px] font-medium border transition-colors',
                            on
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-transparent text-on-surface-variant border-outline-variant dark:border-neutral-700 hover:border-primary/50',
                          )}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {showColumnFilters && dataTabs.length ? (
                    <div className="rounded-lg border border-outline-variant/50 dark:border-neutral-800 p-3 bg-surface-container/20 dark:bg-neutral-900/30">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {dataTabs.filter((t) => selectedTabs.has(t.id)).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setExpandedTab(expandedTab === tab.id ? null : tab.id)}
                            className={cn(
                              'rounded-md px-2.5 py-1 text-[11px] border',
                              expandedTab === tab.id
                                ? 'border-primary text-primary bg-primary/10'
                                : 'border-outline-variant dark:border-neutral-700 text-on-surface-variant',
                            )}
                          >
                            {tab.label} ({(selectedFields[tab.id]?.size || 0)}/{tab.fields.length})
                          </button>
                        ))}
                      </div>
                      {expandedTab && selectedTabs.has(expandedTab) ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 max-h-32 overflow-y-auto">
                          {(report.tabs.find((t) => t.id === expandedTab)?.fields || []).map((field) => (
                            <label key={field.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedFields[expandedTab]?.has(field.id)}
                                onChange={() => toggleField(expandedTab, field.id)}
                                className="rounded accent-primary"
                              />
                              <span className="text-on-surface-variant dark:text-neutral-400 truncate">{field.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-on-surface-variant">Select a section above to filter columns.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            {/* Preview — full width below */}
            <ReportPreviewPanel data={preview} loading={previewLoading} error={previewError} />
          </>
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
