
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'customer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PRODUCTS  (price_kobo = NGN * 100 for precision)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_kobo BIGINT NOT NULL CHECK (price_kobo >= 0),
  compare_at_kobo BIGINT,
  stock INT NOT NULL DEFAULT 0,
  image_url TEXT,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  badge TEXT, -- 'new' | 'sale' | 'top' | null
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products public read active" ON public.products FOR SELECT TO anon, authenticated USING (is_active = true OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sellers insert own products" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id AND (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Sellers update own products" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sellers delete own products" ON public.products FOR DELETE TO authenticated USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product images public read" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Sellers manage own product images" ON public.product_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- WISHLIST
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON public.wishlists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CART
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ORDERS
CREATE TYPE public.order_status AS ENUM ('pending','processing','packed','shipped','out_for_delivery','delivered','cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  paystack_reference TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  subtotal_kobo BIGINT NOT NULL,
  delivery_kobo BIGINT NOT NULL DEFAULT 0,
  total_kobo BIGINT NOT NULL,
  delivery_method TEXT,
  shipping_address JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  seller_id UUID,
  title TEXT NOT NULL,
  image_url TEXT,
  quantity INT NOT NULL,
  unit_price_kobo BIGINT NOT NULL
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  OR seller_id = auth.uid()
);
CREATE POLICY "Users insert own order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public read" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users manage own reviews" ON public.reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SELLER APPLICATIONS
CREATE TABLE public.seller_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.seller_applications TO authenticated;
GRANT ALL ON public.seller_applications TO service_role;
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own application" ON public.seller_applications FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own application" ON public.seller_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage applications" ON public.seller_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED CATEGORIES
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Electronics','electronics','Tv',1),
  ('Fashion','fashion','Shirt',2),
  ('Phones & Tablets','phones-tablets','Smartphone',3),
  ('Computing','computing','Laptop',4),
  ('Home & Kitchen','home-kitchen','Utensils',5),
  ('Beauty & Health','beauty-health','Sparkles',6),
  ('Shoes & Bags','shoes-bags','ShoppingBag',7),
  ('Watches & Accessories','watches-accessories','Watch',8),
  ('Automobile','automobile','Car',9),
  ('Groceries','groceries','Apple',10);

-- SEED PRODUCTS  (prices in kobo; ₦ = kobo/100)
WITH c AS (SELECT id, slug FROM public.categories)
INSERT INTO public.products (category_id, title, slug, description, price_kobo, compare_at_kobo, stock, image_url, rating, review_count, badge) VALUES
  ((SELECT id FROM c WHERE slug='phones-tablets'),'iPhone 15 Pro Max 256GB','iphone-15-pro-max-256gb','Titanium finish, A17 Pro chip, 48MP camera.',149000000,169000000,25,'https://images.unsplash.com/photo-1592286927505-1def25115558?w=800',4.9,214,'top'),
  ((SELECT id FROM c WHERE slug='computing'),'MacBook Air M3 13"','macbook-air-m3-13','8-core CPU, 10-core GPU, 16GB unified memory.',132500000,145000000,10,'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',4.8,98,'new'),
  ((SELECT id FROM c WHERE slug='electronics'),'Sony WH-1000XM5 Headphones','sony-wh-1000xm5','Industry-leading noise cancellation, 30h battery.',24500000,29900000,40,'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800',4.7,332,'sale'),
  ((SELECT id FROM c WHERE slug='fashion'),'Men''s Slim Fit Denim Jacket','mens-slim-fit-denim-jacket','Premium washed denim, tailored fit.',1850000,2500000,60,'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',4.5,120,'sale'),
  ((SELECT id FROM c WHERE slug='shoes-bags'),'Nike Air Max Sneakers','nike-air-max-sneakers','Cushioned Air unit, breathable mesh.',6500000,8200000,80,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',4.6,540,'top'),
  ((SELECT id FROM c WHERE slug='watches-accessories'),'Apple Watch Series 9 GPS','apple-watch-series-9-gps','S9 chip, brighter display, Double Tap gesture.',38900000,42500000,18,'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800',4.8,145,'new'),
  ((SELECT id FROM c WHERE slug='beauty-health'),'Nivea Body Care Gift Set','nivea-body-care-gift-set','Lotion, shower gel and cream trio.',850000,1200000,150,'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',4.4,78,'sale'),
  ((SELECT id FROM c WHERE slug='home-kitchen'),'Philips Air Fryer XXL 7.3L','philips-air-fryer-xxl','Rapid Air tech, 90% less fat cooking.',18500000,22000000,22,'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800',4.7,201,'top'),
  ((SELECT id FROM c WHERE slug='electronics'),'Samsung 55" 4K Smart TV','samsung-55-4k-smart-tv','Crystal UHD, Tizen OS, HDR10+.',45900000,55000000,12,'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800',4.6,89,'sale'),
  ((SELECT id FROM c WHERE slug='phones-tablets'),'Samsung Galaxy Tab S9','samsung-galaxy-tab-s9','11" AMOLED, S Pen included, 8GB RAM.',52000000,62000000,15,'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',4.5,64,'new'),
  ((SELECT id FROM c WHERE slug='fashion'),'Women''s Ankara Print Dress','womens-ankara-print-dress','Handmade Nigerian Ankara midi dress.',1250000,1800000,45,'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',4.7,156,'top'),
  ((SELECT id FROM c WHERE slug='groceries'),'Golden Penny Semolina 5kg','golden-penny-semolina-5kg','Premium semolina, family pack.',680000,750000,300,'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800',4.3,42,NULL);
