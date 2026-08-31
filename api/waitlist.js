import pg from 'pg';

const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 })
  : null;
if (!pool) {
  console.error('WARNING: DATABASE_URL is not set — /api/waitlist will return 503.');
}

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    if (!pool) {
      return res.status(503).json({ ok: false, error: "The launch list isn't available right now — please try again later." });
    }
    
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    
    if (rateLimited(ip)) {
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
}
