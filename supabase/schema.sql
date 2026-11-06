-- ====================================================================
-- askr.ink Database Schema & DDL Migration
-- ====================================================================

-- 1. Main links table
CREATE TABLE IF NOT EXISTS public.links (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(64) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicks INTEGER NOT NULL DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  custom BOOLEAN NOT NULL DEFAULT FALSE
);

-- Index for instant slug lookups during redirection
CREATE INDEX IF NOT EXISTS idx_links_slug ON public.links(slug);

-- 2. Optional visit tracking logs (device, referrer, timestamp)
CREATE TABLE IF NOT EXISTS public.link_visits (
  id BIGSERIAL PRIMARY KEY,
  link_id VARCHAR(64) REFERENCES public.links(id) ON DELETE CASCADE,
  slug VARCHAR(64) NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT
);

CREATE INDEX IF NOT EXISTS idx_link_visits_slug ON public.link_visits(slug);

-- 3. Row Level Security (RLS)
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_visits ENABLE ROW LEVEL SECURITY;

-- 4. Permissive policies for public link shortening
DROP POLICY IF EXISTS "Public can view links" ON public.links;
CREATE POLICY "Public can view links" ON public.links
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public can insert links" ON public.links;
CREATE POLICY "Public can insert links" ON public.links
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update click counts" ON public.links;
CREATE POLICY "Public can update click counts" ON public.links
  FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can record visits" ON public.link_visits;
CREATE POLICY "Public can record visits" ON public.link_visits
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view visits" ON public.link_visits;
CREATE POLICY "Public can view visits" ON public.link_visits
  FOR SELECT TO public USING (true);
