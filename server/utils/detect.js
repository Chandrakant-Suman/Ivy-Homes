// Single source of truth for the data-quality rules we discovered.
// Imported by both the runtime insights and the offline analyzeData.js so the
// app and the submission always agree.

export const SQFT_PER_SQM = 10.7639;

// A record is "corrupt" if it describes something that physically cannot exist.
// Each of these conditions is injected into exactly 10 listings (30 total,
// disjoint sets):
//   - negative sale price
//   - a flat on a floor higher than the building's total floors
//   - carpet area larger than super built-up area (carpet is a subset of it)
export function isCorrupt(x) {
  return (
    x.price < 0 ||
    x.floor > x.total_floors ||
    x.carpet_area > x.super_built_up_area
  );
}

export function corruptReason(x) {
  if (x.price < 0) return 'negative_price';
  if (x.floor > x.total_floors) return 'floor_gt_total_floors';
  if (x.carpet_area > x.super_built_up_area) return 'carpet_gt_super_built_up';
  return null;
}

// Some listings report area in square METRES, not square feet as documented.
// They are cleanly separated: for a real 2/3 BHK there is a gap with nothing
// between ~200 and ~400, so a carpet area under 250 is metric.
export function isSqm(x) {
  return x.carpet_area < 250;
}

// Carpet area normalised to square feet (fixes the metric records).
export function carpetSqft(x) {
  return isSqm(x) ? x.carpet_area * SQFT_PER_SQM : x.carpet_area;
}

// Build the set of "fake" listing ids from the whole listings array.
// The tell: a single phone number posting under several different seller
// names. Twelve numbers do this, each posting ~20 under-priced listings under
// rotating personal and invented-agency identities to farm enquiries.
export function buildFakeSet(listings) {
  const phoneNames = new Map();
  for (const x of listings) {
    if (!phoneNames.has(x.posted_by_contact)) phoneNames.set(x.posted_by_contact, new Set());
    phoneNames.get(x.posted_by_contact).add(x.posted_by_name);
  }
  const fakePhones = new Set(
    [...phoneNames.entries()].filter(([, names]) => names.size > 1).map(([p]) => p)
  );
  const fakeIds = new Set(
    listings.filter((x) => fakePhones.has(x.posted_by_contact)).map((x) => x.listing_id)
  );
  return { fakePhones, fakeIds };
}
