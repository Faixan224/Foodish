-- Foodish — Phase 3: QR verification. Run in the Supabase SQL Editor.
-- One permanent QR per branch. Scanning it (server-validated) makes reviews
-- for that branch's dishes count as "verified" (3x) for a short window.

-- One QR per branch. token is the permanent secret encoded in the printed QR.
CREATE TABLE IF NOT EXISTS branch_qr (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_branch_qr_token ON branch_qr(token);

-- RLS on, no policies => only the service role touches it (admin generates,
-- the scan route + owner portal read it via server-side service-role code).
ALTER TABLE branch_qr ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- Reviews are now inserted ONLY through the submitReview server action
-- (service role), which decides is_verified from a validated QR scan.
-- Revoke direct insert so a client can't self-award a "Verified" badge.
-- (SELECT stays public; the fraud trigger still runs on the service-role insert.)
-- =====================================================================
REVOKE INSERT ON public.reviews FROM anon, authenticated;
