import { useCallback, useEffect, useState } from 'react';

/**
 * Generic paginated fetch hook. `loader` is a function that takes
 * `({ page, pageSize, ...extra })` and returns `{ items, total, page, pageSize }`.
 *
 * Returns `{ items, total, page, pageSize, loading, error, refresh, setPage,
 * loadMore }`.
 */
export function usePagedQuery(loader, { pageSize = 12, deps = [], extra = {} } = {}) {
  
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (p, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const data = await loader({ page: p, pageSize, ...extra });
        const newItems = data?.items || [];
        setItems((prev) => (append ? [...prev, ...newItems] : newItems));
        setTotal(Number(data?.total) || newItems.length);
        setPage(p);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loader, pageSize, JSON.stringify(extra), ...deps],
  );

  useEffect(() => {
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(extra), ...deps]);

  const loadMore = useCallback(() => {
    if (loading) return;
    if (items.length >= total) return;
    load(page + 1, true);
  }, [load, loading, items.length, total, page]);

  return {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    refresh: () => load(1, false),
    setPage: (p) => load(p, false),
    loadMore,
  };
}
