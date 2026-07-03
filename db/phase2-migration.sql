-- Foodish — Restaurants Portal, Phase 2 migration
-- Apply in the Supabase SQL Editor AFTER phase1-migration.sql.
-- Adds: subscription-expiry hide (DB-level) + tightened review-reply policy.

-- 1. Consumer app hides ALL dishes of a suspended (unpaid) restaurant.
--    Hiding = admin sets restaurants.is_active = false; ranking self-adjusts
--    because hidden dishes simply drop out of every query. Owners still see
--    their own dishes in the portal via the "Owners manage dishes" policy.
DROP POLICY IF EXISTS "Public read dishes" ON dishes;
CREATE POLICY "Public read dishes" ON dishes FOR SELECT USING (
  status = 'active'
  AND EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = dishes.restaurant_id AND r.is_active = TRUE
  )
);

-- 1b. The live DB has a permissive read policy on restaurants that ignores
--     is_active (verified during testing) — recreate the intended one and
--     drop the usual dashboard-created suspects.
DROP POLICY IF EXISTS "Public read restaurants" ON restaurants;
DROP POLICY IF EXISTS "Enable read access for all users" ON restaurants;
DROP POLICY IF EXISTS "Allow public read" ON restaurants;
DROP POLICY IF EXISTS "public read" ON restaurants;
CREATE POLICY "Public read restaurants" ON restaurants FOR SELECT USING (is_active = TRUE);

-- 2. An owner may only reply to reviews on THEIR OWN dishes (the old policy
--    only checked they owned the restaurant_id they claimed, not that the
--    review actually belongs to that restaurant).
DROP POLICY IF EXISTS "Owners insert replies" ON review_replies;
CREATE POLICY "Owners insert replies" ON review_replies FOR INSERT WITH CHECK (
  auth.uid() = (SELECT owner_id FROM restaurants WHERE id = review_replies.restaurant_id)
  AND EXISTS (
    SELECT 1 FROM reviews rv
    JOIN dishes d ON d.id = rv.dish_id
    WHERE rv.id = review_replies.review_id
      AND d.restaurant_id = review_replies.restaurant_id
  )
);

-- 3. Consumers must be able to READ replies (they show under reviews on the
--    dish page). RLS already allows it; the table-level grant was missing.
GRANT SELECT ON public.review_replies TO anon;

-- 4. Owners can edit/remove their own reply (one per review stays enforced
--    by the UNIQUE(review_id) constraint).
DROP POLICY IF EXISTS "Owners update replies" ON review_replies;
CREATE POLICY "Owners update replies" ON review_replies FOR UPDATE USING (
  auth.uid() = (SELECT owner_id FROM restaurants WHERE id = review_replies.restaurant_id)
);
DROP POLICY IF EXISTS "Owners delete replies" ON review_replies;
CREATE POLICY "Owners delete replies" ON review_replies FOR DELETE USING (
  auth.uid() = (SELECT owner_id FROM restaurants WHERE id = review_replies.restaurant_id)
);
