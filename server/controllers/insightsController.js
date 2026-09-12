import { ensureLoaded } from '../services/dataStore.js';
import { analyticsSummary } from '../services/query.js';
import { getBearer } from '../utils/http.js';

// GET /api/insights
// The documented /v1/analytics/summary returns 404, so we compute the summary
// ourselves from the full crawl and add the data-quality facts we discovered.
export async function getInsights(req, res) {
  const cache = await ensureLoaded(getBearer(req));
  res.json(analyticsSummary(cache.listings));
}
