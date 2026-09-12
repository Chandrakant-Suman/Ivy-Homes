import { ensureLoaded } from '../services/dataStore.js';
import { paginate } from '../services/query.js';
import { getBearer } from '../utils/http.js';

// GET /api/rentals
export async function listRentals(req, res) {
  const cache = await ensureLoaded(getBearer(req));
  res.json(paginate(cache.rentals, req.query));
}

// GET /api/rentals/:id
export async function getRental(req, res) {
  const cache = await ensureLoaded(getBearer(req));
  const row = cache.rentals.find((r) => r.listing_id === req.params.id);
  if (!row) return res.status(404).json({ error: 'rental not found' });
  res.json(row);
}
