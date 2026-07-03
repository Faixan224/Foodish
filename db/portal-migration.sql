-- Foodish — Restaurants Portal, Phase 0 migration
-- Apply in the Supabase SQL Editor AFTER db/schema.sql.
-- Adds: restaurant code prefix + the onboarding_codes table (gated signup / per-branch unlock).

-- Short prefix used to brand a restaurant's onboarding codes, e.g. 'FUCO' -> FUCO-235-245
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS code_prefix TEXT;

-- Onboarding codes. Each code is issued by an admin and consumed exactly once.
--   kind = 'signup'     -> creates the owner account + restaurant + first (free) branch
--   kind = 'add_branch' -> unlocks one additional (paid, prorated) branch on an existing restaurant
DO $$ BEGIN
  CREATE TYPE onboarding_code_kind AS ENUM ('signup', 'add_branch');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE onboarding_code_status AS ENUM ('unused', 'used', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS onboarding_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  kind onboarding_code_kind NOT NULL DEFAULT 'signup',
  status onboarding_code_status NOT NULL DEFAULT 'unused',
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL, -- null until a signup code is consumed
  restaurant_name TEXT,        -- intended restaurant name (for signup codes, before the row exists)
  code_prefix TEXT,            -- e.g. 'FUCO'
  notes TEXT,                  -- admin-only note (why/what this code is for)
  consumed_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  consumed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  issued_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_onboarding_codes_code ON onboarding_codes(code);
CREATE INDEX IF NOT EXISTS idx_onboarding_codes_status ON onboarding_codes(status);

-- RLS on + no policies = table is reachable ONLY via the service-role key
-- (super-admin server actions and the signup server action). Owners/anon can't read codes.
ALTER TABLE onboarding_codes ENABLE ROW LEVEL SECURITY;
