-- ==============================================================================
-- Dhanalakshmi Crackers - Sample Seed Data
-- ==============================================================================

-- 1. Insert Initial Business Settings
INSERT INTO public.business_settings (
    id,
    shop_name,
    business_category,
    tagline,
    phone,
    whatsapp_phone,
    email,
    address,
    operating_hours,
    business_description,
    gst_number,
    upi_id,
    upi_name,
    currency_symbol,
    currency_code,
    time_zone,
    tax_applicable,
    default_tax_rate,
    invoice_prefix,
    invoice_footer
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Dhanalakshmi Crackers',
    'Fireworks Supplier / Store',
    'Direct from Sivakasi - 100% Genuine, Safe & Certified Fireworks',
    '+91 94431 88531',
    '+91 94431 88531',
    'support@dhanalakshmicrackers.com',
    '142, By-pass Road, Near Kamaraj Statue, Sivakasi, Tamil Nadu - 626123',
    'Mon - Sun: 09:00 AM - 10:00 PM',
    'Wholesale and retail distributor of authentic Sivakasi fireworks, certified safety standards, factory direct pricing.',
    '33AAAAA0000A1Z5',
    'dhanalakshmi@upi',
    'Dhanalakshmi Crackers Sivakasi',
    '₹',
    'INR',
    'Asia/Kolkata',
    true,
    18.00,
    'DC-',
    'Thank you for shopping with Dhanalakshmi Crackers! We wish you a sparkling, safe and joyful festival!'
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Categories
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
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Products
INSERT INTO public.products (
    id, name, sku, category_id, description, price, original_price, stock_quantity, min_stock_alert, unit, is_featured, is_active, image_url
) VALUES
-- Sparklers
('c1000000-0000-0000-0000-000000000001', '10cm Electric Sparklers (10 Pcs)', 'SPK-10EL', 'b1000000-0000-0000-0000-000000000001', 'Dazzling silver sparklers with smooth low-smoke burning, ideal for young children.', 35.00, 60.00, 250, 20, 'Box (10 Pcs)', true, true, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000002', '15cm Color Sparklers (5 in 1 Box)', 'SPK-15COL', 'b1000000-0000-0000-0000-000000000001', 'Assorted red, green, yellow, silver and gold sparklers with extended burning duration.', 85.00, 150.00, 180, 20, 'Box (10 Pcs)', true, true, 'https://images.unsplash.com/photo-1543257580-7269da773bf5?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000003', '30cm Giant Gold Sparklers (5 Pcs)', 'SPK-30GLD', 'b1000000-0000-0000-0000-000000000001', 'Extra long jumbo gold glitter sparklers with majestic 3-minute sparkling performance.', 130.00, 220.00, 140, 15, 'Box (5 Pcs)', false, true, 'https://images.unsplash.com/photo-1508717272800-9fff97da7e8f?w=600&auto=format&fit=crop&q=80'),

-- Ground Chakkars
('c1000000-0000-0000-0000-000000000004', 'Ground Chakkars Deluxe (10 Pcs)', 'CHK-DLX10', 'b1000000-0000-0000-0000-000000000002', 'High-speed spinning wheels generating bright golden floral discs on the ground.', 95.00, 180.00, 160, 25, 'Box (10 Pcs)', true, true, 'https://images.unsplash.com/photo-1531844251246-9a1bfaae09fc?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000005', 'Special 4x4 Whistling Chakkar (5 Pcs)', 'CHK-WHT5', 'b1000000-0000-0000-0000-000000000002', 'Spins with multi-stage whistling sound followed by showers of multi-color starry rings.', 140.00, 260.00, 90, 15, 'Box (5 Pcs)', true, true, 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=600&auto=format&fit=crop&q=80'),

-- Flower Pots
('c1000000-0000-0000-0000-000000000006', 'Flower Pots Special (10 Pcs)', 'FLP-SPC10', 'b1000000-0000-0000-0000-000000000003', 'Classic Sivakasi flower pots throwing golden and silvery plumes up to 8 feet.', 120.00, 240.00, 200, 20, 'Box (10 Pcs)', true, true, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000007', 'Color Koti Giant Flower Pots (5 Pcs)', 'FLP-KOTI5', 'b1000000-0000-0000-0000-000000000003', 'Grand conical pots that erupt into tri-color fountain sparks reaching 15 feet high.', 210.00, 400.00, 85, 10, 'Box (5 Pcs)', true, true, 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=600&auto=format&fit=crop&q=80'),

-- Rockets & Missiles
('c1000000-0000-0000-0000-000000000008', 'Baby Rocket Sound & Flash (10 Pcs)', 'RCK-BBY10', 'b1000000-0000-0000-0000-000000000004', 'High-altitude swift rockets finishing with a crisp bang and silver shower.', 75.00, 150.00, 150, 20, 'Box (10 Pcs)', false, true, 'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000009', 'Whistling Lunik Rockets (10 Pcs)', 'RCK-LNK10', 'b1000000-0000-0000-0000-000000000004', 'Dramatic siren whistle ascent terminating into vibrant multi-color aerial stars.', 190.00, 360.00, 110, 15, 'Box (10 Pcs)', true, true, 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80'),

-- Sky Shots (Aerial Repeaters)
('c1000000-0000-0000-0000-000000000010', '12 Shots Aerial Spectacular Cake', 'SHT-12SKY', 'b1000000-0000-0000-0000-000000000005', '12 consecutive multi-color peony shells with crackling gold tail bursting in sky.', 380.00, 750.00, 95, 10, 'Piece', true, true, 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000011', '30 Shots Golden Brocade Night King', 'SHT-30BRC', 'b1000000-0000-0000-0000-000000000005', 'Spectacular continuous display of 30 golden palms with ruby red and sapphire blue stars.', 890.00, 1750.00, 60, 5, 'Piece', true, true, 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80'),

-- Sound Crackers
('c1000000-0000-0000-0000-000000000012', 'Digital 28 Chorsa Crackers (Packet)', 'SND-28CHR', 'b1000000-0000-0000-0000-000000000006', 'Traditional Sivakasi red crackers with crisp rhythmic bursting sounds.', 28.00, 55.00, 300, 30, 'Packet', false, true, 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000013', 'Classic Hydro Green Atom Bomb (10 Pcs)', 'SND-HYD10', 'b1000000-0000-0000-0000-000000000006', 'High-decibel thunderous sounding green atom bomb in safe packaging.', 85.00, 160.00, 175, 20, 'Box (10 Pcs)', true, true, 'https://images.unsplash.com/photo-1508717272800-9fff97da7e8f?w=600&auto=format&fit=crop&q=80'),

-- Family Gift Boxes
('c1000000-0000-0000-0000-000000000014', 'Dhanalakshmi Family Delight (25 Items Box)', 'BOX-DLT25', 'b1000000-0000-0000-0000-000000000007', 'Complete family hamper with sparklers, chakkars, pots, pencil torches and kids novelties.', 799.00, 1600.00, 70, 8, 'Gift Box', true, true, 'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000015', 'Royal Sivakasi Maha Diwali Box (50 Items)', 'BOX-ROY50', 'b1000000-0000-0000-0000-000000000007', 'Grand festive box with aerial repeaters, whistling rockets, deluxe flower pots, and sound bombs.', 1799.00, 3800.00, 45, 5, 'Gift Box', true, true, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Customers
INSERT INTO public.customers (id, full_name, phone, email, address, city, pincode, total_orders, total_spent) VALUES
('d1000000-0000-0000-0000-000000000001', 'Ramesh Kumar', '9840123456', 'ramesh@example.com', '45, Anna Nagar 2nd Street', 'Chennai', '600040', 2, 2450.00),
('d1000000-0000-0000-0000-000000000002', 'Priya Sundaram', '9884567890', 'priya.s@example.com', '12/A, R.S. Puram West', 'Coimbatore', '641002', 1, 1799.00),
('d1000000-0000-0000-0000-000000000003', 'Murugan Velayudham', '9443198765', 'murugan.v@example.com', '88, Sattur Main Road', 'Sivakasi', '626123', 3, 4200.00)
ON CONFLICT (id) DO NOTHING;

-- 5. Verified Google Customer Reviews
INSERT INTO public.reviews (id, customer_name, rating, comment, city, is_verified, source) VALUES
('e1000000-0000-0000-0000-000000000001', 'S. Karthikeyan', 5, 'Best crackers shop in Sivakasi! Ordered 30 Shots Golden Brocade and 25 Items Family Box. Every single piece burst with vibrant colours, zero duds. Wholesale prices are truly authentic.', 'Chennai', true, 'google'),
('e1000000-0000-0000-0000-000000000002', 'Anandhi Rajan', 5, 'Super fast dispatch and solid waterproof corrugated box packing. Kids loved the electric sparklers and color koti flower pots. Very low smoke and 100% safe.', 'Coimbatore', true, 'google'),
('e1000000-0000-0000-0000-000000000003', 'Vignesh M.', 5, 'Buying from Dhanalakshmi Crackers for 3 consecutive Diwalis now. Direct factory rate saved us almost 60% compared to local city retail stalls. Instant WhatsApp bill received.', 'Madurai', true, 'google'),
('e1000000-0000-0000-0000-000000000004', 'Rajesh Kumar', 5, '12 Shots sky repeaters and whistling lunik rockets were mind-blowing. The sky was lit up for minutes. Top notch Sivakasi quality and very polite customer service.', 'Bangalore', true, 'google'),
('e1000000-0000-0000-0000-000000000005', 'Priya Sundaram', 5, 'Visited their Sivakasi outlet directly. Very organized POS counter billing, transparent price list, and certified PESO standard crackers. Highly recommend for family celebrations!', 'Sivakasi', true, 'google')
ON CONFLICT (id) DO NOTHING;

