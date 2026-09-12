import dotenv from 'dotenv';
dotenv.config();

// Central config. The API key lives here (from .env) and never reaches the browser.
export const config = {
  baseUrl: process.env.IVY_BASE_URL || 'https://solve.ivy.homes',
  apiKey: process.env.IVY_API_KEY || '',
  port: Number(process.env.PORT || 4000),
};

if (!config.apiKey) {
  console.warn('[config] IVY_API_KEY is not set. Copy server/.env.example to server/.env.');
}
