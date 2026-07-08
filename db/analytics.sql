-- Foodish — activity analytics. Run once in the Supabase SQL Editor.
--
-- page_views: one row per public page view (from the client beacon) and per
-- QR scan (from the /s/[token] route). Powers Active Users / DAU / MAU,
-- page-view counts and scan counts on the admin + portal dashboards.

CREATE TABLE IF NOT EXISTS page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor text,                              -- anonymous device id (localStorage); null for QR-scan rows
  path text NOT NULL,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL,
  dish_id uuid REFERENCES dishes(id) ON DELETE SET NULL,
  is_scan boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pv_created    ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_pv_restaurant ON page_views(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pv_visitor    ON page_views(visitor, created_at);

-- Only the service role (server code) may read or write — no client access at all.
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON page_views FROM anon, authenticated;
