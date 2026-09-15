'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminPageGuard from '@/components/layout/AdminPageGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import CommentsModeration from '@/components/admin/CommentsModeration';
import ModerationQueue from '@/components/admin/ModerationQueue';
import Chip from '@/components/ui/Chip';
import Icon from '@/components/ui/Icon';
import Pagination from '@/components/ui/Pagination';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/uiStore';
import { formatRelative } from '@/lib/format';

const STATUS_FILTERS = [
  { id: 'all',     label: 'All' },
  { id: 'visible', label: 'Visible' },
  { id: 'hidden',  label: 'Hidden' },
  { id: 'deleted', label: 'Deleted' },
];

const PAGE_SIZE = 20;

const QUEUE_KINDS = [
  { id: 'all', label: 'All reports' },
  { id: 'comment', label: 'Comments' },
  { id: 'review', label: 'Reviews' },
  { id: 'book', label: 'Novels' },
];

const QUEUE_STATUSES = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
];

function buildQuery(updates, current) {
  const next = new URLSearchParams(current?.toString() || '');
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined || v === null || v === '') next.delete(k);
    else next.set(k, String(v));
  }
  return next;
}

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pushToast = useUiStore((s) => s.pushToast);

  const bookId    = searchParams.get('bookId') || '';
  const chapterId = searchParams.get('chapterId');
  const status    = searchParams.get('status') || 'all';
  const order     = searchParams.get('order')  || 'asc';
  const page      = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const view      = searchParams.get('view') || '';
  const queueKind   = searchParams.get('kind') || 'all';
  const queueStatus = searchParams.get('rstatus') || 'open';

  // Reported content is the default view; the per-book browser lives under ?view=all.
  const showQueue = !bookId && view !== 'all';
  const level = !bookId ? 1 : chapterId === null ? 2 : 3;

  const [names, setNames] = useState({ bookTitle: '', chapterTitle: '' });

  const setQuery = useCallback((updates) => {
    const next = buildQuery(updates, searchParams);
    const qs = next.toString();
    router.push(qs ? `/admin/comments?${qs}` : '/admin/comments');
  }, [router, searchParams]);

  const setStatus = (s) => setQuery({ status: s === 'all' ? '' : s, page: '' });
  const setOrder  = (o) => setQuery({ order: o === 'asc' ? '' : o, page: '' });
  const setPage   = (p) => setQuery({ page: p > 1 ? p : '' });

  const goQueue  = () => router.push('/admin/comments');
  const goLevel1 = () => router.push('/admin/comments?view=all');
  const setQueueKind   = (k) => setQuery({ kind: k === 'all' ? '' : k, page: '' });
  const setQueueStatus = (s) => setQuery({ rstatus: s === 'open' ? '' : s, page: '' });
  const goLevel2 = (bId) => {
    const q = new URLSearchParams();
    q.set('bookId', String(bId));
    if (status !== 'all') q.set('status', status);
    router.push(`/admin/comments?${q.toString()}`);
  };
  const goLevel3 = (bId, chId, chapterTitle = '') => {
    setNames((n) => ({ ...n, chapterTitle }));
    const q = new URLSearchParams();
    q.set('bookId', String(bId));
    q.set('chapterId', chId === null ? 'null' : String(chId));
    if (status !== 'all') q.set('status', status);
    router.push(`/admin/comments?${q.toString()}`);
  };

  // Breadcrumb labels. The chapter title is carried over from the chapter list
  // when picked there; on a cold load both names are fetched.
  useEffect(() => {
    setNames({ bookTitle: '', chapterTitle: '' });
    if (!bookId) return undefined;
    let cancelled = false;
    api.get('/admin/comments/by-chapter', { query: { bookId, pageSize: 1 } })
      .then((d) => {
        if (!cancelled && d.book?.title) setNames((n) => ({ ...n, bookTitle: d.book.title }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [bookId]);
  useEffect(() => {
    if (!chapterId || chapterId === 'null' || names.chapterTitle) return undefined;
    let cancelled = false;
    api.get(`/chapters/${chapterId}`)
      .then((d) => {
        if (!cancelled && d.chapter?.title) setNames((n) => ({ ...n, chapterTitle: d.chapter.title }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [chapterId, names.chapterTitle]);

  return (
    <DashboardShell kind="admin">
      <DashboardTopbar subtitle="Administration" title="Moderation" />
      <div className="px-4 md:px-edge py-8 space-y-8">
        <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-1">
          <button
            type="button"
            onClick={goQueue}
            className={`px-4 py-2 text-[12px] uppercase tracking-widest border-b-2 -mb-px transition-colors ${
              showQueue
                ? 'border-on-surface text-on-surface'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Reported
          </button>
          <button
            type="button"
            onClick={goLevel1}
            className={`px-4 py-2 text-[12px] uppercase tracking-widest border-b-2 -mb-px transition-colors ${
              !showQueue
                ? 'border-on-surface text-on-surface'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All comments
          </button>
        </div>

        {showQueue ? (
          <QueueLevel
            kind={queueKind}
            status={queueStatus}
            page={page}
            onKind={setQueueKind}
            onStatus={setQueueStatus}
            onPageChange={setPage}
            pushToast={pushToast}
          />
        ) : null}

        {!showQueue ? (
        <Breadcrumbs
          level={level}
          bookId={bookId}
          chapterId={chapterId}
          bookTitle={names.bookTitle}
          chapterTitle={names.chapterTitle}
          onAll={goLevel1}
          onBook={(b) => goLevel2(b)}
        />
        ) : null}

        {!showQueue ? (
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((s) => (
            <button key={s.id} type="button" onClick={() => setStatus(s.id)} className="inline-flex">
              <Chip active={status === s.id}>{s.label}</Chip>
            </button>
          ))}
          {level === 3 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px] text-on-surface-variant label-sm uppercase">Order</span>
              <button
                type="button"
                onClick={() => setOrder('asc')}
                className={`px-3 py-1 text-[11px] tracking-labelTight uppercase border rounded ${
                  order === 'asc'
                    ? 'border-on-surface bg-on-surface text-surface dark:bg-neutral-100 dark:text-neutral-950 dark:border-neutral-100'
                    : 'border-outline-variant text-on-surface-variant dark:border-neutral-700 dark:text-neutral-400'
                }`}
              >
                Oldest first
              </button>
              <button
                type="button"
                onClick={() => setOrder('desc')}
                className={`px-3 py-1 text-[11px] tracking-labelTight uppercase border rounded ${
                  order === 'desc'
                    ? 'border-on-surface bg-on-surface text-surface dark:bg-neutral-100 dark:text-neutral-950 dark:border-neutral-100'
                    : 'border-outline-variant text-on-surface-variant dark:border-neutral-700 dark:text-neutral-400'
                }`}
              >
                Newest first
              </button>
            </div>
          )}
        </div>
        ) : null}

        {!showQueue && level === 1 && (
          <BooksLevel
            status={status}
            page={page}
            onPick={goLevel2}
            onPageChange={setPage}
            pushToast={pushToast}
          />
        )}
        {!showQueue && level === 2 && (
          <ChaptersLevel
            bookId={bookId}
            status={status}
            page={page}
            onBack={goLevel1}
            onPick={(chId, title) => goLevel3(bookId, chId, title)}
            onPageChange={setPage}
            pushToast={pushToast}
          />
        )}
        {!showQueue && level === 3 && (
          <CommentsLevel
            bookId={bookId}
            chapterId={chapterId === 'null' ? null : chapterId}
            status={status}
            order={order}
            page={page}
            onPageChange={setPage}
            pushToast={pushToast}
          />
        )}
      </div>
    </DashboardShell>
  );
}

function QueueLevel({ kind, status, page, onKind, onStatus, onPageChange, pushToast }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/admin/moderation/queue', { query: { kind, status, page, pageSize: PAGE_SIZE } })
      .then((d) => {
        if (cancelled) return;
        setData({ items: d.items || [], total: Number(d.total) || 0 });
      })
      .catch((err) => {
        if (cancelled) return;
        setData({ items: [], total: 0 });
        pushToast({ type: 'error', title: 'Could not load reports', message: err.message });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [kind, status, page, pushToast]);

  const sameItem = (a, b) => a.kind === b.kind && a.targetId === b.targetId;
  const removeItem = (item) => setData((d) => ({
    items: d.items.filter((it) => !sameItem(it, item)),
    total: Math.max(0, d.total - 1),
  }));
  const updateItem = (item) => setData((d) => ({
    ...d,
    items: d.items.map((it) => (sameItem(it, item) ? item : it)),
  }));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {QUEUE_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => onKind(k.id)} className="inline-flex">
            <Chip active={kind === k.id}>{k.label}</Chip>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {QUEUE_STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStatus(s.id)}
              className={`px-3 py-1 text-[11px] tracking-labelTight uppercase border rounded ${
                status === s.id
                  ? 'border-on-surface bg-on-surface text-surface dark:bg-neutral-100 dark:text-neutral-950 dark:border-neutral-100'
                  : 'border-outline-variant text-on-surface-variant dark:border-neutral-700 dark:text-neutral-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {!loading ? (
        <p className="text-[12px] uppercase tracking-widest text-on-surface-variant">
          {data.total} {status === 'open' ? 'open' : 'resolved'} report{data.total === 1 ? '' : 's'}
        </p>
      ) : null}

      {loading ? (
        <div className="border border-outline-variant rounded-md p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </div>
      ) : (
        <ModerationQueue
          items={data.items}
          resolvedView={status === 'resolved'}
          onRemove={removeItem}
          onUpdate={updateItem}
          emptyText={status === 'open' ? 'No open reports — nothing waiting for review.' : 'No resolved reports yet.'}
        />
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={data.total}
        onPageChange={onPageChange}
        className="pt-2"
      />
    </section>
  );
}

function Breadcrumbs({ level, bookId, chapterId, bookTitle, chapterTitle, onAll, onBook }) {
  return (
    <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-[12px] tracking-labelTight uppercase text-on-surface-variant">
      <button
        type="button"
        onClick={onAll}
        className={`hover:text-on-surface transition-colors ${level === 1 ? 'text-on-surface' : ''}`}
      >
        All books
      </button>
      {level >= 2 && (
        <>
          <Icon name="chevron_right" size={14} className="text-outline-variant" />
          <button
            type="button"
            onClick={() => onBook(bookId)}
            className={`hover:text-on-surface transition-colors max-w-[260px] truncate ${level === 2 ? 'text-on-surface' : ''}`}
          >
            {bookTitle || `Book #${bookId}`}
          </button>
        </>
      )}
      {level >= 3 && (
        <>
          <Icon name="chevron_right" size={14} className="text-outline-variant" />
          <span className="text-on-surface max-w-[260px] truncate">
            {chapterId === 'null' || chapterId === null
              ? 'Book-level comments'
              : chapterTitle || `Chapter #${chapterId}`}
          </span>
        </>
      )}
    </nav>
  );
}

function StatPill({ label, value, tone }) {
  const tones = {
    base:    'bg-surface-container text-on-surface-variant dark:bg-neutral-800 dark:text-neutral-300',
    visible: 'bg-surface-container-high text-on-surface dark:bg-neutral-700 dark:text-neutral-200',
    hidden:  'bg-surface-container-highest text-on-surface-variant dark:bg-neutral-600 dark:text-neutral-300',
    deleted: 'bg-danger/10 text-danger',
  };
  return (
    <span className={`inline-flex items-baseline gap-1 px-2 py-0.5 rounded-full text-[11px] tracking-labelTight uppercase ${tones[tone || 'base']}`}>
      <span className="font-medium">{value.toLocaleString()}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}

function BooksLevel({ status, page, onPick, onPageChange, pushToast }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/admin/comments/by-book', { query: { page, pageSize: PAGE_SIZE } })
      .then((d) => { if (!cancelled) setData({ items: d.items || [], total: d.total || 0 }); })
      .catch((err) => {
        if (cancelled) return;
        pushToast({ type: 'error', title: 'Could not load books', message: err.message });
        setData({ items: [], total: 0 });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, pushToast]);

  const filtered = useMemo(() => {
    if (status === 'all') return data.items;
    const key = status === 'visible' ? 'visible' : status === 'hidden' ? 'hidden' : 'deleted';
    return data.items.filter((it) => it.totals?.[key] > 0);
  }, [data.items, status]);

  return (
    <section className="space-y-4">
      {loading ? (
        <div className="border border-outline-variant rounded-md p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} columns={5} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-outline-variant rounded-md p-12 text-center">
          <p className="label-sm uppercase text-on-surface-variant">No books with comments</p>
          <p className="mt-2 font-serif text-[20px] text-on-surface">
            Once readers leave comments, books will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-outline-variant rounded-md">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-surface-container dark:bg-neutral-900/80 border-b border-outline-variant">
              <tr className="text-on-surface-variant label-sm uppercase">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium text-right">Comments</th>
                <th className="px-4 py-3 font-medium text-right">Last activity</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.bookId}
                  className="border-b border-outline-variant/60 hover:bg-surface-container dark:hover:bg-neutral-900/50 cursor-pointer"
                  onClick={() => onPick(row.bookId)}
                >
                  <td className="px-4 py-4">
                    <p className="font-serif text-[16px] text-on-surface">{row.title}</p>
                    <p className="text-[12px] text-on-surface-variant">/{row.slug}</p>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">{row.author?.displayName}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                      <StatPill label="total" value={row.totals.total} tone="base" />
                      {row.totals.visible > 0 && <StatPill label="visible" value={row.totals.visible} tone="visible" />}
                      {row.totals.hidden  > 0 && <StatPill label="hidden"  value={row.totals.hidden}  tone="hidden" />}
                      {row.totals.deleted > 0 && <StatPill label="deleted" value={row.totals.deleted} tone="deleted" />}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-on-surface-variant">
                    {row.lastCommentAt ? formatRelative(row.lastCommentAt) : '—'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onPick(row.bookId); }}
                      className="text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1"
                    >
                      View
                      <Icon name="chevron_right" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={data.total}
        onPageChange={onPageChange}
        className="pt-2"
      />
    </section>
  );
}

function ChaptersLevel({ bookId, status, page, onBack, onPick, onPageChange, pushToast }) {
  const [data, setData] = useState({ book: null, bookLevel: null, items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/admin/comments/by-chapter', { query: { bookId, page, pageSize: PAGE_SIZE } })
      .then((d) => {
        if (cancelled) return;
        setData({
          book: d.book || null,
          bookLevel: d.bookLevel || null,
          items: d.items || [],
          total: d.total || 0,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        pushToast({ type: 'error', title: 'Could not load chapters', message: err.message });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bookId, page, pushToast]);

  const filterRow = (totals) => {
    if (!totals) return false;
    if (status === 'all') return true;
    return Number(totals[status] || 0) > 0;
  };
  const filteredItems = data.items.filter((r) => filterRow(r.totals));
  const showBookLevel = data.bookLevel && filterRow(data.bookLevel.totals);

  return (
    <section className="space-y-6">
      {data.book && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-md p-6 flex items-center gap-6">
          {data.book.coverUrl ? (
            <img src={data.book.coverUrl} alt={data.book.title} className="w-16 h-24 object-cover rounded" />
          ) : (
            <div className="w-16 h-24 bg-surface-container-high rounded flex items-center justify-center font-serif text-2xl text-on-surface-variant">
              {data.book.title?.[0] || 'N'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-on-surface-variant label-sm uppercase">{data.book.author?.displayName}</p>
            <h3 className="font-serif text-[24px] text-on-surface truncate">{data.book.title}</h3>
            <Link href={`/books/${data.book.slug}`} className="text-[12px] text-on-surface-variant underline hover:text-on-surface">
              View on site
            </Link>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-[12px] tracking-labelTight uppercase text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1"
          >
            <Icon name="chevron_left" size={16} />
            All books
          </button>
        </div>
      )}

      {loading ? (
        <div className="border border-outline-variant rounded-md p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} columns={4} />)}
        </div>
      ) : (
        <div className="overflow-x-auto border border-outline-variant rounded-md">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-surface-container dark:bg-neutral-900/80 border-b border-outline-variant">
              <tr className="text-on-surface-variant label-sm uppercase">
                <th className="px-4 py-3 font-medium">Chapter</th>
                <th className="px-4 py-3 font-medium text-right">Comments</th>
                <th className="px-4 py-3 font-medium text-right">Last activity</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {showBookLevel && (
                <tr
                  className="border-b border-outline-variant/60 bg-surface-container dark:bg-neutral-900/50 hover:bg-surface-container-high dark:hover:bg-neutral-900/70 cursor-pointer"
                  onClick={() => onPick(null)}
                >
                  <td className="px-4 py-4">
                    <p className="font-serif text-[16px] text-on-surface">Book-level comments</p>
                    <p className="text-[12px] text-on-surface-variant">Comments left on the book itself, not on a chapter.</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <CommentTotals totals={data.bookLevel.totals} />
                  </td>
                  <td className="px-4 py-4 text-right text-on-surface-variant">
                    {data.bookLevel.lastCommentAt ? formatRelative(data.bookLevel.lastCommentAt) : '—'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-on-surface-variant inline-flex items-center gap-1">
                      View <Icon name="chevron_right" size={16} />
                    </span>
                  </td>
                </tr>
              )}
              {filteredItems.length === 0 && !showBookLevel ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-on-surface-variant label-sm uppercase">
                    No chapters with comments matching this filter
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => (
                  <tr
                    key={row.chapterId}
                    className="border-b border-outline-variant/60 hover:bg-surface-container dark:hover:bg-neutral-900/50 cursor-pointer"
                    onClick={() => onPick(row.chapterId, row.title)}
                  >
                    <td className="px-4 py-4">
                      <p className="font-serif text-[16px] text-on-surface">
                        {String(row.idx).padStart(2, '0')} · {row.title}
                      </p>
                      <p className="text-[12px] text-on-surface-variant">{row.status}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <CommentTotals totals={row.totals} />
                    </td>
                    <td className="px-4 py-4 text-right text-on-surface-variant">
                      {row.lastCommentAt ? formatRelative(row.lastCommentAt) : '—'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-on-surface-variant inline-flex items-center gap-1">
                        View <Icon name="chevron_right" size={16} />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={data.total}
        onPageChange={onPageChange}
        className="pt-2"
      />
    </section>
  );
}

function CommentTotals({ totals }) {
  if (!totals) return null;
  return (
    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
      <StatPill label="total" value={Number(totals.total) || 0} tone="base" />
      {Number(totals.visible) > 0 && <StatPill label="visible" value={Number(totals.visible)} tone="visible" />}
      {Number(totals.hidden)  > 0 && <StatPill label="hidden"  value={Number(totals.hidden)}  tone="hidden" />}
      {Number(totals.deleted) > 0 && <StatPill label="deleted" value={Number(totals.deleted)} tone="deleted" />}
    </div>
  );
}

function CommentsLevel({ bookId, chapterId, status, order, page, onPageChange, pushToast }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    const query = {
      bookId,
      page,
      pageSize: PAGE_SIZE,
      order,
      status: status === 'all' ? undefined : status,
    };
    if (chapterId === null) query.chapterNull = 1;
    else query.chapterId = chapterId;

    return api.get('/admin/comments', { query })
      .then((d) => setData({ items: d.items || [], total: d.total || 0 }))
      .catch((err) => {
        pushToast({ type: 'error', title: 'Could not load comments', message: err.message });
      })
      .finally(() => setLoading(false));
  }, [bookId, chapterId, status, order, page, pushToast]);

  useEffect(() => {
    let cancelled = false;
    reload().catch(() => {});
    return () => { cancelled = true; };
  }, [reload]);

  function applyChange(updated) {
    setData((d) => ({
      ...d,
      items: d.items.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
    }));
  }

  return (
    <section className="space-y-6">
      {loading ? (
        <div className="border border-outline-variant rounded-md p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </div>
      ) : (
        <CommentsModeration items={data.items} onChange={applyChange} />
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={data.total}
        onPageChange={onPageChange}
        className="pt-2"
      />
    </section>
  );
}

export default function AdminCommentsPage() {
  return <AdminPageGuard permission="comments"><Inner /></AdminPageGuard>;
}
