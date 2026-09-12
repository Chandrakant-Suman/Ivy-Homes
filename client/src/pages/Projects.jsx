import { useEffect, useState, useCallback } from 'react';
import { projectsApi } from '../services/api.js';
import { Loading, ErrorState, Empty, Pager, Badge } from '../components/ui.jsx';
import { titleCase } from '../services/format.js';

// price_min/price_max are in crore (documented as rupees — a units bug), and
// often min > max, so we show them as a plain crore range using the extremes.
function crRange(p) {
  const lo = Math.min(p.price_min, p.price_max);
  const hi = Math.max(p.price_min, p.price_max);
  return `₹${lo} – ${hi} Cr`;
}

function ProjectDetail({ id }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setP(null);
    projectsApi.get(id).then(setP).catch(setError);
  }, [id]);
  if (error) return <ErrorState error={error} />;
  if (!p) return <Loading label="Loading project…" />;

  const reported = p.total_listings;
  const actual = p.actual_listings_live;
  const mismatch = reported !== actual;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-5">
      <h3 className="text-lg font-bold text-slate-900">{p.apartment_name}</h3>
      <p className="text-sm text-slate-500">
        {titleCase(p.developer_name)} · {titleCase(p.locality)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <span><b>Status:</b> {titleCase(p.project_status)}</span>
        <span><b>Units:</b> {p.total_units}</span>
        <span><b>Towers:</b> {p.total_towers}</span>
        <span><b>Floors:</b> {p.total_floors}</span>
        <span><b>Price:</b> {crRange(p)}</span>
        <span><b>Area:</b> {p.min_area_sqft}–{p.max_area_sqft} sqft</span>
        <span><b>Launch:</b> {p.launch_date}</span>
        <span><b>Possession:</b> {p.possession_date}</span>
        <span><b>RERA:</b> {p.rera_number}</span>
      </div>
      <p className="mt-3 text-sm">
        <b>Listings:</b> reports {reported};{' '}
        <span className={mismatch ? 'text-red-600' : 'text-emerald-700'}>
          actually {actual} live ({p.actual_listings_total} total)
        </span>{' '}
        {mismatch && <Badge tone="red">count wrong</Badge>}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(p.amenities || []).map((a) => (
          <Badge key={a}>{a}</Badge>
        ))}
      </div>
    </div>
  );
}

export default function Projects() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    projectsApi
      .list({ page, pageSize: 12 })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-slate-800">Projects</h1>
        {data && <span className="text-sm text-slate-500">{data.total} results</span>}
      </div>

      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && data && data.results.length === 0 && <Empty label="No projects found." />}

      {!loading && !error && data && data.results.length > 0 && (
        <>
          {selected && (
            <div className="mb-5">
              <ProjectDetail id={selected} />
              <button onClick={() => setSelected(null)} className="mt-2 text-sm text-slate-500 hover:underline">
                Close details
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((p) => (
              <button
                key={p.project_id}
                onClick={() => setSelected(p.project_id)}
                className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:shadow-md"
              >
                <h3 className="font-semibold text-slate-800">{p.apartment_name}</h3>
                <p className="text-sm text-slate-500">
                  {titleCase(p.developer_name)} · {titleCase(p.locality)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                  <Badge>{titleCase(p.project_status)}</Badge>
                  <span>{crRange(p)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {p.total_units} units · {p.total_towers} towers · reports {p.total_listings} listings
                </p>
              </button>
            ))}
          </div>
          <Pager page={data.page} pages={data.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
