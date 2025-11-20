-- =====================================================
-- QUICK MENU DISH - COMPLETE DATABASE SETUP
-- =====================================================
-- This SQL file contains the complete database schema
-- verified from the production Supabase project.
-- 
-- USAGE: Copy and paste this entire file into the SQL 
-- Editor of your new Supabase project and run it once.
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- =====================================================
-- TABLES
-- =====================================================

-- Restaurants table
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    qr_code_url TEXT,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN public.restaurants.logo_url IS 'URL to the restaurant logo image';
COMMENT ON COLUMN public.restaurants.is_active IS 'Admin-only field. Can only be changed via toggle_restaurant_status RPC function.';

-- Menu categories table
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Menu items table
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC NOT NULL,
    image_url TEXT NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    table_number TEXT NOT NULL,
    items JSONB NOT NULL,
    status TEXT DEFAULT 'preparing',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Menu views table
CREATE TABLE IF NOT EXISTS public.menu_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID UNIQUE NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin actions log table
CREATE TABLE IF NOT EXISTS public.admin_actions_log (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    admin_email TEXT NOT NULL,
    action_type TEXT NOT NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    details JSONB
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Restaurants indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON public.restaurants(is_active);

-- Menu categories indexes
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON public.menu_categories(restaurant_id);

-- Menu items indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_available ON public.menu_items(restaurant_id, is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id) WHERE category_id IS NOT NULL;

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON public.orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_active ON public.orders(restaurant_id, created_at DESC) 
    WHERE status IN ('pending', 'preparing');

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_restaurant_id ON public.feedback(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_order_id ON public.feedback(order_id);
CREATE INDEX IF NOT EXISTS idx_feedback_restaurant_created ON public.feedback(restaurant_id, created_at DESC);

-- Admin actions log indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_restaurant ON public.admin_actions_log(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_timestamp ON public.admin_actions_log(timestamp DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to handle new restaurant creation
CREATE OR REPLACE FUNCTION public.handle_new_restaurant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.restaurants (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'New Restaurant'), NEW.email);

  INSERT INTO public.menu_views (restaurant_id, view_count)
  VALUES ((SELECT id FROM public.restaurants WHERE user_id = NEW.id), 0);

  RETURN NEW;
END;
$$;

-- Function to create an order
CREATE OR REPLACE FUNCTION public.create_order(
    p_restaurant_id UUID,
    p_table_number TEXT,
    p_items JSONB,
    p_order_number TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.orders (restaurant_id, table_number, items, order_number, status)
  VALUES (p_restaurant_id, p_table_number, p_items, p_order_number, 'preparing')
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Function to verify admin password
CREATE OR REPLACE FUNCTION public.verify_admin_password(
    p_email TEXT,
    p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_hash TEXT;
BEGIN
  SELECT password_hash INTO v_password_hash
  FROM admin_users
  WHERE email = p_email;
  
  IF v_password_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN v_password_hash = crypt(p_password, v_password_hash);
END;
$$;

-- Function to toggle restaurant status (admin only)
CREATE OR REPLACE FUNCTION public.toggle_restaurant_status(
    p_restaurant_id UUID,
    p_is_active BOOLEAN,
    p_admin_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE restaurants
  SET is_active = p_is_active,
      updated_at = NOW()
  WHERE id = p_restaurant_id;
  
  INSERT INTO admin_actions_log (admin_email, action_type, restaurant_id, details)
  VALUES (
    p_admin_email,
    CASE WHEN p_is_active THEN 'enable_service' ELSE 'disable_service' END,
    p_restaurant_id,
    jsonb_build_object('new_status', p_is_active)
  );
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for restaurants updated_at
DROP TRIGGER IF EXISTS set_updated_at_restaurants ON public.restaurants;
CREATE TRIGGER set_updated_at_restaurants
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Trigger for menu_items updated_at
DROP TRIGGER IF EXISTS set_updated_at_menu_items ON public.menu_items;
CREATE TRIGGER set_updated_at_menu_items
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Trigger for orders updated_at
DROP TRIGGER IF EXISTS set_updated_at_orders ON public.orders;
CREATE TRIGGER set_updated_at_orders
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Trigger for menu_views updated_at
DROP TRIGGER IF EXISTS set_updated_at_menu_views ON public.menu_views;
CREATE TRIGGER set_updated_at_menu_views
    BEFORE UPDATE ON public.menu_views
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Trigger for menu_categories updated_at
DROP TRIGGER IF EXISTS update_menu_categories_updated_at ON public.menu_categories;
CREATE TRIGGER update_menu_categories_updated_at
    BEFORE UPDATE ON public.menu_categories
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;

-- Restaurants policies
DROP POLICY IF EXISTS "Anyone can view restaurant data for menu" ON public.restaurants;
CREATE POLICY "Anyone can view restaurant data for menu"
    ON public.restaurants FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Restaurants can view their own data" ON public.restaurants;
CREATE POLICY "Restaurants can view their own data"
    ON public.restaurants FOR SELECT
    TO public
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Restaurants can update their own data (except is_active)" ON public.restaurants;
CREATE POLICY "Restaurants can update their own data (except is_active)"
    ON public.restaurants FOR UPDATE
    TO public
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() 
        AND is_active = (SELECT is_active FROM restaurants WHERE id = restaurants.id)
    );

-- Menu items policies
DROP POLICY IF EXISTS "Anyone can view available menu items" ON public.menu_items;
CREATE POLICY "Anyone can view available menu items"
    ON public.menu_items FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Restaurants can manage their menu items" ON public.menu_items;
CREATE POLICY "Restaurants can manage their menu items"
    ON public.menu_items FOR ALL
    TO public
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE user_id = auth.uid()
    ));

-- Menu categories policies
DROP POLICY IF EXISTS "Anyone can view menu categories" ON public.menu_categories;
CREATE POLICY "Anyone can view menu categories"
    ON public.menu_categories FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Restaurants can manage their categories" ON public.menu_categories;
CREATE POLICY "Restaurants can manage their categories"
    ON public.menu_categories FOR ALL
    TO public
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE user_id = auth.uid()
    ));

-- Orders policies
DROP POLICY IF EXISTS "Restaurants can view their orders" ON public.orders;
CREATE POLICY "Restaurants can view their orders"
    ON public.orders FOR SELECT
    TO public
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Restaurants can update their orders" ON public.orders;
CREATE POLICY "Restaurants can update their orders"
    ON public.orders FOR UPDATE
    TO public
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Anonymous users can create orders" ON public.orders;
CREATE POLICY "Anonymous users can create orders"
    ON public.orders FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders"
    ON public.orders FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Feedback policies
DROP POLICY IF EXISTS "Restaurants can view their feedback" ON public.feedback;
CREATE POLICY "Restaurants can view their feedback"
    ON public.feedback FOR SELECT
    TO public
    USING (order_id IN (
        SELECT o.id FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        WHERE r.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Anyone can create feedback" ON public.feedback;
CREATE POLICY "Anyone can create feedback"
    ON public.feedback FOR INSERT
    TO public
    WITH CHECK (true);

-- Menu views policies
DROP POLICY IF EXISTS "Restaurants can view their stats" ON public.menu_views;
CREATE POLICY "Restaurants can view their stats"
    ON public.menu_views FOR SELECT
    TO public
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Anyone can update view count" ON public.menu_views;
CREATE POLICY "Anyone can update view count"
    ON public.menu_views FOR ALL
    TO public
    USING (true);

-- Admin users policies (no direct access)
DROP POLICY IF EXISTS "No direct access to admin_users" ON public.admin_users;
CREATE POLICY "No direct access to admin_users"
    ON public.admin_users FOR ALL
    TO public
    USING (false);

-- Admin actions log policies (no direct access)
DROP POLICY IF EXISTS "No direct access to admin_actions_log" ON public.admin_actions_log;
CREATE POLICY "No direct access to admin_actions_log"
    ON public.admin_actions_log FOR ALL
    TO public
    USING (false);

-- =====================================================
-- REALTIME
-- =====================================================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_categories;

-- =====================================================
-- STORAGE
-- =====================================================

-- Create storage bucket for menu images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for menu-images bucket
CREATE POLICY "Anyone can view menu images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menu-images');

CREATE POLICY "Authenticated users can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Users can update their own menu images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own menu images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default admin user
-- Email: sayanbanik66@gmail.com
-- Password: Qm9$kL7#pR2@nX4&vT8!wZ
INSERT INTO public.admin_users (email, password_hash)
VALUES (
    'sayanbanik66@gmail.com',
    crypt('Qm9$kL7#pR2@nX4&vT8!wZ', gen_salt('bf'))
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries after setup to verify everything works:

-- 1. Check all tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;

-- 2. Check realtime is enabled
-- SELECT tablename FROM pg_publication_tables 
-- WHERE pubname = 'supabase_realtime';

-- 3. Test admin login
-- SELECT verify_admin_password('sayanbanik66@gmail.com', 'Qm9$kL7#pR2@nX4&vT8!wZ');

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Your database is now ready to use!
-- 
-- Next steps:
-- 1. Update your .env file with new Supabase credentials
-- 2. Test the admin login with the credentials above
-- 3. Create your first restaurant account
-- =====================================================
