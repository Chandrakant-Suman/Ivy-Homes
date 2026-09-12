import { upstreamGet } from './ivyApi.js';

// In-memory cache of the full city dataset.
//
// Why cache at all? Three of the documentation's promises are false and the
// only reliable fix is to hold the whole (small) dataset ourselves:
//   - `total` is understated, so we must page by `has_more`, not by `total`.
//   - the `order` sort param is ignored by the server (asc/desc identical).
//   - `page` is ignored; only `limit`/`offset` work.
// Holding all records lets us filter, sort (both directions) and paginate
// correctly and instantly. The dataset is ~4.4k listings, well within one crawl.
const CACHE = { listings: null, rentals: null, projects: null, loadedAt: 0 };
const TTL_MS = 10 * 60 * 1000;

// Page through a collection until the server says there is no more.
// We deliberately trust `has_more`, not `total` (which the API understates).
async function crawl(collection, bearer) {
  const limit = 50; // server caps limit at 50 regardless of what you ask for
  let offset = 0;
  const all = [];
  // hard stop well above the known dataset size, just in case
  for (let guard = 0; guard < 500; guard++) {
    const data = await upstreamGet(`/v1/${collection}`, { bearer, params: { limit, offset } });
    const rows = data.results || [];
    all.push(...rows);
    if (!data.has_more || rows.length === 0) break;
    offset += rows.length;
  }
  return all;
}

export async function ensureLoaded(bearer, { force = false } = {}) {
  const fresh = Date.now() - CACHE.loadedAt < TTL_MS;
  if (!force && fresh && CACHE.listings) return CACHE;
  const [listings, rentals, projects] = await Promise.all([
    crawl('listings', bearer),
    crawl('rentals', bearer),
    crawl('projects', bearer),
  ]);
  CACHE.listings = listings;
  CACHE.rentals = rentals;
  CACHE.projects = projects;
  CACHE.loadedAt = Date.now();
  return CACHE;
}

export function getCache() {
  return CACHE;
}
