-- ==============================================================================
-- Dhanalakshmi Crackers - Enable Direct Online Product & Store Updates
-- Run this in Supabase Dashboard -> SQL Editor (Click 'New query', paste, and 'Run')
-- ==============================================================================

-- 1. Ensure RLS is enabled and modern columns exist
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url TEXT;

DROP POLICY IF EXISTS "Admin/Staff can manage products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Allow online products select" ON public.products;
DROP POLICY IF EXISTS "Allow online products insert" ON public.products;
DROP POLICY IF EXISTS "Allow online products update" ON public.products;
DROP POLICY IF EXISTS "Allow online products delete" ON public.products;
DROP POLICY IF EXISTS "Allow all online products management" ON public.products;

-- Everyone can view active products (or all products in admin)
CREATE POLICY "Allow online products select" ON public.products
    FOR SELECT USING (true);

-- Allow online product inserts, updates and deletes
CREATE POLICY "Allow online products insert" ON public.products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow online products update" ON public.products
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow online products delete" ON public.products
    FOR DELETE USING (true);

-- 2. Categories permissions
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/Staff can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Allow online categories select" ON public.categories;
DROP POLICY IF EXISTS "Allow online categories insert" ON public.categories;
DROP POLICY IF EXISTS "Allow online categories update" ON public.categories;
DROP POLICY IF EXISTS "Allow online categories delete" ON public.categories;

CREATE POLICY "Allow online categories select" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Allow online categories insert" ON public.categories
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow online categories update" ON public.categories
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow online categories delete" ON public.categories
    FOR DELETE USING (true);

-- 3. Business Settings permissions
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admin can update business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Allow online settings select" ON public.business_settings;
DROP POLICY IF EXISTS "Allow online settings upsert" ON public.business_settings;

CREATE POLICY "Allow online settings select" ON public.business_settings
    FOR SELECT USING (true);

CREATE POLICY "Allow online settings upsert" ON public.business_settings
    FOR ALL USING (true) WITH CHECK (true);

-- 4. Automatically confirm existing admin user in Supabase Auth
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email IN ('admin@dhanalakshmicrackers.com', 'sri@dhanalakshmicrackers.com');

-- 5. Insert/Update admin profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, 'Store Administrator', 'admin'
FROM auth.users
WHERE email IN ('admin@dhanalakshmicrackers.com', 'sri@dhanalakshmicrackers.com')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 6. RPC Function for direct atomic product upsert (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.upsert_product_online(
    p_id UUID,
    p_name TEXT,
    p_sku TEXT,
    p_price NUMERIC,
    p_original_price NUMERIC,
    p_stock_quantity INT,
    p_unit TEXT,
    p_image_url TEXT,
    p_description TEXT,
    p_category_id UUID,
    p_is_featured BOOLEAN,
    p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
BEGIN
    INSERT INTO public.products (
        id, name, sku, price, original_price, stock_quantity,
        unit, image_url, description, category_id, is_featured, is_active, updated_at
    ) VALUES (
        COALESCE(p_id, gen_random_uuid()),
        p_name,
        p_sku,
        p_price,
        p_original_price,
        p_stock_quantity,
        COALESCE(p_unit, 'Box'),
        p_image_url,
        p_description,
        p_category_id,
        COALESCE(p_is_featured, FALSE),
        COALESCE(p_is_active, TRUE),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        sku = EXCLUDED.sku,
        price = EXCLUDED.price,
        original_price = EXCLUDED.original_price,
        stock_quantity = EXCLUDED.stock_quantity,
        unit = EXCLUDED.unit,
        image_url = EXCLUDED.image_url,
        description = EXCLUDED.description,
        category_id = EXCLUDED.category_id,
        is_featured = EXCLUDED.is_featured,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    RETURNING * INTO v_result;

    RETURN to_jsonb(v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_product_online TO anon, authenticated;
