/**
 * Habitus site server — serves the Vite site and the waitlist API on one port.
 *   Dev:  node server.js                       (Vite middleware + HMR)
 *   Prod: NODE_ENV=production node server.js   (serves dist/)
 */
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import waitlistHandler from './api/waitlist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 5000;

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);
app.use(express.json({ limit: '8kb' }));

app.post('/api/waitlist', waitlistHandler);

/* ---- site ---- */
if (isProd) {
  const dist = path.join(__dirname, 'dist');
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Habitus site ${isProd ? '(production)' : '(dev)'} listening on http://0.0.0.0:${PORT}`);
});
