-- Foodish — full database schema (all phases, future-ready)
-- Apply in Supabase SQL Editor. Run PART 1 first, then PART 2.
--
-- NOTE: this is the originally-designed schema. The live DB has since evolved
-- (e.g. `dishes.weighted_score` now behaves as a Bayesian ranking score rather
-- than the simple verified-weighted average defined here). Treat the live DB as
-- source of truth for ranking; this file documents the intended structure.

-- =====================================================================
-- PART 1 — extensions, enums, tables, seed config, indexes
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trial');
CREATE TYPE dish_status AS ENUM ('active', 'discontinued', 'draft');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE review_source AS ENUM ('qr_scan', 'app', 'web');
CREATE TYPE user_role AS ENUM ('customer', 'restaurant_owner', 'admin');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE,
  phone_display TEXT,
  nickname TEXT,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'customer',
  points_balance INTEGER DEFAULT 0,
  points_lifetime INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  cuisine_type TEXT[],
  city TEXT NOT NULL DEFAULT 'Lahore',
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  owner_id UUID REFERENCES users(id),
  avg_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  plan subscription_plan DEFAULT 'free',
  status subscription_status DEFAULT 'active',
  dish_limit INTEGER DEFAULT 10,
  price_per_month NUMERIC(10,2) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  payment_method TEXT,
  last_payment_at TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  area TEXT,
  city TEXT NOT NULL DEFAULT 'Lahore',
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  phone TEXT,
  opening_time TIME,
  closing_time TIME,
  is_active BOOLEAN DEFAULT TRUE,
  branch_email TEXT UNIQUE,
  branch_password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dishes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dish_code TEXT UNIQUE NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[],
  price NUMERIC(10,2),
  price_min NUMERIC(10,2),
  price_max NUMERIC(10,2),
  photo_url TEXT,
  video_url TEXT,
  status dish_status DEFAULT 'active',
  version INTEGER DEFAULT 1,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  verified_reviews INTEGER DEFAULT 0,
  unverified_reviews INTEGER DEFAULT 0,
  weighted_score NUMERIC(10,4) DEFAULT 0,
  is_sponsored BOOLEAN DEFAULT FALSE,
  sponsored_until TIMESTAMPTZ,
  sponsored_category TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  prep_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE qr_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
  branch_id UUID NOT NULL REFERENCES branches(id),
  table_number TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  phone_hash TEXT NOT NULL,
  nickname TEXT,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  tags TEXT[],
  comment TEXT CHECK (char_length(comment) <= 280),
  photo_url TEXT,
  source review_source DEFAULT 'web',
  is_verified BOOLEAN DEFAULT FALSE,
  session_token TEXT REFERENCES qr_sessions(token),
  weight NUMERIC(3,1) DEFAULT 1.0,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  is_hidden BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE review_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  reply_text TEXT NOT NULL CHECK (char_length(reply_text) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id)
);

CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  points_spent INTEGER NOT NULL,
  discount_percent SMALLINT NOT NULL DEFAULT 10,
  max_discount_rs NUMERIC(10,2) DEFAULT 1000,
  restaurant_id UUID REFERENCES restaurants(id),
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_at_branch_id UUID REFERENCES branches(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  status order_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  payment_method TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  discount_code_id UUID REFERENCES discount_codes(id),
  platform_fee NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  table_number TEXT,
  delivery_address TEXT,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES dishes(id),
  quantity SMALLINT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  special_request TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sponsored_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dish_id UUID NOT NULL REFERENCES dishes(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  category TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Lahore',
  position SMALLINT DEFAULT 1,
  price_per_day NUMERIC(10,2),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_plans_config (
  plan subscription_plan PRIMARY KEY,
  display_name TEXT NOT NULL,
  dish_limit INTEGER NOT NULL,
  price_per_month NUMERIC(10,2) NOT NULL,
  extra_dish_price NUMERIC(10,2) DEFAULT 0,
  features TEXT[],
  is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO subscription_plans_config VALUES
  ('free',  'Free',  10,  0,    0,   ARRAY['Up to 10 dishes', 'Basic analytics', 'QR menu'], TRUE),
  ('basic', 'Basic', 50,  2000, 0,   ARRAY['Up to 50 dishes', 'Full analytics', 'QR menu', 'Priority listing'], TRUE),
  ('pro',   'Pro',   999, 5000, 150, ARRAY['Unlimited dishes', 'Advanced analytics', 'QR menu', 'Featured placement', 'Sponsored listings'], TRUE);

CREATE INDEX idx_dishes_branch ON dishes(branch_id);
CREATE INDEX idx_dishes_restaurant ON dishes(restaurant_id);
CREATE INDEX idx_dishes_category ON dishes(category);
CREATE INDEX idx_dishes_status ON dishes(status);
CREATE INDEX idx_dishes_rating ON dishes(avg_rating DESC);
CREATE INDEX idx_dishes_weighted ON dishes(weighted_score DESC);
CREATE INDEX idx_dishes_sponsored ON dishes(is_sponsored) WHERE is_sponsored = TRUE;
CREATE INDEX idx_dishes_name_search ON dishes USING gin(name gin_trgm_ops);
CREATE INDEX idx_reviews_dish ON reviews(dish_id);
CREATE INDEX idx_reviews_phone ON reviews(phone_hash);
CREATE INDEX idx_reviews_verified ON reviews(is_verified);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX idx_reviews_flagged ON reviews(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_qr_token ON qr_sessions(token);
CREATE INDEX idx_qr_expires ON qr_sessions(expires_at);
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_name_search ON restaurants USING gin(name gin_trgm_ops);
CREATE INDEX idx_branches_restaurant ON branches(restaurant_id);
CREATE INDEX idx_branches_city ON branches(city);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_points_user ON points_transactions(user_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_branch ON orders(branch_id);
CREATE INDEX idx_subscriptions_restaurant ON subscriptions(restaurant_id);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);

-- =====================================================================
-- PART 2 — functions, triggers, RLS policies
-- =====================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS
$func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION check_review_fraud()
RETURNS TRIGGER LANGUAGE plpgsql AS
$func$
DECLARE
  v_count INTEGER;
BEGIN
  -- 1 review per dish per phone / 7 days
  SELECT COUNT(*) INTO v_count FROM reviews
  WHERE phone_hash = NEW.phone_hash
    AND dish_id = NEW.dish_id
    AND created_at > NOW() - INTERVAL '7 days';
  IF v_count >= 1 THEN
    RAISE EXCEPTION 'You can review the same dish once a week';
  END IF;

  -- Max 3 reviews per phone / 24h (overall)
  SELECT COUNT(*) INTO v_count FROM reviews
  WHERE phone_hash = NEW.phone_hash
    AND created_at > NOW() - INTERVAL '24 hours';
  IF v_count >= 3 THEN
    RAISE EXCEPTION 'You can post up to 3 reviews per day';
  END IF;

  -- Max 10 reviews per phone / 30 days
  SELECT COUNT(*) INTO v_count FROM reviews
  WHERE phone_hash = NEW.phone_hash
    AND created_at > NOW() - INTERVAL '30 days';
  IF v_count >= 10 THEN
    RAISE EXCEPTION 'You can post up to 10 reviews per month';
  END IF;

  -- Flag high volume
  SELECT COUNT(*) INTO v_count FROM reviews
  WHERE phone_hash = NEW.phone_hash
    AND created_at > NOW() - INTERVAL '1 hour';
  IF v_count >= 10 THEN
    NEW.is_flagged := TRUE;
    NEW.flag_reason := 'High volume: 10+ reviews in 1 hour from same phone';
  END IF;

  IF NEW.is_verified THEN
    NEW.weight := 3.0;
  ELSE
    NEW.weight := 1.0;
  END IF;

  RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION recalculate_dish_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS
$func$
DECLARE
  v_verified_sum NUMERIC;
  v_verified_count INTEGER;
  v_unverified_sum NUMERIC;
  v_unverified_count INTEGER;
  v_weighted_avg NUMERIC;
  v_total INTEGER;
  v_dish_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_dish_id := OLD.dish_id;
  ELSE
    v_dish_id := NEW.dish_id;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN is_verified THEN stars ELSE 0 END), 0),
    COALESCE(COUNT(CASE WHEN is_verified THEN 1 END), 0),
    COALESCE(SUM(CASE WHEN NOT is_verified THEN stars ELSE 0 END), 0),
    COALESCE(COUNT(CASE WHEN NOT is_verified THEN 1 END), 0)
  INTO v_verified_sum, v_verified_count, v_unverified_sum, v_unverified_count
  FROM reviews
  WHERE dish_id = v_dish_id AND is_hidden = FALSE;

  v_total := v_verified_count + v_unverified_count;

  IF v_total = 0 THEN
    v_weighted_avg := 0;
  ELSE
    v_weighted_avg := (v_verified_sum * 3 + v_unverified_sum * 1)::NUMERIC
                    / (v_verified_count * 3 + v_unverified_count * 1);
  END IF;

  UPDATE dishes SET
    avg_rating         = ROUND(v_weighted_avg, 2),
    total_reviews      = v_total,
    verified_reviews   = v_verified_count,
    unverified_reviews = v_unverified_count,
    weighted_score     = v_weighted_avg,
    updated_at         = NOW()
  WHERE id = v_dish_id;

  UPDATE restaurants SET
    avg_rating = (
      SELECT ROUND(AVG(avg_rating), 2) FROM dishes
      WHERE restaurant_id = (SELECT restaurant_id FROM dishes WHERE id = v_dish_id)
      AND status = 'active' AND total_reviews > 0
    ),
    total_reviews = (
      SELECT COALESCE(SUM(total_reviews), 0) FROM dishes
      WHERE restaurant_id = (SELECT restaurant_id FROM dishes WHERE id = v_dish_id)
      AND status = 'active'
    ),
    updated_at = NOW()
  WHERE id = (SELECT restaurant_id FROM dishes WHERE id = v_dish_id);

  RETURN NEW;
END;
$func$;

CREATE OR REPLACE FUNCTION generate_discount_code()
RETURNS TEXT LANGUAGE plpgsql AS
$func$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM discount_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$func$;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_dishes_updated BEFORE UPDATE ON dishes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fraud_check BEFORE INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION check_review_fraud();
CREATE TRIGGER trg_recalculate_rating AFTER INSERT OR UPDATE OR DELETE ON reviews FOR EACH ROW EXECUTE FUNCTION recalculate_dish_rating();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsored_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read restaurants" ON restaurants FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read branches" ON branches FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read dishes" ON dishes FOR SELECT USING (status = 'active');
CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (is_hidden = FALSE);
CREATE POLICY "Public read replies" ON review_replies FOR SELECT USING (TRUE);
CREATE POLICY "Public read sponsored" ON sponsored_listings FOR SELECT USING (is_active = TRUE AND ends_at > NOW());
CREATE POLICY "Public read qr" ON qr_sessions FOR SELECT USING (TRUE);
CREATE POLICY "Anyone insert review" ON reviews FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users read own profile" ON users FOR SELECT USING (auth.uid()::TEXT = id::TEXT);
CREATE POLICY "Users update own profile" ON users FOR UPDATE USING (auth.uid()::TEXT = id::TEXT);
CREATE POLICY "Users insert own profile" ON users FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users read own points" ON points_transactions FOR SELECT USING (auth.uid()::TEXT = user_id::TEXT);
CREATE POLICY "Users read own codes" ON discount_codes FOR SELECT USING (auth.uid()::TEXT = user_id::TEXT);
CREATE POLICY "Users read own orders" ON orders FOR SELECT USING (auth.uid()::TEXT = user_id::TEXT);
CREATE POLICY "Owners manage restaurant" ON restaurants FOR ALL USING (auth.uid()::TEXT = owner_id::TEXT);
CREATE POLICY "Owners manage branches" ON branches FOR ALL USING (auth.uid()::TEXT = (SELECT owner_id::TEXT FROM restaurants WHERE id = branches.restaurant_id));
CREATE POLICY "Owners manage dishes" ON dishes FOR ALL USING (auth.uid()::TEXT = (SELECT owner_id::TEXT FROM restaurants WHERE id = dishes.restaurant_id));
CREATE POLICY "Owners insert replies" ON review_replies FOR INSERT WITH CHECK (auth.uid()::TEXT = (SELECT owner_id::TEXT FROM restaurants WHERE id = review_replies.restaurant_id));
CREATE POLICY "Owners read subscription" ON subscriptions FOR SELECT USING (auth.uid()::TEXT = (SELECT owner_id::TEXT FROM restaurants WHERE id = subscriptions.restaurant_id));

-- =====================================================================
-- reviewer_profiles — public map of phone_hash -> display picture / nickname
-- so a reviewer's DP can show on all their reviews. Added after MVP.
-- =====================================================================
CREATE TABLE IF NOT EXISTS reviewer_profiles (
  phone_hash TEXT PRIMARY KEY,
  nickname TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reviewer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reviewer profiles" ON reviewer_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Anyone insert reviewer profile" ON reviewer_profiles FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone update reviewer profile" ON reviewer_profiles FOR UPDATE USING (TRUE);
