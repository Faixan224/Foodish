-- Foodish — comprehensive security hardening. Run once in the Supabase SQL Editor.
-- An authenticated-user attack sweep found permissive policies that allowed
-- privilege escalation, cross-tenant writes, and review tampering. This resets
-- every sensitive table to a correct minimal policy set + column-level locks.
-- RLS stays ON everywhere; the service role (server-side admin/signup) bypasses all of it.

-- Helper pattern used below: drop ALL existing policies on a table (whatever
-- their name), then recreate exactly the intended ones.

-- =====================================================================
-- users  — no self-escalation to admin, no reading other people's rows
-- =====================================================================
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='users'
  LOOP EXECUTE format('DROP POLICY %I ON public.users', p.policyname); END LOOP;
END $$;
CREATE POLICY "Users read own profile"   ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon, authenticated;
GRANT  UPDATE (full_name, nickname, avatar_url, phone, phone_display, email)
  ON public.users TO authenticated;

-- =====================================================================
-- restaurants  — owner edits only their own, only cosmetic columns;
--                cannot self-insert, self-verify, or un-suspend
-- =====================================================================
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='restaurants'
  LOOP EXECUTE format('DROP POLICY %I ON public.restaurants', p.policyname); END LOOP;
END $$;
CREATE POLICY "Public read restaurants"      ON public.restaurants FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Owners read own restaurant"   ON public.restaurants FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners update own restaurant" ON public.restaurants FOR UPDATE USING (auth.uid() = owner_id);

REVOKE INSERT, UPDATE, DELETE ON public.restaurants FROM anon, authenticated;
GRANT  UPDATE (description, logo_url, cover_url, cuisine_type, city)
  ON public.restaurants TO authenticated;

-- =====================================================================
-- branches  — owner reads own; ALL writes go through the service-role
--             server action (gated by the paid add_branch code)
-- =====================================================================
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='branches'
  LOOP EXECUTE format('DROP POLICY %I ON public.branches', p.policyname); END LOOP;
END $$;
CREATE POLICY "Public read branches"    ON public.branches FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Owners read own branches" ON public.branches FOR SELECT USING (
  auth.uid() = (SELECT owner_id FROM public.restaurants WHERE id = branches.restaurant_id)
);
REVOKE INSERT, UPDATE, DELETE ON public.branches FROM anon, authenticated;

-- =====================================================================
-- dishes  — owner manages ONLY their own restaurant's dishes; cannot
--           touch rating counters, the DIN, or is_sponsored
-- =====================================================================
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='dishes'
  LOOP EXECUTE format('DROP POLICY %I ON public.dishes', p.policyname); END LOOP;
END $$;
CREATE POLICY "Public read dishes" ON public.dishes FOR SELECT USING (
  status = 'active'
  AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = dishes.restaurant_id AND r.is_active = TRUE)
);
CREATE POLICY "Owners read own dishes"   ON public.dishes FOR SELECT USING (
  auth.uid() = (SELECT owner_id FROM public.restaurants WHERE id = dishes.restaurant_id));
CREATE POLICY "Owners insert own dishes" ON public.dishes FOR INSERT WITH CHECK (
  auth.uid() = (SELECT owner_id FROM public.restaurants WHERE id = dishes.restaurant_id));
CREATE POLICY "Owners update own dishes" ON public.dishes FOR UPDATE USING (
  auth.uid() = (SELECT owner_id FROM public.restaurants WHERE id = dishes.restaurant_id));
CREATE POLICY "Owners delete own dishes" ON public.dishes FOR DELETE USING (
  auth.uid() = (SELECT owner_id FROM public.restaurants WHERE id = dishes.restaurant_id));

-- Column locks: an owner can only set/edit menu fields — never avg_rating,
-- total_reviews, weighted_score, verified_reviews, is_sponsored, or dish_code.
REVOKE INSERT, UPDATE, DELETE ON public.dishes FROM anon, authenticated;
GRANT  INSERT (dish_code, restaurant_id, branch_id, name, description, category, tags,
               price, price_min, price_max, photo_url, photo_urls, video_url,
               status, is_available, is_chef_special, sku, prep_time_minutes)
  ON public.dishes TO authenticated;
GRANT  UPDATE (name, description, category, tags, price, price_min, price_max,
               photo_url, photo_urls, video_url, status, is_available,
               is_chef_special, sku, prep_time_minutes, branch_id)
  ON public.dishes TO authenticated;
GRANT  DELETE ON public.dishes TO authenticated; -- scoped to own by the policy above

-- =====================================================================
-- reviews  — write-once by the public; NOBODY (owner or diner) can edit,
--            hide, or delete a review from the client. Only the fraud
--            trigger / service role can. This stops rating manipulation.
-- =====================================================================
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='reviews'
  LOOP EXECUTE format('DROP POLICY %I ON public.reviews', p.policyname); END LOOP;
END $$;
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (is_hidden = FALSE);
CREATE POLICY "Anyone insert review" ON public.reviews FOR INSERT WITH CHECK (TRUE);
REVOKE UPDATE, DELETE ON public.reviews FROM anon, authenticated;
