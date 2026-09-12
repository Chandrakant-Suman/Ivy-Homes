import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { listingsApi, favouritesApi } from '../services/api.js';
import { Loading, ErrorState, Badge } from '../components/ui.jsx';
import ListingCard from '../components/ListingCard.jsx';
import { formatINR, formatINRShort, formatDate, titleCase } from '../services/format.js';

const SQFT_PER_SQM = 10.7639;

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    listingsApi
      .get(id)
      .then((l) => {
        setListing(l);
        return listingsApi.similar(id).then((s) => setSimilar(s.results || []));
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    favouritesApi
      .list()
      .then((d) => setSaved((d.results || []).some((r) => r.listing_id === id)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleSave() {
    try {
      if (saved) {
        await favouritesApi.remove(id);
        setSaved(false);
      } else {
        await favouritesApi.add(id);
        setSaved(true);
      }
    } catch {
      /* ignore */
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!listing) return null;

  const x = listing;
  const inSqm = x.carpet_area < 250;
  const carpetSqft = inSqm ? Math.round(x.carpet_area * SQFT_PER_SQM) : x.carpet_area;

  return (
    <div>
      <Link to="/listings" className="text-sm text-emerald-700 hover:underline">
        ← Back to listings
      </Link>

      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{x.apartment_name}</h1>
            <p className="text-slate-500">
              {titleCase(x.locality)} · {x.bedroom} BHK {titleCase(x.property_type)}
            </p>
          </div>
          <button
            onClick={toggleSave}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${
              saved ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {saved ? '♥ Saved' : '♡ Save'}
          </button>
        </div>

        <p className="mt-4 text-3xl font-bold text-emerald-700">{formatINR(x.price)}</p>
        <p className="text-sm text-slate-500">{formatINRShort(x.price)}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {x.is_verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}
          {x.is_live === false && <Badge tone="red">Not live</Badge>}
          <Badge>{titleCase(x.furnishing)}</Badge>
          {inSqm && <Badge tone="amber">area reported in m² · shown as sqft</Badge>}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          <div>
            <Row label="Carpet area" value={`${carpetSqft} sqft`} />
            <Row label="Super built-up" value={`${inSqm ? Math.round(x.super_built_up_area * SQFT_PER_SQM) : x.super_built_up_area} sqft`} />
            <Row label="Bedrooms" value={`${x.bedroom}`} />
            <Row label="Bathrooms" value={`${x.bathroom}`} />
            <Row label="Balconies" value={`${x.balcony}`} />
            <Row label="Floor" value={`${x.floor} of ${x.total_floors}`} />
          </div>
          <div>
            <Row label="Facing" value={titleCase(x.facing_direction)} />
            <Row label="Covered parking" value={`${x.covered_parking}`} />
            <Row label="Posted by" value={`${titleCase(x.posted_by)} · ${x.posted_by_name}`} />
            <Row label="Contact" value={x.posted_by_contact} />
            <Row label="Project" value={x.project_id || '—'} />
            <Row label="Posted on" value={formatDate(x.posted_at)} />
          </div>
        </div>

        {x.description && <p className="mt-6 rounded-md bg-slate-50 p-4 text-sm text-slate-600">{x.description}</p>}
      </div>

      {similar.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Similar listings</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((l) => (
              <ListingCard key={l.listing_id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
