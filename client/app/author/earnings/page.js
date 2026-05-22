'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import KpiCard from '@/components/author/KpiCard';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { formatTokens } from '@/lib/format';

function StatusBadge({ status }) {
  const tone =
    status === 'published' ? 'bg-gold text-ink-900'
      : status === 'archived' ? 'bg-surface-container-highest text-on-surface-variant'
      : 'bg-surface-container text-on-surface';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] tracking-labelTight uppercase ${tone}`}>
      {status}
    </span>
  );
}

function EarningsTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="border border-dashed border-surface-variant rounded-md p-10 text-center">
        <p className="label-sm uppercase text-on-surface-variant">No earnings yet</p>
        <p className="mt-2 font-serif text-[20px] text-on-surface">
          Once readers unlock your chapters, your numbers will land here.
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border border-surface-variant rounded-md bg-surface-container-lowest">
      <table className="w-full text-left text-[14px]">
        <thead className="bg-surface-container-low border-b border-surface-variant">
          <tr className="text-on-surface-variant label-sm uppercase">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Chapters</th>
            <th className="px-4 py-3 font-medium text-right">Unlocks</th>
            <th className="px-4 py-3 font-medium text-right">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-surface-variant hover:bg-surface-container-low/50">
              <td className="px-4 py-4">
                <Link
                  href={`/author/books/${r.id}/edit`}
                  className="font-serif text-[16px] text-on-surface hover:underline"
                >
                  {r.title}
                </Link>
                <p className="text-[12px] text-on-surface-variant">/{r.slug}</p>
              </td>
              <td className="px-4 py-4"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-4 text-on-surface text-right">{r.chapterCount}</td>
              <td className="px-4 py-4 text-on-surface text-right">{formatTokens(r.unlocks)}</td>
              <td className="px-4 py-4 text-primary text-right font-serif">{formatTokens(r.tokens)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuthorEarnings() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/author/earnings')
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => {
        if (cancelled) return;
        pushToast({ type: 'error', title: 'Could not load earnings', message: err.message });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pushToast]);

  const totals = data?.totals || {
    lifetimeTokens: 0, monthTokens: 0, uniqueReaders: 0,
    books: 0, chapters: 0, unlocksTotal: 0,
  };

  return (
    <DashboardShell kind="author">
      <DashboardTopbar
        subtitle="Author studio"
        title="Earnings"
      />
      <div className="px-4 md:px-edge py-8 space-y-12">
        <section className="grid sm:grid-cols-3 gap-4">
          <KpiCard
            label="Lifetime tokens"
            value={formatTokens(totals.lifetimeTokens)}
            hint={`${formatTokens(totals.unlocksTotal)} unlocks total`}
          />
          <KpiCard
            label="Last 30 days"
            value={formatTokens(totals.monthTokens)}
            hint="Tokens earned this month"
          />
          <KpiCard
            label="Unique readers"
            value={formatTokens(totals.uniqueReaders)}
            hint={`Across ${formatTokens(totals.books)} books, ${formatTokens(totals.chapters)} chapters`}
          />
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-[24px] text-primary">By book</h2>
            <p className="text-[12px] text-on-surface-variant label-sm uppercase">
              Top performers first
            </p>
          </div>
          {loading ? (
            <div className="border border-surface-variant rounded-md p-6 space-y-4 bg-surface-container-lowest">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columns={5} />
              ))}
            </div>
          ) : (
            <EarningsTable rows={data?.byBook || []} />
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

export default function AuthorEarningsPage() {
  return (
    <AuthGuard roles={['author', 'admin']}>
      <AuthorEarnings />
    </AuthGuard>
  );
}
