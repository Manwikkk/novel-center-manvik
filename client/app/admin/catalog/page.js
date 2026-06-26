'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

const TABS = [
  { id: 'categories', label: 'Categories', path: 'categories', keyField: 'slug' },
  { id: 'languages', label: 'Languages', path: 'languages', keyField: 'code' },
  { id: 'tags', label: 'Content tags', path: 'content-tags', keyField: 'slug' },
];

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-md border transition-colors',
        active
          ? 'bg-ink-900 text-cream-100 border-ink-900 dark:bg-neutral-100 dark:text-ink-900 dark:border-neutral-100'
          : 'border-ink-200 text-ink-600 hover:border-ink-400 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500',
      )}
    >
      {children}
    </button>
  );
}

function Inner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState('categories');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ label: '', slug: '', code: '', sortOrder: '0', isActive: true });

  const cfg = TABS.find((t) => t.id === tab) || TABS[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/admin/catalog/${cfg.path}`);
      setItems(data.items || []);
    } catch (err) {
      setItems([]);
      pushToast({ type: 'error', title: 'Load failed', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [cfg.path, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setDraft({ label: '', slug: '', code: '', sortOrder: '0', isActive: true });
  }, [tab]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!draft.label.trim()) return;
    setSaving(true);
    try {
      const body =
        tab === 'languages'
          ? {
              code: draft.code.trim(),
              label: draft.label.trim(),
              sortOrder: Number(draft.sortOrder) || 0,
              isActive: draft.isActive,
            }
          : {
              label: draft.label.trim(),
              slug: draft.slug.trim() || undefined,
              sortOrder: Number(draft.sortOrder) || 0,
              isActive: draft.isActive,
            };
      await api.post(`/admin/catalog/${cfg.path}`, body);
      pushToast({ type: 'success', title: 'Created' });
      setDraft({ label: '', slug: '', code: '', sortOrder: '0', isActive: true });
      await load();
    } catch (err) {
      pushToast({ type: 'error', title: 'Create failed', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row) {
    const path = cfg.path;
    const patch =
      tab === 'languages'
        ? { isActive: !row.isActive, code: row.code, label: row.label, sortOrder: row.sortOrder }
        : { isActive: !row.isActive, label: row.label, slug: row.slug, sortOrder: row.sortOrder };
    try {
      await api.patch(`/admin/catalog/${path}/${row.id}`, patch);
      await load();
    } catch (err) {
      pushToast({ type: 'error', title: 'Update failed', message: err.message });
    }
  }

  async function handleDelete(row) {
    const label = row.label || row.code;
    if (!window.confirm(`Delete “${label}”? This cannot be undone if unused.`)) return;
    try {
      await api.delete(`/admin/catalog/${cfg.path}/${row.id}`);
      pushToast({ type: 'success', title: 'Deleted' });
      await load();
    } catch (err) {
      pushToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  }

  return (
    <DashboardShell kind="admin">
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-edge max-w-[1100px] mx-auto w-full">
          <DashboardTopbar title="Catalog" subtitle="Categories, languages, and author-facing content tags." />

          <div className="mt-8 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label}
              </TabButton>
            ))}
          </div>

          <form
            onSubmit={handleCreate}
            className="mt-10 rounded-xl border border-ink-200/70 bg-cream-50/50 p-6 dark:border-neutral-800 dark:bg-neutral-950/50 space-y-4"
          >
            <p className="font-serif text-lg text-ink-900 dark:text-neutral-100">Add {cfg.label.slice(0, -1)}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {tab === 'languages' ? (
                <TextInput
                  label="Code"
                  variant="dashboard"
                  value={draft.code}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                  placeholder="en"
                  required
                />
              ) : (
                <TextInput
                  label="Slug (optional)"
                  variant="dashboard"
                  value={draft.slug}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                  placeholder="auto from label"
                />
              )}
              <TextInput
                label="Label"
                variant="dashboard"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                required
              />
              <TextInput
                label="Sort order"
                variant="dashboard"
                value={draft.sortOrder}
                onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-[13px] text-ink-700 dark:text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-ink-300 accent-ink-900 dark:border-neutral-600"
                />
                Active
              </label>
            </div>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? 'Saving…' : 'Add'}
            </Button>
          </form>

          <div className="mt-12 overflow-x-auto rounded-xl border border-ink-200/70 dark:border-neutral-800">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-cream-100/80 dark:bg-neutral-900/80 uppercase tracking-widest text-[11px] text-ink-500 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Label</th>
                  <th className="px-4 py-3 font-bold">{tab === 'languages' ? 'Code' : 'Slug'}</th>
                  <th className="px-4 py-3 font-bold">Sort</th>
                  <th className="px-4 py-3 font-bold">Active</th>
                  <th className="px-4 py-3 font-bold">Books</th>
                  <th className="px-4 py-3 font-bold w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200/60 dark:divide-neutral-800 text-ink-800 dark:text-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
                      No rows yet.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="hover:bg-cream-100/40 dark:hover:bg-neutral-900/40">
                      <td className="px-4 py-3 font-medium">{row.label}</td>
                      <td className="px-4 py-3 text-ink-500 dark:text-neutral-400 font-mono text-[12px]">
                        {tab === 'languages' ? row.code : row.slug}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.sortOrder}</td>
                      <td className="px-4 py-3">{row.isActive ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 tabular-nums">{row.bookCount ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleActive(row)}
                            className="text-[11px] uppercase tracking-widest font-bold text-ink-600 hover:text-ink-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                          >
                            {row.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="text-[11px] uppercase tracking-widest font-bold text-danger hover:opacity-80"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-[12px] text-ink-400 dark:text-neutral-500 max-w-2xl">
            Categories and languages power the dropdowns in Author Studio. Content tags are separate from home-page
            section tags (<code className="font-mono text-[11px]">book_tags</code>) and are meant for discovery labels
            like “slow burn” or “dual POV”.
          </p>
        </div>
      </main>
    </DashboardShell>
  );
}

export default function AdminCatalogPage() {
  return (
    <AdminPageGuard permission="catalog">
      <Inner />
    </AdminPageGuard>
  );
}
