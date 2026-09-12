import { ensureLoaded } from '../services/dataStore.js';
import { paginate } from '../services/query.js';
import { getBearer } from '../utils/http.js';

// GET /api/projects
export async function listProjects(req, res) {
  const cache = await ensureLoaded(getBearer(req));
  res.json(paginate(cache.projects, req.query, { localityFilter: true }));
}

// GET /api/projects/:id  — also attach the actual listing count we observe,
// so the UI can show the reported-vs-actual discrepancy.
export async function getProject(req, res) {
  const cache = await ensureLoaded(getBearer(req));
  const row = cache.projects.find((r) => r.project_id === req.params.id);
  if (!row) return res.status(404).json({ error: 'project not found' });
  const linked = cache.listings.filter((l) => l.project_id === req.params.id);
  res.json({
    ...row,
    actual_listings_total: linked.length,
    actual_listings_live: linked.filter((l) => l.is_live).length,
  });
}
