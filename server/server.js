import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { config } from './utils/config.js';
import apiRouter from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '../client/dist');

const app = express();
app.use(cors());
app.use(express.json());

// Simple health check for the backend itself.
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api', apiRouter);

// Serve the built React app and let it handle client-side routing.
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(config.port, () => {
  console.log(`Ivy Homes backend listening on http://localhost:${config.port}`);
  console.log(`Proxying ${config.baseUrl} with key ${config.apiKey ? config.apiKey.slice(0, 8) + '…' : '(missing)'}`);
});
