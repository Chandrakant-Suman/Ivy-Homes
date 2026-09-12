import { upstreamPost } from '../services/ivyApi.js';
import { config } from '../utils/config.js';

// POST /api/auth/login  { email, password }
// Discovered auth facts (differ from the docs):
//  - token field is `access_token` (docs say `token`)
//  - a `refresh_token` + `/auth/refresh` flow exists (docs say "no refresh flow")
//  - access token lasts 900s / 15 min (docs say 86400s / 24h)
export async function login(req, res) {
  const { email, password } = req.body || {};
  const data = await upstreamPost('/auth/login', { email, password });
  res.json(data);
}

// POST /api/auth/demo-login  { email? }
// One-click demo sign-in. The shared demo password lives in the backend .env
// (IVY_DEMO_PASSWORD) and never reaches the browser; the frontend just asks the
// server to log a demo user in. `email` may be demo1/demo2/demo3@ivy.homes.
export async function demoLogin(req, res) {
  if (!config.demoPassword) {
    return res.status(501).json({ error: 'demo login is not configured (set IVY_DEMO_PASSWORD in server/.env)' });
  }
  const allowed = ['demo1@ivy.homes', 'demo2@ivy.homes', 'demo3@ivy.homes'];
  const requested = req.body?.email;
  const email = allowed.includes(requested) ? requested : config.demoEmail;
  const data = await upstreamPost('/auth/login', { email, password: config.demoPassword });
  res.json(data);
}

// POST /api/auth/refresh  { refresh_token }
// Keeps the session alive past the 15-minute access-token expiry.
export async function refresh(req, res) {
  const { refresh_token } = req.body || {};
  const data = await upstreamPost('/auth/refresh', { refresh_token });
  res.json(data);
}

// POST /api/auth/logout
// The upstream logout is stateless (it just tells the client to discard the
// token); we forward it and the frontend clears its stored session.
export async function logout(req, res) {
  const bearer = req.headers.authorization || '';
  const data = await upstreamPost('/auth/logout', {}, { bearer });
  res.json(data);
}
