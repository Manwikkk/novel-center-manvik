'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import AuthGuard from '@/components/layout/AuthGuard';
import CompactBookTile from '@/components/book/CompactBookTile';
import LiveSearchBar from '@/components/search/LiveSearchBar';
import Icon from '@/components/ui/Icon';
import Pagination from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { collectionsApi } from '@/lib/collections';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 12;

function CollectionDetailInner() {
  const { id } = useParams();
  const collectionId = Number(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const q = (searchParams.get('q') || '').trim();
  const pushToast = useUiStore((s) => s.pushToast);

  const [meta, setMeta] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameBusy, setNameBusy] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(collectionId) || collectionId <= 0) return;
    setLoading(true);
    try {
      const [listRes, booksRes] = await Promise.all([
        collectionsApi.list({ pageSize: 60 }),
        collectionsApi.listBooks(collectionId, { page, pageSize: PAGE_SIZE, q: q || undefined }),
      ]);
      const found = (listRes.items || []).find((c) => c.id === collectionId);
      setMeta(found || { id: collectionId, name: 'Collection', visibility: 'private', bookCount: booksRes.total });
      setItems(booksRes.items || []);
      setTotal(Number(booksRes.total) || 0);
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not load collection', message: err.message });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [collectionId, page, q, pushToast]);

  useEffect(() => { load(); }, [load]);

  const goPage = (p) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (p <= 1) params.delete('page'); else params.set('page', String(p));
    const qs = params.toString();
    router.push(qs ? `/library/collections/${collectionId}?${qs}` : `/library/collections/${collectionId}`);
  };

  async function toggleVisibility() {
    if (!meta || visibilityBusy) return;
    const next = meta.visibility === 'public' ? 'private' : 'public';
    setVisibilityBusy(true);
    try {
      const { collection } = await collectionsApi.update(collectionId, { visibility: next });
      setMeta((m) => ({ ...m, visibility: collection.visibility }));
      pushToast({ type: 'success', title: 'Visibility updated', message: `Collection is now ${next}.` });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not update', message: err.message });
    } finally {
      setVisibilityBusy(false);
    }
  }

  function startRename() {
    setNameDraft(meta?.name || '');
    setEditingName(true);
  }

  async function saveName(e) {
    e?.preventDefault?.();
    if (!meta || nameBusy) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      pushToast({ type: 'error', title: 'Collection name is required' });
      return;
    }
    if (trimmed === meta.name) {
      setEditingName(false);
      return;
    }
    setNameBusy(true);
    try {
      const { collection } = await collectionsApi.update(collectionId, { name: trimmed });
      setMeta((m) => ({ ...m, name: collection.name }));
      setEditingName(false);
      pushToast({ type: 'success', title: 'Collection renamed', message: `Now called “${collection.name}”.` });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not rename', message: err.message });
    } finally {
      setNameBusy(false);
    }
  }

  async function handleRemove(bookId, title) {
    if (removingId) return;
    setRemovingId(bookId);
    const prevItems = items;
    const prevTotal = total;
    setItems((list) => list.filter((b) => b.id !== bookId));
    setTotal((t) => Math.max(0, t - 1));
    try {
      await collectionsApi.removeBook(collectionId, bookId);
      pushToast({ type: 'success', title: 'Removed from collection', message: `${title} was removed.` });
    } catch (err) {
      setItems(prevItems);
      setTotal(prevTotal);
      pushToast({ type: 'error', title: 'Could not remove', message: err.message });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-black">
      <SiteHeader variant="solid" />
      <main className="flex-grow pt-[120px] pb-32 max-w-[1280px] mx-auto px-4 md:px-edge w-full">
        <Link
          href="/library?tab=collections"
          className="inline-flex items-center gap-2 text-[12px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface mb-8"
        >
          <ArrowLeft size={16} />
          Back to collections
        </Link>

        <header className="mb-8">
          {editingName ? (
            <form onSubmit={saveName} className="flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-[220px] max-w-lg">
                <span className="sr-only">Collection name</span>
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value.slice(0, 120))}
                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingName(false); }}
                  maxLength={120}
                  disabled={nameBusy}
                  className="w-full bg-transparent border-b border-outline-variant focus:border-on-surface focus:outline-none py-2 font-display-lg text-[28px] md:text-[36px] leading-tight text-on-surface dark:text-neutral-100"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={nameBusy || !nameDraft.trim()}
                  className="px-4 py-2 rounded bg-primary text-on-primary text-[11px] font-semibold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {nameBusy ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  disabled={nameBusy}
                  className="px-4 py-2 rounded border border-outline-variant text-on-surface-variant text-[11px] font-semibold uppercase tracking-widest hover:text-on-surface hover:border-on-surface disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display-lg text-[36px] md:text-[44px] text-on-surface dark:text-neutral-100 leading-tight">
                {meta?.name || 'Collection'}
              </h1>
              {meta ? (
                <button
                  type="button"
                  onClick={startRename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-[11px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface hover:border-on-surface transition-colors"
                  aria-label="Rename collection"
                  title="Rename collection"
                >
                  <Pencil size={12} />
                  Rename
                </button>
              ) : null}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="text-[12px] uppercase tracking-widest text-on-surface-variant">
              {!loading ? `${total} ${total === 1 ? 'book' : 'books'}` : '…'}
            </span>
            {meta ? (
              <button
                type="button"
                onClick={toggleVisibility}
                disabled={visibilityBusy}
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] uppercase tracking-widest border transition-colors disabled:opacity-50',
                  meta.visibility === 'public'
                    ? 'border-on-surface text-on-surface'
                    : 'border-outline-variant text-on-surface-variant hover:border-on-surface',
                )}
              >
                {meta.visibility === 'public' ? 'Public' : 'Private'}
              </button>
            ) : null}
          </div>
        </header>

        <LiveSearchBar
          basePath={`/library/collections/${collectionId}`}
          placeholder="Search this collection…"
          className="mb-8 flex w-full max-w-md flex-wrap items-center gap-3"
        />

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="min-w-0">
                <Skeleton className="aspect-[2/3] w-full max-w-[120px] rounded-xl" />
                <Skeleton className="mt-3 h-4 w-full max-w-[120px]" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="border border-outline-variant rounded-lg p-16 text-center bg-surface-container-low">
            <Icon name={q ? 'search' : 'folder'} size={36} className="text-on-surface-variant mb-4" />
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
              {q ? 'No books match your search.' : 'This collection is empty.'}
            </h2>
            <p className="font-reading-body text-reading-body text-on-surface-variant max-w-md mx-auto">
              Add books from any book detail page using the menu → Add to Collection.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-x-6 sm:gap-y-8">
              {items.map((book) => (
                <CompactBookTile
                  key={book.id}
                  book={book}
                  action={(
                    <button
                      type="button"
                      onClick={() => handleRemove(book.id, book.title)}
                      disabled={removingId === book.id}
                      className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface/90 backdrop-blur-sm border border-outline-variant text-on-surface-variant dark:bg-neutral-900/90 dark:border-neutral-700 dark:text-neutral-300 opacity-0 group-hover:opacity-100 hover:bg-error hover:text-on-error transition-all duration-200 disabled:opacity-60"
                      aria-label={`Remove ${book.title} from collection`}
                      title="Remove from collection"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                />
              ))}
            </div>
            <div className="mt-16">
              <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={goPage} />
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export default function CollectionDetailPage() {
  return (
    <AuthGuard>
      <CollectionDetailInner />
    </AuthGuard>
  );
}
