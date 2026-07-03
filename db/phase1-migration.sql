-- Foodish — Restaurants Portal, Phase 1 migration
-- Apply in the Supabase SQL Editor AFTER portal-migration.sql + fix-grants.sql.
-- Adds: owner SKU, multi-photo, Chef's Special, and the dish<->branch mapping.

-- Owner-editable SKU (their internal reference, e.g. FUCO-01).
-- dish_code (already in schema) is the immutable DIN — never changes.
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS sku TEXT;

-- Multiple photos per dish; photo_url stays = first photo (consumer app cover).
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- Chef's Special: owner-assigned, ONE dish per category per restaurant.
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS is_chef_special BOOLEAN DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_chef_special_per_category
  ON dishes (restaurant_id, category) WHERE is_chef_special = TRUE;

-- One dish can be served at multiple branches (dish is NOT re-posted per branch).
-- dishes.branch_id stays as the "primary" branch for backward compatibility.
CREATE TABLE IF NOT EXISTS dish_branches (
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (dish_id, branch_id)
);
CREATE INDEX IF NOT EXISTS idx_dish_branches_branch ON dish_branches(branch_id);

ALTER TABLE dish_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read dish_branches" ON dish_branches FOR SELECT USING (TRUE);
CREATE POLICY "Owners manage dish_branches" ON dish_branches FOR ALL USING (
  auth.uid() = (
    SELECT r.owner_id FROM restaurants r
    JOIN dishes d ON d.restaurant_id = r.id
    WHERE d.id = dish_branches.dish_id
  )
);

-- Consumer app may read the mapping later (branch pages / QR menus).
GRANT SELECT ON public.dish_branches TO anon;
