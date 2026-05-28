-- 1. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(255) UNIQUE NOT NULL,
    customer_name VARCHAR(255),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'unpaid', -- paid, unpaid, cancelled
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Deliveries / Tracking Table
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'preparing', -- preparing, picked_up, on_the_way, delivered, failed
    customer_address TEXT NOT NULL,
    customer_phone VARCHAR(50),
    customer_lat DECIMAL(10,8),
    customer_lng DECIMAL(11,8),
    driver_lat DECIMAL(10,8),
    driver_lng DECIMAL(11,8),
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    tracking_code VARCHAR(255) UNIQUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Create Policies (allow all for admin/managers in a real app, here we allow all for simplicity)
CREATE POLICY "Enable all for authenticated users on invoices" ON public.invoices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users on deliveries" ON public.invoices FOR ALL USING (auth.role() = 'authenticated');

-- 3. Factory Reset RPC
-- This function wipes all operational data while keeping configuration/products.
CREATE OR REPLACE FUNCTION public.factory_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Disable triggers temporarily to avoid foreign key constraint errors during truncation
    SET session_session_replication_role = 'replica';

    -- Truncate operational tables (Add or remove tables as needed)
    TRUNCATE TABLE public.order_items CASCADE;
    TRUNCATE TABLE public.orders CASCADE;
    TRUNCATE TABLE public.invoices CASCADE;
    TRUNCATE TABLE public.deliveries CASCADE;
    TRUNCATE TABLE public.treasury_transactions CASCADE;
    TRUNCATE TABLE public.expenses CASCADE;
    TRUNCATE TABLE public.stock_adjustments CASCADE;
    TRUNCATE TABLE public.refunds CASCADE;
    TRUNCATE TABLE public.shifts CASCADE;
    TRUNCATE TABLE public.leaves CASCADE;
    TRUNCATE TABLE public.audit_logs CASCADE;

    -- Reset sequences if any exist
    -- ALTER SEQUENCE public.orders_id_seq RESTART WITH 1; 

    -- Re-enable triggers
    SET session_session_replication_role = 'origin';
END;
$$;
