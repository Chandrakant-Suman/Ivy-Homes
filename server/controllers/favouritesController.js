import { upstreamGet, upstreamPost, upstreamDelete } from '../services/ivyApi.js';
import { getBearer } from '../utils/http.js';

// Favourites are per logged-in user and live entirely upstream, so they persist
// across refresh and re-login automatically.
//
// Discovered: the documented path /v1/favourites does NOT exist. The real
// endpoint is /v1/saved, and POST expects { listing_id } (docs say { id }).

// GET /api/favourites
export async function listFavourites(req, res) {
  const data = await upstreamGet('/v1/saved', { bearer: getBearer(req) });
  res.json(data);
}

// POST /api/favourites  { listing_id }
export async function addFavourite(req, res) {
  const listing_id = req.body?.listing_id || req.body?.id;
  const data = await upstreamPost('/v1/saved', { listing_id }, { bearer: getBearer(req) });
  res.json(data);
}

// DELETE /api/favourites/:id
export async function removeFavourite(req, res) {
  const data = await upstreamDelete(`/v1/saved/${req.params.id}`, { bearer: getBearer(req) });
  res.json(data);
}
