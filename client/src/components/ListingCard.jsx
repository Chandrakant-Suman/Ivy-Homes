import { Link } from 'react-router-dom';
import { formatINRShort, formatDate, titleCase } from '../services/format.js';
import { Badge } from './ui.jsx';

// A listing may report area in square metres (a documented-unit bug we detect);
// show the true sqft so cards are comparable.
const SQFT_PER_SQM = 10.7639;
function areaSqft(x) {
  return x.carpet_area < 250 ? Math.round(x.carpet_area * SQFT_PER_SQM) : x.carpet_area;
}

export default function ListingCard({ listing, saved, onToggleSave }) {
  const x = listing;
  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/listings/${x.listing_id}`} className="font-semibold text-slate-800 hover:text-emerald-700">
          {x.apartment_name || 'Unnamed property'}
        </Link>
        {onToggleSave && (
          <button
            onClick={() => onToggleSave(x.listing_id)}
            title={saved ? 'Remove from favourites' : 'Save to favourites'}
            className={`text-xl leading-none ${saved ? 'text-red-500' : 'text-slate-300 hover:text-red-400'}`}
          >
            {saved ? '♥' : '♡'}
          </button>
        )}
      </div>

      <p className="mt-0.5 text-sm text-slate-500">{titleCase(x.locality)}</p>

      <p className="mt-2 text-lg font-bold text-slate-900">{formatINRShort(x.price)}</p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <span>{x.bedroom} BHK</span>
        <span>{x.bathroom} Bath</span>
        <span>{areaSqft(x)} sqft</span>
        <span>
          Floor {x.floor}/{x.total_floors}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge>{titleCase(x.property_type)}</Badge>
        <Badge>{titleCase(x.furnishing)}</Badge>
        {x.is_verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}
        {x.is_live === false && <Badge tone="red">Not live</Badge>}
      </div>

      <p className="mt-3 text-xs text-slate-400">Posted {formatDate(x.posted_at)}</p>
    </div>
  );
}
