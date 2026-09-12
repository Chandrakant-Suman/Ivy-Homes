import { useEffect, useState, useCallback } from 'react';
import { listingsApi, favouritesApi, insightsApi } from '../services/api.js';
import ListingCard from '../components/ListingCard.jsx';
import { Loading, ErrorState, Empty, Pager } from '../components/ui.jsx';

const BLANK = {
  locality: '',
  bhk: '',
  min_price: '',
  max_price: '',
  furnishing: '',
  sort_by: '',
  order: 'asc',
};

export default function Listings() {
  const [filters, setFilters] = useState(BLANK);
  const [applied, setApplied] = useState(BLANK);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localities, setLocalities] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());

  // locality options + saved favourites, once
  useEffect(() => {
    insightsApi.get().then((d) => setLocalities(d.by_locality.map((l) => l.locality))).catch(() => {});
    favouritesApi
      .list()
      .then((d) => setSavedIds(new Set((d.results || []).map((r) => r.listing_id))))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listingsApi
      .list({ ...applied, page, pageSize: 12 })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [applied, page]);

  useEffect(() => {
    load();
  }, [load]);

  function apply(e) {
    e.preventDefault();
    setPage(1);
    setApplied(filters);
  }

  function reset() {
    setFilters(BLANK);
    setApplied(BLANK);
    setPage(1);
  }

  async function toggleSave(id) {
    const next = new Set(savedIds);
    try {
      if (next.has(id)) {
        await favouritesApi.remove(id);
        next.delete(id);
      } else {
        await favouritesApi.add(id);
        next.add(id);
      }
      setSavedIds(next);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-slate-800">Listings</h1>
        {data && <span className="text-sm text-slate-500">{data.total} results</span>}
      </div>

      {/* Filters — these filter reliably because the backend applies them itself. */}
      <form onSubmit={apply} className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-7">
        <select
          value={filters.locality}
          onChange={(e) => setFilters({ ...filters, locality: e.target.value })}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All localities</option>
          {localities.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          value={filters.bhk}
          onChange={(e) => setFilters({ ...filters, bhk: e.target.value })}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Any BHK</option>
          {[0, 1, 2, 3, 4, 5].map((b) => (
            <option key={b} value={b}>
              {b} BHK
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min price"
          value={filters.min_price}
          onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          placeholder="Max price"
          value={filters.max_price}
          onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />

        <select
          value={filters.furnishing}
          onChange={(e) => setFilters({ ...filters, furnishing: e.target.value })}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Any furnishing</option>
          <option value="unfurnished">Unfurnished</option>
          <option value="semi-furnished">Semi-furnished</option>
          <option value="fully-furnished">Fully-furnished</option>
        </select>

        <div className="flex gap-1">
          <select
            value={filters.sort_by}
            onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Sort</option>
            <option value="price">Price</option>
            <option value="carpet_area">Area</option>
            <option value="posted_at">Posted</option>
            <option value="bedroom">BHK</option>
          </select>
          <select
            value={filters.order}
            onChange={(e) => setFilters({ ...filters, order: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="asc">↑</option>
            <option value="desc">↓</option>
          </select>
        </div>

        <div className="col-span-2 flex gap-2 sm:col-span-3 lg:col-span-7">
          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
            Apply
          </button>
          <button type="button" onClick={reset} className="rounded-md border border-slate-300 px-4 py-1.5 text-sm hover:bg-slate-50">
            Reset
          </button>
        </div>
      </form>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && data && data.results.length === 0 && <Empty label="No listings match these filters." />}

      {!loading && !error && data && data.results.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((l) => (
              <ListingCard key={l.listing_id} listing={l} saved={savedIds.has(l.listing_id)} onToggleSave={toggleSave} />
            ))}
          </div>
          <Pager page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
