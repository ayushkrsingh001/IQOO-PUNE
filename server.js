/**
 * Habitus site server — serves the Vite site and the waitlist API on one port.
 *   Dev:  node server.js                       (Vite middleware + HMR)
 *   Prod: NODE_ENV=production node server.js   (serves dist/)
 */
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 5000;

// The marketing site must stay up even if the database is missing; only the
// waitlist endpoint degrades (503) so signup failures stay explicit.
const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
  : null;
if (!pool) {
  console.error('WARNING: DATABASE_URL is not set — serving the site, but /api/waitlist will return 503 until a database is attached.');
}

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);
app.use(express.json({ limit: '8kb' }));

/* ---- tiny in-memory rate limit: 8 signup attempts / 10 min / IP ---- */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 8;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > MAX_HITS;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOURCES = new Set(['download', 'modal']);

app.post('/api/waitlist', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ ok: false, error: "The launch list isn't available right now — please try again later." });
    }
    if (rateLimited(req.ip)) {
      return res.status(429).json({ ok: false, error: 'Too many tries — give it a few minutes.' });
    }

    const body = req.body || {};

    // Honeypot: bots fill every field. Pretend it worked, store nothing.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return res.json({ ok: true, status: 'added' });
    }

    const email = String(body.email || '').trim().toLowerCase();
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      return res.status(400).json({ ok: false, error: "That email doesn't look right — mind checking it?" });
    }
    const source = SOURCES.has(body.source) ? body.source : 'site';

    const result = await pool.query(
      'INSERT INTO waitlist_signups (email, source) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id',
      [email, source]
    );
    res.json({ ok: true, status: result.rowCount > 0 ? 'added' : 'exists' });
  } catch (err) {
    console.error('waitlist insert failed:', err);
    res.status(500).json({ ok: false, error: 'Something broke on our side — please try again.' });
  }
});

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
