import express from 'express';
import cors from 'cors';
import { config } from './utils/config.js';
import apiRouter from './routes/index.js';

const app = express();
app.use(cors());
app.use(express.json());

// Simple health check for the backend itself.
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api', apiRouter);

app.listen(config.port, () => {
  console.log(`Ivy Homes backend listening on http://localhost:${config.port}`);
  console.log(`Proxying ${config.baseUrl} with key ${config.apiKey ? config.apiKey.slice(0, 8) + '…' : '(missing)'}`);
});
