import { ensureLoaded } from '../services/dataStore.js';
import { queryListings, similarListings } from '../services/query.js';
import { getBearer } from '../utils/http.js';

// GET /api/listings?locality=&bhk=&min_price=&max_price=&furnishing=&property_type=&sort_by=&order=&page=&pageSize=
export async function listListings(req, res) {
  const cache = await ensureLoaded(getBearer(req));
  res.json(queryListings(cache.listings, req.query));
}

// GET /api/listings/:id  (real path upstream is plural /v1/listings/{id})
export async function getListing(req, res) {
  const cache = await ensureLoaded(getBearer(req));
  const row = cache.listings.find((r) => r.listing_id === req.params.id);
  if (!row) return res.status(404).json({ error: 'listing not found' });
  res.json(row);
}

// GET /api/listings/:id/similar  (computed; no such endpoint exists upstream)
export async function getSimilar(req, res) {
  const cache = await ensureLoaded(getBearer(req));
  res.json({ results: similarListings(cache.listings, req.params.id) });
}
