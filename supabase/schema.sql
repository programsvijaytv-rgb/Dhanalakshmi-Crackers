-- ==============================================================================
-- Dhanalakshmi Crackers - Supabase PostgreSQL Database Schema
-- Complete E-Commerce + Admin Panel + POS Billing Schema with RLS & Transactions
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles & Admin Roles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Business Settings
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_name TEXT NOT NULL DEFAULT 'Dhanalakshmi Crackers',
    business_category TEXT DEFAULT 'Fireworks Supplier / Store',
    tagline TEXT DEFAULT 'Direct from Sivakasi - Safe, Superior & Certified Fireworks',
    phone TEXT DEFAULT '+91 94431 88531',
    whatsapp_phone TEXT DEFAULT '+91 94431 88531',
    email TEXT DEFAULT 'sales@dhanalakshmicrackers.com',
    address TEXT DEFAULT 'No.33 Vengatesh Perumal Kovil Street, Maharnonbu Chavadi, Thanjavur, Tamil Nadu 613001',
    operating_hours TEXT DEFAULT 'Mon - Sun: 09:00 AM - 10:00 PM',
    business_description TEXT DEFAULT 'Wholesale and retail distributor of authentic Sivakasi fireworks and crackers.',
    gst_number TEXT DEFAULT '33AAAAA0000A1Z5',
    upi_id TEXT DEFAULT 'dhanalakshmi@upi',
    upi_name TEXT DEFAULT 'Dhanalakshmi Crackers',
    currency_symbol TEXT DEFAULT '₹',
    currency_code TEXT DEFAULT 'INR',
    time_zone TEXT DEFAULT 'Asia/Kolkata',
    tax_applicable BOOLEAN DEFAULT TRUE,
    default_tax_rate NUMERIC(5, 2) DEFAULT 18.00, -- GST rate (18% for fireworks)
    invoice_prefix TEXT DEFAULT 'DC-',
    invoice_footer TEXT DEFAULT 'Thank you for celebrating with Dhanalakshmi Crackers! Have a safe and joyous Diwali.',
    terms_conditions TEXT DEFAULT '1. Goods once sold will not be taken back. 2. Store in a cool and dry place away from heat. 3. Adult supervision is required for children.',
    logo_url TEXT,
    google_review_url TEXT DEFAULT 'https://share.google/RqWbas77JcB57AOT2',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(10, 2) CHECK (original_price >= price),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_alert INT DEFAULT 10,
    unit TEXT DEFAULT 'Box', -- Box, Packet, Piece, Case
    image_url TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    address TEXT,
    city TEXT,
    pincode TEXT,
    total_orders INT DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 7. Online Customer Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_address TEXT NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dispatched', 'delivered', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    payment_method TEXT DEFAULT 'COD' CHECK (payment_method IN ('COD', 'UPI', 'ONLINE', 'CASH')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 8. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 9. Invoices Table (POS & Online Billing)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
    customer_phone TEXT,
    customer_address TEXT,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'UPI', 'ONLINE', 'CARD', 'SPLIT')),
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'cancelled')),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 10. Invoice Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 11. Payments Records Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'UPI', 'ONLINE', 'CARD')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'pending', 'failed', 'refunded')),
    transaction_ref TEXT,
    payment_gateway TEXT,
    gateway_order_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 12. Inventory Movements Audit Log
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    change_qty INT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('pos_sale', 'online_order', 'restock', 'damage_write_off', 'manual_adjustment')),
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 13. Customer Reviews Table (Google & Storefront verified reviews)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    city TEXT DEFAULT 'Verified Customer',
    is_verified BOOLEAN DEFAULT TRUE,
    source TEXT DEFAULT 'google', -- 'google' or 'website'
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- ==============================================================================
-- ATOMIC STORED PROCEDURE: POS Invoice Creation & Stock Deduction
-- Prevents race conditions and duplicate deductions
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_pos_invoice(
    p_invoice_number TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_subtotal NUMERIC,
    p_discount_amount NUMERIC,
    p_tax_rate NUMERIC,
    p_tax_amount NUMERIC,
    p_total_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_notes TEXT,
    p_created_by UUID,
    p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_product_name TEXT;
    v_sku TEXT;
    v_unit_price NUMERIC;
    v_qty INT;
    v_line_subtotal NUMERIC;
    v_current_stock INT;
BEGIN
    -- Check if invoice number already exists to prevent duplicate submission
    IF EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = p_invoice_number) THEN
        RAISE EXCEPTION 'Invoice % already exists.', p_invoice_number;
    END IF;

    -- Insert Invoice Record
    INSERT INTO public.invoices (
        invoice_number,
        customer_name,
        customer_phone,
        customer_address,
        subtotal,
        discount_amount,
        tax_rate,
        tax_amount,
        total_amount,
        payment_method,
        payment_status,
        notes,
        created_by
    ) VALUES (
        p_invoice_number,
        COALESCE(p_customer_name, 'Walk-in Customer'),
        p_customer_phone,
        p_customer_address,
        p_subtotal,
        p_discount_amount,
        p_tax_rate,
        p_tax_amount,
        p_total_amount,
        p_payment_method,
        p_payment_status,
        p_notes,
        p_created_by
    ) RETURNING id INTO v_invoice_id;

    -- Process Each Item atomically
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_product_name := v_item->>'product_name';
        v_sku := v_item->>'sku';
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_qty := (v_item->>'quantity')::INT;
        v_line_subtotal := (v_item->>'subtotal')::NUMERIC;

        -- Insert line item
        INSERT INTO public.invoice_items (
            invoice_id,
            product_id,
            product_name,
            sku,
            unit_price,
            quantity,
            subtotal
        ) VALUES (
            v_invoice_id,
            v_product_id,
            v_product_name,
            v_sku,
            v_unit_price,
            v_qty,
            v_line_subtotal
        );

        -- If product exists in inventory, deduct stock & record movement
        IF v_product_id IS NOT NULL THEN
            SELECT stock_quantity INTO v_current_stock
            FROM public.products
            WHERE id = v_product_id
            FOR UPDATE; -- Row-level lock against concurrent POS purchases

            IF v_current_stock < v_qty THEN
                RAISE EXCEPTION 'Insufficient stock for product: %. Available: %, Requested: %', v_product_name, v_current_stock, v_qty;
            END IF;

            UPDATE public.products
            SET stock_quantity = stock_quantity - v_qty,
                updated_at = NOW()
            WHERE id = v_product_id;

            -- Log movement
            INSERT INTO public.inventory_movements (
                product_id,
                change_qty,
                reason,
                reference_id
            ) VALUES (
                v_product_id,
                -v_qty,
                'pos_sale',
                p_invoice_number
            );
        END IF;
    END LOOP;

    -- Record Payment transaction
    INSERT INTO public.payments (
        invoice_id,
        payment_method,
        amount,
        status,
        transaction_ref
    ) VALUES (
        v_invoice_id,
        p_payment_method,
        p_total_amount,
        CASE WHEN p_payment_status = 'paid' THEN 'success' ELSE 'pending' END,
        p_invoice_number
    );

    -- Update or insert Customer record if phone number provided
    IF p_customer_phone IS NOT NULL AND length(trim(p_customer_phone)) >= 10 THEN
        INSERT INTO public.customers (full_name, phone, address, total_orders, total_spent)
        VALUES (COALESCE(p_customer_name, 'Walk-in Customer'), trim(p_customer_phone), p_customer_address, 1, p_total_amount)
        ON CONFLICT (phone) DO UPDATE
        SET total_orders = customers.total_orders + 1,
            total_spent = customers.total_spent + EXCLUDED.total_spent,
            full_name = CASE WHEN customers.full_name = 'Walk-in Customer' AND EXCLUDED.full_name <> 'Walk-in Customer' 
                             THEN EXCLUDED.full_name ELSE customers.full_name END,
            updated_at = NOW();
    END IF;

    RETURN v_invoice_id;
