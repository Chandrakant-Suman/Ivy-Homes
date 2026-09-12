import { useEffect, useState } from 'react';
import { favouritesApi } from '../services/api.js';
import ListingCard from '../components/ListingCard.jsx';
import { Loading, ErrorState, Empty } from '../components/ui.jsx';

export default function Favourites() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    favouritesApi
      .list()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function remove(id) {
    try {
      await favouritesApi.remove(id);
      setData((d) => ({ ...d, results: d.results.filter((r) => r.listing_id !== id) }));
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-800">Favourites</h1>
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && (!data || data.results.length === 0) && (
        <Empty label="No saved listings yet. Tap the ♡ on any listing to save it." />
      )}
      {!loading && !error && data && data.results.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.results.map((l) => (
            <ListingCard key={l.listing_id} listing={l} saved onToggleSave={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
