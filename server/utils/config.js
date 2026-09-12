import dotenv from 'dotenv';
dotenv.config();

// Central config. The API key lives here (from .env) and never reaches the browser.
export const config = {
  baseUrl: process.env.IVY_BASE_URL || 'https://solve.ivy.homes',
  apiKey: process.env.IVY_API_KEY || '',
  port: Number(process.env.PORT || 4000),
  // Demo credentials for the one-click "Use demo account" button. The password
  // stays server-side (never shipped to the browser). Email can be overridden
  // per request (demo1/2/3); this is just the default and the shared password.
  demoEmail: process.env.IVY_DEMO_EMAIL || 'demo1@ivy.homes',
  demoPassword: process.env.IVY_DEMO_PASSWORD || '',
};

if (!config.apiKey) {
  console.warn('[config] IVY_API_KEY is not set. Copy server/.env.example to server/.env.');
}
