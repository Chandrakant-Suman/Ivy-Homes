import { isCorrupt, isSqm, carpetSqft, buildFakeSet } from '../utils/detect.js';

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const SORTABLE = new Set(['price', 'carpet_area', 'posted_at', 'bedroom']);

// Filter + sort + paginate listings in memory (the parts the server gets wrong).
export function queryListings(all, q) {
  let rows = all;

  if (q.locality) rows = rows.filter((r) => r.locality === String(q.locality).toLowerCase());
  if (q.bhk !== undefined && q.bhk !== '') rows = rows.filter((r) => r.bedroom === Number(q.bhk));
  if (q.property_type) rows = rows.filter((r) => r.property_type === q.property_type);
  if (q.furnishing) rows = rows.filter((r) => r.furnishing === q.furnishing);
  if (q.min_price !== undefined && q.min_price !== '')
    rows = rows.filter((r) => r.price >= Number(q.min_price));
  if (q.max_price !== undefined && q.max_price !== '')
    rows = rows.filter((r) => r.price <= Number(q.max_price));

  const total = rows.length;

  if (q.sort_by && SORTABLE.has(q.sort_by)) {
    const dir = q.order === 'desc' ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = a[q.sort_by];
      const bv = b[q.sort_by];
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.max(1, Math.min(60, Number(q.pageSize) || 12));
  const start = (page - 1) * pageSize;
  const results = rows.slice(start, start + pageSize);

  return { total, page, pageSize, pages: Math.ceil(total / pageSize), results };
}

// Generic paginate for rentals/projects (with optional locality filter).
export function paginate(all, q, { localityFilter = true } = {}) {
  let rows = all;
  if (localityFilter && q.locality) rows = rows.filter((r) => r.locality === String(q.locality).toLowerCase());
  if (q.bhk !== undefined && q.bhk !== '') rows = rows.filter((r) => r.bedroom === Number(q.bhk));
  if (q.furnishing) rows = rows.filter((r) => r.furnishing === q.furnishing);
  if (q.project_status) rows = rows.filter((r) => r.project_status === q.project_status);
  const total = rows.length;
  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.max(1, Math.min(60, Number(q.pageSize) || 12));
  const start = (page - 1) * pageSize;
  return { total, page, pageSize, pages: Math.ceil(total / pageSize), results: rows.slice(start, start + pageSize) };
}

// "Similar" listings — the documented endpoint does not exist, so we build it:
// same locality, same bedroom count, sale price within 15%, excluding itself.
export function similarListings(all, id, limit = 6) {
  const base = all.find((r) => r.listing_id === id);
  if (!base) return [];
  const lo = base.price * 0.85;
  const hi = base.price * 1.15;
  return all
    .filter(
      (r) =>
        r.listing_id !== id &&
        r.locality === base.locality &&
        r.bedroom === base.bedroom &&
        r.price >= lo &&
        r.price <= hi
    )
    .slice(0, limit);
}

// Analytics summary — the documented /v1/analytics/summary returns 404, so we
// compute it from the crawl, and add the data-quality facts a user should know.
export function analyticsSummary(listings) {
  const live = listings.filter((r) => r.is_live);
  const cleanPrices = live.filter((r) => !isCorrupt(r) && r.price > 0);

  const byLocalityMap = new Map();
  for (const r of cleanPrices) {
    if (!byLocalityMap.has(r.locality)) byLocalityMap.set(r.locality, []);
    byLocalityMap.get(r.locality).push(r.price);
  }
  const by_locality = [...byLocalityMap.entries()]
    .map(([locality, prices]) => ({ locality, count: prices.length, median_price: median(prices) }))
    .sort((a, b) => b.count - a.count);

  const byBhkMap = new Map();
  for (const r of live) byBhkMap.set(r.bedroom, (byBhkMap.get(r.bedroom) || 0) + 1);
  const by_bhk = [...byBhkMap.entries()]
    .map(([bedroom, count]) => ({ bedroom, count }))
    .sort((a, b) => a.bedroom - b.bedroom);

  const ppsf = cleanPrices.map((r) => r.price / carpetSqft(r));

  const { fakeIds } = buildFakeSet(listings);
  const corruptCount = listings.filter(isCorrupt).length;
  const sqmCount = listings.filter(isSqm).length;

  return {
    city: 'hyderabad',
    total_listings: listings.length,
    live_listings: live.length,
    median_price: median(cleanPrices.map((r) => r.price)),
    median_price_per_sqft: Math.round(median(ppsf)),
    by_locality,
    by_bhk,
    data_quality: {
      fake_listings: fakeIds.size,
      corrupt_listings: corruptCount,
      area_in_square_metres: sqmCount,
      not_live_but_served: listings.length - live.length,
    },
  };
}