END;
$$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if auth user is admin or staff
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'staff')
    );
$$;

-- Categories & Products: Public Read, Admin Write
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories" ON public.categories
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin/Staff can manage categories" ON public.categories;
CREATE POLICY "Admin/Staff can manage categories" ON public.categories
    FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin/Staff can manage products" ON public.products;
CREATE POLICY "Admin/Staff can manage products" ON public.products
    FOR ALL USING (public.is_admin_or_staff());

-- Business Settings: Public Read, Admin Write
DROP POLICY IF EXISTS "Public can read business settings" ON public.business_settings;
CREATE POLICY "Public can read business settings" ON public.business_settings
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admin can update business settings" ON public.business_settings;
CREATE POLICY "Admin can update business settings" ON public.business_settings
    FOR ALL USING (public.is_admin_or_staff());

-- Orders & Order Items: Public can insert their order, Admin can manage all
DROP POLICY IF EXISTS "Public can place orders" ON public.orders;
CREATE POLICY "Public can place orders" ON public.orders
    FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public can view their order by order_number" ON public.orders;
CREATE POLICY "Public can view their order by order_number" ON public.orders
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admin/Staff can manage orders" ON public.orders;
CREATE POLICY "Admin/Staff can manage orders" ON public.orders
    FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
CREATE POLICY "Public can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
CREATE POLICY "Public can view order items" ON public.order_items
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admin/Staff can manage order items" ON public.order_items;
CREATE POLICY "Admin/Staff can manage order items" ON public.order_items
    FOR ALL USING (public.is_admin_or_staff());

-- Invoices, Invoice Items & Payments: Admin/Staff only
DROP POLICY IF EXISTS "Admin/Staff can manage invoices" ON public.invoices;
CREATE POLICY "Admin/Staff can manage invoices" ON public.invoices
    FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Admin/Staff can manage invoice items" ON public.invoice_items;
CREATE POLICY "Admin/Staff can manage invoice items" ON public.invoice_items
    FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Admin/Staff can manage payments" ON public.payments;
CREATE POLICY "Admin/Staff can manage payments" ON public.payments
    FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Admin/Staff can manage customers" ON public.customers;
CREATE POLICY "Admin/Staff can manage customers" ON public.customers
    FOR ALL USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Admin/Staff can view inventory movements" ON public.inventory_movements;
CREATE POLICY "Admin/Staff can view inventory movements" ON public.inventory_movements
    FOR ALL USING (public.is_admin_or_staff());

-- Profiles RLS
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles
    FOR ALL USING (public.is_admin_or_staff());

-- Reviews RLS
DROP POLICY IF EXISTS "Public can view verified reviews" ON public.reviews;
CREATE POLICY "Public can view verified reviews" ON public.reviews
    FOR SELECT USING (is_verified = TRUE);

DROP POLICY IF EXISTS "Public can submit review" ON public.reviews;
CREATE POLICY "Public can submit review" ON public.reviews
    FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admin can manage reviews" ON public.reviews;
CREATE POLICY "Admin can manage reviews" ON public.reviews
    FOR ALL USING (public.is_admin_or_staff());

-- ==============================================================================
-- STORAGE BUCKETS (Product Images)
-- To execute via Supabase Dashboard or Storage API:
-- Bucket name: 'product-images' (Public bucket)
-- ==============================================================================
