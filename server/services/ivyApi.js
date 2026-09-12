import axios from 'axios';
import { config } from '../utils/config.js';

// One axios instance pointed at the upstream API.
// IMPORTANT (discovered, not documented): the API key must be sent as the
// `X-API-Key` header. The docs say `?api_key=...` as a query param, but the
// server rejects that ("send your key in the X-API-Key request header").
const client = axios.create({
  baseURL: config.baseUrl,
  timeout: 20000,
  headers: { 'X-API-Key': config.apiKey },
});

// Build headers for an authenticated (per-user) request.
// The end-user's bearer token is forwarded from the frontend; the API key is
// added here so it is never exposed to the browser.
function authHeaders(bearer) {
  const h = {};
  if (bearer) h.Authorization = bearer.startsWith('Bearer ') ? bearer : `Bearer ${bearer}`;
  return h;
}

export async function upstreamGet(path, { bearer, params } = {}) {
  const res = await client.get(path, { headers: authHeaders(bearer), params });
  return res.data;
}

export async function upstreamPost(path, body, { bearer } = {}) {
  const res = await client.post(path, body, { headers: authHeaders(bearer) });
  return res.data;
}

export async function upstreamDelete(path, { bearer } = {}) {
  const res = await client.delete(path, { headers: authHeaders(bearer) });
  return res.data;
}

export { client };
