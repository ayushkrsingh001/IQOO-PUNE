-- Habitus database schema — source of truth.
--
-- Development: `npm run db:push` applies this file idempotently to the
--              development database (also runs from the post-merge setup script).
-- Production:  managed by Replit's Publish flow, which diffs the development
--              schema against production and applies it on publish.
--              Never run this file against production by hand.

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,           -- stored trimmed + lowercased by the API
  source TEXT NOT NULL DEFAULT 'site',  -- 'download' | 'modal' | 'site'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
