-- Foodish — ensure Row Level Security is ON for every sensitive table.
-- The dishes table had RLS disabled, so its policies were dormant and any
-- authenticated owner could write into another restaurant's menu. Enabling RLS
-- activates the "Owners ... own dishes" policies from security-fixes.sql.
-- Idempotent: safe to run even where RLS is already enabled.

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_replies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dish_branches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviewer_profiles   ENABLE ROW LEVEL SECURITY;

-- These may or may not exist depending on how far the schema was applied;
-- wrap each so a missing table doesn't abort the batch.
DO $$ BEGIN ALTER TABLE public.qr_sessions ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.sponsored_listings ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
