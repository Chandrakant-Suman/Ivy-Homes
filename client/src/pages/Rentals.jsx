import { useEffect, useState, useCallback } from 'react';
import { rentalsApi } from '../services/api.js';
import { Loading, ErrorState, Empty, Pager, Badge } from '../components/ui.jsx';
import { formatINR, formatDate, titleCase } from '../services/format.js';

const SQFT_PER_SQM = 10.7639;
const areaSqft = (x) => (x.carpet_area < 250 ? Math.round(x.carpet_area * SQFT_PER_SQM) : x.carpet_area);

function RentalCard({ x }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-slate-800">{x.apartment_name}</h3>
        {x.is_live === false && <Badge tone="red">Not live</Badge>}
      </div>
      <p className="text-sm text-slate-500">{titleCase(x.locality)}</p>
      <p className="mt-2 text-lg font-bold text-slate-900">
        {formatINR(x.price)} <span className="text-sm font-normal text-slate-500">/ month</span>
      </p>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
        <span>Deposit: {formatINR(x.deposit)}</span>
        <span>Maint.: {formatINR(x.maintenance)}</span>
        <span>{x.bedroom} BHK · {x.bathroom} bath</span>
        <span>{areaSqft(x)} sqft</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge>{titleCase(x.property_type)}</Badge>
        <Badge>{titleCase(x.furnishing)}</Badge>
      </div>
      <p className="mt-3 text-xs text-slate-400">Posted {formatDate(x.posted_at)}</p>
    </div>
  );
}

export default function Rentals() {
  const [page, setPage] = useState(1);
  const [locality, setLocality] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    rentalsApi
      .list({ page, pageSize: 12, locality })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [page, locality]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-slate-800">Rentals</h1>
        {data && <span className="text-sm text-slate-500">{data.total} results</span>}
      </div>

      <input
        value={locality}
        onChange={(e) => {
          setPage(1);
          setLocality(e.target.value.toLowerCase());
        }}
        placeholder="Filter by locality (e.g. kukatpally)"
        className="mb-6 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && data && data.results.length === 0 && <Empty label="No rentals found." />}

      {!loading && !error && data && data.results.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((x) => (
              <RentalCard key={x.listing_id} x={x} />
            ))}
          </div>
          <Pager page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
