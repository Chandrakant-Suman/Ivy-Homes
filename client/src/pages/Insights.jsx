import { useEffect, useState } from 'react';
import { insightsApi } from '../services/api.js';
import { Loading, ErrorState } from '../components/ui.jsx';
import { formatINR, formatINRShort, titleCase } from '../services/format.js';

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// A simple horizontal bar row.
function Bar({ label, count, max, extra }) {
  const pct = max ? Math.round((count / max) * 100) : 0;
  return (
    <div className="py-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500">{count}{extra ? ` · ${extra}` : ''}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded bg-slate-100">
        <div className="h-2 rounded bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Insights() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    insightsApi.get().then(setD).catch(setError).finally(() => setLoading(false));
  }
  useEffect(load, []);

  if (loading) return <Loading label="Crunching the dataset…" />;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!d) return null;

  const locMax = Math.max(...d.by_locality.map((l) => l.count));
  const bhkMax = Math.max(...d.by_bhk.map((b) => b.count));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Insights — {titleCase(d.city)}</h1>
        <p className="text-sm text-slate-500">
          Computed locally: the documented <code>/v1/analytics/summary</code> endpoint does not exist (404).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total listings" value={d.total_listings.toLocaleString('en-IN')} sub={`${d.live_listings} live`} />
        <Stat label="Median price" value={formatINRShort(d.median_price)} sub={formatINR(d.median_price)} />
        <Stat label="Median ₹/sqft" value={formatINR(d.median_price_per_sqft)} sub="sqm records normalised" />
        <Stat label="Localities" value={d.by_locality.length} />
      </div>

      {/* Discoveries a user should know about — the honest part of the dataset. */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h2 className="mb-2 font-semibold text-amber-800">Data quality (what we found)</h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><b className="text-lg">{d.data_quality.fake_listings}</b><br />enquiry-bait fakes</div>
          <div><b className="text-lg">{d.data_quality.corrupt_listings}</b><br />impossible records</div>
          <div><b className="text-lg">{d.data_quality.area_in_square_metres}</b><br />area in m² (not sqft)</div>
          <div><b className="text-lg">{d.data_quality.not_live_but_served}</b><br />not-live but served</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-2 font-semibold text-slate-800">Listings by locality (top 12)</h2>
          {d.by_locality.slice(0, 12).map((l) => (
            <Bar key={l.locality} label={titleCase(l.locality)} count={l.count} max={locMax} extra={formatINRShort(l.median_price)} />
          ))}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-2 font-semibold text-slate-800">Listings by BHK</h2>
          {d.by_bhk.map((b) => (
            <Bar key={b.bedroom} label={`${b.bedroom} BHK`} count={b.count} max={bhkMax} />
          ))}
        </div>
      </div>
    </div>
  );
}
