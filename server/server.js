import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { config } from './utils/config.js';
import apiRouter from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '../client/dist');
const clientIndex = path.join(clientDist, 'index.html');
const hasClientBuild = fs.existsSync(clientIndex);

const app = express();
app.use(cors());
app.use(express.json());

// Simple health check for the backend itself.
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api', apiRouter);

// Serve the built React app and let it handle client-side routing, if present.
if (hasClientBuild) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(clientIndex));
} else {
  console.warn('[server] client/dist not found — serving API only. Run `npm run build` in client/ to include the frontend.');
  app.get('/', (_req, res) => res.json({ status: 'ok', message: 'API only — client build not found' }));
}

app.listen(config.port, () => {
  console.log(`Ivy Homes backend listening on http://localhost:${config.port}`);
  console.log(`Proxying ${config.baseUrl} with key ${config.apiKey ? config.apiKey.slice(0, 8) + '…' : '(missing)'}`);
});
