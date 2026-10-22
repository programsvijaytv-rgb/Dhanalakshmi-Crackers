-- ==============================================================================
-- Dhanalakshmi Crackers - Category & Variable Product Migration 2026
-- Run this script in the Supabase Dashboard SQL Editor
-- ==============================================================================

-- 1. Add video_url, has_variants, variants columns if not exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS guide_video_url TEXT DEFAULT 'https://www.youtube.com/watch?v=kY7XlB8mS78';

-- 2. Upsert the 15 Categories
INSERT INTO public.categories (id, name, slug, description, display_order, is_active) VALUES
('b1000000-0000-0000-0000-000000000001', 'Gift Box', 'gift-box', 'Family festival gift boxes with assortments of Sivakasi crackers', 1, true),
('b1000000-0000-0000-0000-000000000002', 'Sparklers - ஸ்பார்க்லர்', 'sparklers', 'Classic golden, silver, red, green and crackling sparklers safe for kids', 2, true),
('b1000000-0000-0000-0000-000000000003', 'Chakkar - சக்கரம்', 'chakkar', 'Vibrant whirling wheels, special deluxe zamin chakkars with glittering sparks', 3, true),
('b1000000-0000-0000-0000-000000000004', 'Flower Pots - பூச்சட்டி', 'flower-pots', 'Towering fountains of multicolored sparks and ashoka showers', 4, true),
('b1000000-0000-0000-0000-000000000005', 'Pencil | Twinkling Star', 'pencil-twinkling-star', 'Handheld sparkling magical pencils and twinkling festive torches', 5, true),
('b1000000-0000-0000-0000-000000000006', 'Match Sticks - தீப்பெட்டி', 'match-sticks', 'Mega deluxe fireworks safety strike matchboxes for easy lighting', 6, true),
('b1000000-0000-0000-0000-000000000007', 'Bijili - பிஜிலி', 'bijili', 'Traditional striped Sivakasi crackling sound pouches', 7, true),
('b1000000-0000-0000-0000-000000000008', 'Wala - வாலா', 'wala', '100, 1000, 5000 and 10000 auspicious garland ladis', 8, true),
('b1000000-0000-0000-0000-000000000009', 'Rocket - ராக்கெட்', 'rocket', 'Whistling sound rockets, parachute showers, and tri-color sky soaring rockets', 9, true),
('b1000000-0000-0000-0000-000000000010', 'Fancy Crackers - பேன்சி கிராக்கர்', 'fancy-crackers', 'Peacock wheels, butterfly and helicopter flying spinners', 10, true),
('b1000000-0000-0000-0000-000000000011', 'Night Out - நைட் அவுட்', 'night-out', 'Golden waterfall fountains, sirens and night novelty fountains', 11, true),
('b1000000-0000-0000-0000-000000000012', 'Multi Colour Fancy out - மல்டி கலர் பேன்சி அவுட்', 'multi-colour-fancy-out', 'Multi-shot night show aerial repeaters with mesmerizing bursts', 12, true),
('b1000000-0000-0000-0000-000000000013', 'Bombs - பாம்', 'bombs', 'Traditional Sivakasi hydro atom bombs and thunder sound crackers', 13, true),
('b1000000-0000-0000-0000-000000000014', 'Gun - கன்', 'gun', 'Die-cast metal toy cracker pistols and 8-shot ring caps refills', 14, true),
('b1000000-0000-0000-0000-000000000015', 'Others', 'others', 'Snake tablets, musical whistles and novelties', 15, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- 3. Update the RPC function upsert_product_online to accept video_url, has_variants, and variants
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
    p_is_active BOOLEAN,
    p_video_url TEXT DEFAULT NULL,
    p_has_variants BOOLEAN DEFAULT FALSE,
    p_variants JSONB DEFAULT '[]'::jsonb
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
        unit, image_url, description, category_id, is_featured, is_active,
        video_url, has_variants, variants, updated_at
    ) VALUES (
        p_id, p_name, p_sku, p_price, p_original_price, p_stock_quantity,
        p_unit, p_image_url, p_description, p_category_id, p_is_featured, p_is_active,
        p_video_url, p_has_variants, p_variants, NOW()
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
        video_url = EXCLUDED.video_url,
        has_variants = EXCLUDED.has_variants,
        variants = EXCLUDED.variants,
        updated_at = NOW()
    RETURNING * INTO v_result;

    RETURN to_jsonb(v_result);
END;
$$;
