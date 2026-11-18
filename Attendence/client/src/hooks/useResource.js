import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client.js';

/**
 * Generic list-fetching hook: pagination + debounced search + filters + reload.
 * Server contract: GET {endpoint}?page&limit&search&sort&filters
 *   -> { data: { items, page, limit, total, totalPages } }
 *
 * @param {string} endpoint
 * @param {{ limit?: number, sort?: string }} [options]
 */
export default function useResource(endpoint, { limit = 10, sort, initialFilters } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState({ page: 1, limit, total: 0, totalPages: 1 });
  const [extra, setExtra] = useState(null); // full payload (summary, type, ...)
  const [search, setSearchState] = useState('');
  const [filters, setFilters] = useState(initialFilters || {});
  const [version, setVersion] = useState(0);

  const setSearch = useCallback((value) => {
    setSearchState(value);
    setMeta((m) => ({ ...m, page: 1 }));
  }, []);

  const setFilter = useCallback((key, value) => {
    setFilters((f) => {
      const next = { ...f };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
    setMeta((m) => ({ ...m, page: 1 }));
  }, []);

  const setPage = useCallback((page) => setMeta((m) => ({ ...m, page })), []);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          page: String(meta.page),
          limit: String(meta.limit),
        });
        if (search) params.set('search', search);
        if (sort) params.set('sort', sort);
        Object.entries(filters).forEach(([key, value]) => params.set(key, value));

        const { data } = await apiClient.get(`${endpoint}?${params.toString()}`);
        if (cancelled) return;
        setItems(data.data.items);
        setExtra(data.data);
        setMeta((m) => ({
          ...m,
          total: data.data.total,
          totalPages: data.data.totalPages,
        }));
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300); // debounce so typing doesn't spam the API

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [endpoint, meta.page, meta.limit, search, filters, sort, version]);

  return { items, loading, error, meta, extra, search, filters, setSearch, setFilter, setPage, reload };
}
