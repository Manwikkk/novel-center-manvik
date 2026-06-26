'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import AdminAuditLog from '@/components/admin/AdminAuditLog';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/cn';

const TABS = [
  { key: 'suspension', label: 'Suspension' },
  { key: 'audit', label: 'Audit log', adminOnly: true },
];

function Inner() {
  const pushToast = useUiStore((s) => s.pushToast);
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('suspension');
  const [temporaryBanDays, setTemporaryBanDays] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isSuperAdmin);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/settings');
      setTemporaryBanDays(String(data.settings?.temporaryBanDays ?? 5));
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not load settings', message: err.message });
      setTemporaryBanDays('5');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault();
    const days = Number(temporaryBanDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      pushToast({ type: 'error', title: 'Enter a whole number between 1 and 365' });
      return;
    }
    setSaving(true);
    try {
      const data = await api.patch('/admin/settings', { temporaryBanDays: days });
      setTemporaryBanDays(String(data.settings?.temporaryBanDays ?? days));
      pushToast({ type: 'success', title: 'Settings saved' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not save settings', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Administration" title="Settings" />
      <div className="px-4 md:px-edge py-8 max-w-4xl space-y-8">
        <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-1">
          {visibleTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'px-4 py-2 text-[12px] uppercase tracking-widest border-b-2 -mb-px transition-colors',
                tab === item.key
                  ? 'border-on-surface text-on-surface'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'suspension' && (
          <section className="border border-outline-variant rounded-md p-6 space-y-5">
            <div>
              <h2 className="font-serif text-[20px] text-on-surface normal-case tracking-tight">
                Suspension defaults
              </h2>
              <p className="mt-2 text-[14px] text-on-surface-variant normal-case tracking-normal font-sans">
                Configure how long temporary suspensions last when an admin chooses a temporary ban.
              </p>
            </div>

            {loading ? (
              <Skeleton className="h-12 w-full max-w-xs" />
            ) : (
              <form onSubmit={save} className="space-y-4">
                <div>
                  <label
                    htmlFor="temporary-ban-days"
                    className="block text-[12px] text-on-surface-variant label-sm uppercase mb-2"
                  >
                    Temporary ban duration (days)
                  </label>
                  <input
                    id="temporary-ban-days"
                    type="number"
                    min={1}
                    max={365}
                    step={1}
                    required
                    disabled={!isSuperAdmin || saving}
                    value={temporaryBanDays}
                    onChange={(e) => setTemporaryBanDays(e.target.value)}
                    className="w-full max-w-xs bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 text-[18px] text-on-surface disabled:opacity-60"
                  />
                </div>

                {isSuperAdmin ? (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-md bg-on-surface text-surface text-[12px] uppercase tracking-widest disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950"
                  >
                    {saving ? 'Saving…' : 'Save settings'}
                  </button>
                ) : (
                  <p className="text-[13px] text-on-surface-variant normal-case tracking-normal font-sans">
                    Only the super admin can change these settings.
                  </p>
                )}
              </form>
            )}
          </section>
        )}

        {tab === 'audit' && isSuperAdmin && (
          <section className="border border-outline-variant rounded-md p-6">
            <h2 className="font-serif text-[20px] text-on-surface normal-case tracking-tight mb-4">
              Staff audit log
            </h2>
            <AdminAuditLog />
          </section>
        )}
      </div>
    </DashboardShell>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminPageGuard permission="users">
      <Inner />
    </AdminPageGuard>
  );
}
