import { useEffect, useMemo, useState } from 'react';

export const CLIENT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Client-side slice of an in-memory list. Resets to page 1 when `resetDeps` changes.
 */
export function useClientPagination<T>(items: T[], resetDeps: unknown) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [resetDeps]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages, total]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total,
    pageItems,
  };
}
