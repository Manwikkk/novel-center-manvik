'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardSiteHomeLink from '@/components/layout/DashboardSiteHomeLink';
import Icon from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { formatTokens } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { hasAdminCapability, hasAdminPermission } from '@/lib/adminPermissions';

/**
 * Admin Panel — pixel-aligned with Stitch admin_panel.html.
 *
 * Layout (inside DashboardShell with AdminSidebar):
 *   • Page header: "System Overview" + lede, plus Export Report CTA.
 *   • 4-up stats bento: Active Users, Total Revenue, then a 2-col
 *     featured Pending Moderation card on inverse-surface (warm dark).
 *   • Two-column grid:
 *       – Recent Transactions table (2/3)
 *       – Moderation Queue list with severity-coloured headers (1/3)
 */

function AdminOverview() {
  const user = useAuthStore((s) => s.user);
  const canExportReports = hasAdminCapability(user, 'transactions.reports')
    && hasAdminPermission(user, 'reports');
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/admin/stats').catch(() => null),
      api.get('/admin/transactions', { query: { pageSize: 6 } }).catch(() => ({ items: [] })),
      api.get('/admin/comments', { query: { status: 'pending', pageSize: 6 } })
        .catch(() => api.get('/admin/comments', { query: { pageSize: 6 } }).catch(() => ({ items: [] }))),
    ]).then(([s, t, c]) => {
      if (cancelled) return;
      setStats(s);
      setTransactions(t.items || []);
      setComments(c.items || []);
    });
    return () => { cancelled = true; };
  }, []);

  const pendingCount = comments.length;

  return (
    <DashboardShell kind="admin">
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-edge max-w-[1280px] mx-auto w-full">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 gap-6">
            <div>
              <h2 className="font-headline-xl text-headline-xl text-on-surface dark:text-neutral-100 mb-2">
                System Overview
              </h2>
              <p className="font-ui-label-lg text-ui-label-lg text-on-surface-variant dark:text-neutral-400">
                Real-time metrics and alerts for Novel Centre.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 self-start">
              <DashboardSiteHomeLink variant="topbar" />
              {canExportReports && (
                <Link
                  href="/admin/reports"
                  className="bg-primary text-on-primary font-ui-label-sm text-ui-label-sm px-6 py-3 rounded uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center gap-2"
                >
                  <Icon name="assessment" size={16} />
                  Export Report
                </Link>
              )}
            </div>
          </div>

          {/* STATS BENTO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-16">
            <StatCard
              label="Active Users"
              icon="group"
              value={formatTokens(stats?.users ?? 0)}
              delta={`${stats?.authors ?? 0} authors`}
            />
            <StatCard
              label="Tokens Spent"
              icon="payments"
              value={formatTokens(stats?.tokensSpent ?? 0)}
              delta={`${formatTokens(stats?.tokensPurchased ?? 0)} purchased`}
            />
            <FeaturedStatCard
              label="Pending Moderation"
              value={pendingCount.toString()}
              hint={pendingCount > 0
                ? `Requires immediate review. ${comments.filter((c) => c.status === 'pending').length} flagged for severe violations.`
                : 'No pending items at this time.'}
              href="/admin/comments"
            />
          </div>

          {/* TWO COL */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-16">
            <TransactionsCard transactions={transactions} />
            <ModerationQueueCard comments={comments} />
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}

function StatCard({ label, icon, value, delta }) {
  return (
    <div className="bg-surface-container-lowest border border-surface-variant p-6 rounded-lg flex flex-col justify-between min-h-[180px]">
      <div className="flex justify-between items-start mb-4">
        <span className="font-ui-label-sm text-ui-label-sm text-on-surface-variant uppercase tracking-widest">
          {label}
        </span>
        <Icon name={icon} size={20} className="text-secondary" />
      </div>
      <div>
        <div className="font-display-lg text-[36px] md:text-display-lg text-on-surface leading-none">
          {value}
        </div>
        <div className="font-ui-label-sm text-ui-label-sm text-outline mt-2 flex items-center gap-1">
          <Icon name="arrow_upward" size={14} className="text-on-surface" />
          {delta}
        </div>
      </div>
    </div>
  );
}

function FeaturedStatCard({ label, value, hint, href }) {
  return (
    <div className="bg-inverse-surface text-inverse-on-surface p-6 rounded-lg col-span-1 md:col-span-2 flex flex-col justify-between relative overflow-hidden min-h-[180px]">
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <span className="font-ui-label-sm text-ui-label-sm text-inverse-primary uppercase tracking-widest">
            {label}
          </span>
          <Icon name="warning" size={20} className="text-inverse-primary" />
        </div>
        <div className="font-display-lg text-[40px] md:text-display-lg leading-none">{value}</div>
        <div className="font-ui-label-sm text-ui-label-sm mt-2 text-inverse-primary max-w-md">
          {hint}
        </div>
        <Link
          href={href}
          className="mt-6 inline-block border border-inverse-primary text-inverse-primary font-ui-label-sm text-ui-label-sm px-4 py-2 rounded uppercase tracking-widest hover:bg-inverse-primary hover:text-inverse-surface transition-colors"
        >
          Review Queue
        </Link>
      </div>
      <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-tl from-on-surface-variant to-transparent opacity-20 rounded-tl-full pointer-events-none" />
    </div>
  );
}

function TransactionsCard({ transactions }) {
  return (
    <div className="lg:col-span-2 bg-surface-container-lowest border border-surface-variant rounded-lg overflow-hidden">
      <div className="p-6 border-b border-surface-variant flex justify-between items-center bg-surface-container-low">
        <h3 className="font-headline-md text-[20px] text-on-surface">Recent Transactions</h3>
        <Link
          href="/admin/transactions"
          className="font-ui-label-sm text-ui-label-sm text-secondary hover:text-on-surface uppercase underline tracking-widest"
        >
          View All
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container text-on-surface-variant font-ui-label-sm text-ui-label-sm uppercase tracking-widest border-b border-surface-variant">
              <th className="p-4 font-medium">Transaction</th>
              <th className="p-4 font-medium">User</th>
              <th className="p-4 font-medium">Amount</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="font-ui-label-lg text-sm divide-y divide-surface-variant">
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                  No recent transactions.
                </td>
              </tr>
            )}
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-surface-container-low transition-colors">
                <td className="p-4 text-on-surface font-mono text-xs">
                  TXN-{String(t.id).padStart(6, '0')}
                </td>
                <td className="p-4 text-on-surface truncate max-w-[180px]">
                  {t.userName || t.userEmail}
                </td>
                <td className={`p-4 ${t.tokensDelta < 0 ? 'text-error' : 'text-on-surface'}`}>
                  {t.tokensDelta > 0 ? '+' : ''}
                  {formatTokens(t.tokensDelta)} tokens
                </td>
                <td className="p-4">
                  <TxTypePill type={t.type} />
                </td>
                <td className="p-4 text-outline font-ui-label-sm text-ui-label-sm whitespace-nowrap">
                  {formatRelative(t.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TxTypePill({ type }) {
  const m = {
    purchase:     { label: 'Purchase',  cls: 'bg-surface-variant text-on-surface-variant' },
    unlock:       { label: 'Unlock',    cls: 'bg-surface-variant text-on-surface-variant' },
    admin_adjust: { label: 'Adjust',    cls: 'bg-tertiary-fixed/40 text-tertiary-container' },
    refund:       { label: 'Refund',    cls: 'bg-error-container text-on-error-container' },
  }[type] || { label: type, cls: 'bg-surface-variant text-on-surface-variant' };
  return <span className={`px-2 py-1 rounded text-xs ${m.cls}`}>{m.label}</span>;
}

function ModerationQueueCard({ comments }) {
  return (
    <div className="lg:col-span-1 bg-surface-container-lowest border border-surface-variant rounded-lg flex flex-col">
      <div className="p-6 border-b border-surface-variant bg-surface-container-low">
        <h3 className="font-headline-md text-[20px] text-on-surface">Moderation Queue</h3>
        <p className="font-ui-label-sm text-ui-label-sm text-on-surface-variant mt-1">
          High priority alerts
        </p>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-surface-variant">
        {comments.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant text-sm">
            No flagged content.
          </div>
        )}
        {comments.map((c, i) => (
          <div key={c.id} className="p-4 hover:bg-surface-container-low transition-colors">
            <div className="flex justify-between items-start mb-2 gap-2">
              <span className={`font-ui-label-sm text-ui-label-sm font-bold uppercase tracking-widest ${
                i === 0 ? 'text-error' : 'text-on-surface-variant'
              }`}>
                {c.status === 'pending' ? 'Pending Review' : c.status}
              </span>
              <span className="font-ui-label-sm text-ui-label-sm text-outline whitespace-nowrap">
                {formatRelative(c.createdAt)}
              </span>
            </div>
            <p className="font-reading-body text-sm text-on-surface mb-3 line-clamp-2">
              <span className="font-semibold">{c.author?.displayName || 'User'}: </span>
              {(c.body || 'Comment removed.').slice(0, 160)}
            </p>
            <div className="flex gap-2">
              <Link
                href={`/admin/comments`}
                className="flex-1 bg-primary text-on-primary font-ui-label-sm text-ui-label-sm py-2 rounded uppercase tracking-widest text-xs text-center"
              >
                Review
              </Link>
              <button
                type="button"
                className="px-3 border border-outline text-on-surface rounded hover:bg-surface-variant flex items-center justify-center"
                aria-label="More"
              >
                <Icon name="more_horiz" size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AdminPage() {
  return (
    <AdminPageGuard permission="dashboard">
      <AdminOverview />
    </AdminPageGuard>
  );
}
