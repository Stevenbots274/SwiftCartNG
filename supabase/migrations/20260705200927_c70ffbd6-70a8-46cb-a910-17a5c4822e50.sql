
-- Seller applications: expand for real review workflow
ALTER TABLE public.seller_applications
  ADD COLUMN IF NOT EXISTS business_address text,
  ADD COLUMN IF NOT EXISTS category_focus text,
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS why_sell text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS seller_applications_user_id_key ON public.seller_applications(user_id);

-- Products: featured + soft delete
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Reviews: moderation
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;

-- Orders: fulfillment
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

-- Payouts
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_kobo bigint NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  paid_at timestamptz,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sellers view own payouts" ON public.payouts FOR SELECT TO authenticated USING (auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage payouts" ON public.payouts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Platform settings (singleton)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  store_name text NOT NULL DEFAULT 'SwiftCartNG',
  platform_fee_percent numeric NOT NULL DEFAULT 5,
  standard_delivery_kobo bigint NOT NULL DEFAULT 150000,
  express_delivery_kobo bigint NOT NULL DEFAULT 300000,
  free_delivery_threshold_kobo bigint NOT NULL DEFAULT 2000000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "admins update settings" ON public.platform_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.platform_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- RPC: approve seller
CREATE OR REPLACE FUNCTION public.approve_seller(_app_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve sellers';
  END IF;
  SELECT user_id INTO _uid FROM public.seller_applications WHERE id = _app_id;
  IF _uid IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  UPDATE public.seller_applications SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = NULL WHERE id = _app_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'seller') ON CONFLICT DO NOTHING;
  INSERT INTO public.notifications (user_id, title, body, link) VALUES (_uid, 'You''re now a seller! 🎉', 'Your seller application was approved. Start listing products now.', '/seller');
END;
$$;

-- RPC: reject seller
CREATE OR REPLACE FUNCTION public.reject_seller(_app_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject sellers';
  END IF;
  SELECT user_id INTO _uid FROM public.seller_applications WHERE id = _app_id;
  IF _uid IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  UPDATE public.seller_applications SET status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = _reason WHERE id = _app_id;
  INSERT INTO public.notifications (user_id, title, body, link) VALUES (_uid, 'Seller application update', 'Your application needs changes: ' || COALESCE(_reason,'See details in your dashboard.'), '/seller');
END;
$$;

-- RPC: assign / revoke role (admin only)
CREATE OR REPLACE FUNCTION public.assign_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role) ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _user_id = auth.uid() AND _role = 'admin' THEN RAISE EXCEPTION 'Cannot revoke own admin role'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
END;
$$;

-- RPC: refund order (marks refunded; actual Paystack refund handled server-side)
CREATE OR REPLACE FUNCTION public.mark_order_refunded(_order_id uuid, _note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT user_id INTO _uid FROM public.orders WHERE id = _order_id;
  UPDATE public.orders SET status = 'cancelled', admin_notes = COALESCE(admin_notes || E'\n','') || 'Refund: ' || COALESCE(_note,'') WHERE id = _order_id;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link) VALUES (_uid, 'Order refunded', COALESCE(_note,'Your order was refunded.'), '/order/' || _order_id::text);
  END IF;
END;
$$;

-- Admin policies for reading everything (were seller-only before)
DROP POLICY IF EXISTS "admins read all seller apps" ON public.seller_applications;
CREATE POLICY "admins read all seller apps" ON public.seller_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins read all orders" ON public.orders;
CREATE POLICY "admins read all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins update all orders" ON public.orders;
CREATE POLICY "admins update all orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins update all products" ON public.products;
CREATE POLICY "admins update all products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins delete products" ON public.products;
CREATE POLICY "admins delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins moderate reviews" ON public.reviews;
CREATE POLICY "admins moderate reviews" ON public.reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins delete reviews" ON public.reviews;
CREATE POLICY "admins delete reviews" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
