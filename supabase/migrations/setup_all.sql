-- ============================================
-- SAPKEY ERP - COMPLETE SETUP
-- انسخ هذا الكود بالكامل وألصقه في:
-- Supabase Dashboard -> SQL Editor -> New Query
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'accountant', 'cashier');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'card', 'online', 'wallet', 'cod');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(255),
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'cashier',
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    points INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    category_id UUID,
    unit VARCHAR(50) DEFAULT 'قطعة',
    unit_price DECIMAL(15,2) DEFAULT 0,
    cost_price DECIMAL(15,2) DEFAULT 0,
    sale_price DECIMAL(15,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 15,
    image_url TEXT,
    images TEXT[],
    min_stock DECIMAL(15,3) DEFAULT 10,
    max_stock DECIMAL(15,3) DEFAULT 1000,
    current_stock DECIMAL(15,3) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    has_expiry BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS (POS Orders)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount DECIMAL(15,2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    change_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    customer_id UUID,
    customer_name VARCHAR(255) NOT NULL DEFAULT 'ضيف',
    customer_phone VARCHAR(20) DEFAULT '',
    notes TEXT DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'paid',
    order_type VARCHAR(50) DEFAULT 'pos',
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVENTORY
-- ============================================
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID UNIQUE,
    quantity DECIMAL(15,3) DEFAULT 0,
    reserved_quantity DECIMAL(15,3) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUPPLIERS
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Allow all operations (development mode)
DROP POLICY IF EXISTS "Allow all users" ON users;
CREATE POLICY "Allow all users" ON users FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all customers" ON customers;
CREATE POLICY "Allow all customers" ON customers FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all products" ON products;
CREATE POLICY "Allow all products" ON products FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all orders" ON orders;
CREATE POLICY "Allow all orders" ON orders FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all inventory" ON inventory;
CREATE POLICY "Allow all inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all suppliers" ON suppliers;
CREATE POLICY "Allow all suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    seq_val INTEGER;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYMMDD');
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9 FOR 6) AS INTEGER)), 0) + 1
    INTO seq_val
    FROM orders
    WHERE order_number LIKE 'POS-' || date_part || '-%';
    RETURN 'POS-' || date_part || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SAMPLE DATA (للاختبار)
-- ============================================
INSERT INTO products (sku, barcode, name_ar, unit, unit_price, sale_price, cost_price, current_stock, is_active)
VALUES
    ('PROD-001', '6221000001000', 'مياه معدنية 1.5 لتر', 'حبة', 2.00, 2.50, 1.50, 100, true),
    ('PROD-002', '6221000002000', 'أرز بسمتي 1 كجم', 'كيس', 15.00, 18.00, 12.00, 50, true),
    ('PROD-003', '6221000003000', 'زيت طعام 1 لتر', 'عبوة', 20.00, 25.00, 18.00, 30, true),
    ('PROD-004', '6221000004000', 'سكر 1 كجم', 'كيس', 8.00, 10.00, 7.00, 40, true),
    ('PROD-005', '6221000005000', 'حليب طازج 1 لتر', 'عبوة', 7.00, 9.00, 6.00, 60, true)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO customers (name, phone, total_spent, total_orders)
VALUES
    ('أحمد محمد', '0501234567', 0, 0),
    ('سارة علي', '0559876543', 0, 0),
    ('محمد عبدالله', '0565555555', 0, 0)
ON CONFLICT DO NOTHING;

-- ============================================
-- MANAGER DASHBOARD TABLES
-- ============================================

DO $$ BEGIN
    CREATE TYPE treasury_account_type AS ENUM ('main', 'private', 'branch', 'wallet');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE treasury_transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'opening');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE treasury_transaction_status AS ENUM ('pending', 'processing', 'delayed', 'completed', 'reconciled', 'rejected', 'returned');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE stock_adjustment_type AS ENUM ('add', 'remove', 'correction', 'damage', 'return', 'audit');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_type AS ENUM ('voice', 'ocr', 'manual');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_status AS ENUM ('in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_pipeline_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE time_status AS ENUM ('active', 'completed', 'absent', 'late');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS treasury_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    type treasury_account_type NOT NULL DEFAULT 'main',
    wallet_provider VARCHAR(100),
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'EGP',
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treasury_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treasury_id UUID REFERENCES treasury_accounts(id) ON DELETE CASCADE,
    type treasury_transaction_type NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status treasury_transaction_status NOT NULL DEFAULT 'pending',
    reference_id VARCHAR(100),
    attachment_url TEXT,
    performed_by UUID,
    performed_at TIMESTAMPTZ NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internal_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID NOT NULL,
    borrower_name VARCHAR(255) NOT NULL,
    borrower_role VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    issue_date TIMESTAMPTZ NOT NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    current_qty DECIMAL(15,3) DEFAULT 0,
    min_qty DECIMAL(15,3) DEFAULT 0,
    max_qty DECIMAL(15,3) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'piece',
    cost_price DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) DEFAULT 0,
    location VARCHAR(100),
    last_audit_date TIMESTAMPTZ,
    last_audit_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
    type stock_adjustment_type NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    reason TEXT,
    performed_by UUID,
    performed_at TIMESTAMPTZ NOT NULL,
    balance_before DECIMAL(15,3) NOT NULL,
    balance_after DECIMAL(15,3) NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type audit_type NOT NULL,
    status audit_status NOT NULL DEFAULT 'in_progress',
    total_items INTEGER DEFAULT 0,
    matched_items INTEGER DEFAULT 0,
    discrepancies INTEGER DEFAULT 0,
    started_by UUID,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    customer_name VARCHAR(255),
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    status order_pipeline_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    break_start TIME,
    break_end TIME,
    total_hours DECIMAL(5,2) DEFAULT 0,
    status time_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for manager tables
ALTER TABLE treasury_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_control ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated access to treasury_accounts" ON treasury_accounts;
CREATE POLICY "Allow authenticated access to treasury_accounts" ON treasury_accounts FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow authenticated access to treasury_transactions" ON treasury_transactions;
CREATE POLICY "Allow authenticated access to treasury_transactions" ON treasury_transactions FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow authenticated access to internal_loans" ON internal_loans;
CREATE POLICY "Allow authenticated access to internal_loans" ON internal_loans FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow authenticated access to stock_items" ON stock_items;
CREATE POLICY "Allow authenticated access to stock_items" ON stock_items FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow authenticated access to stock_adjustments" ON stock_adjustments;
CREATE POLICY "Allow authenticated access to stock_adjustments" ON stock_adjustments FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow authenticated access to audit_sessions" ON audit_sessions;
CREATE POLICY "Allow authenticated access to audit_sessions" ON audit_sessions FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow authenticated access to order_pipeline" ON order_pipeline;
CREATE POLICY "Allow authenticated access to order_pipeline" ON order_pipeline FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow authenticated access to time_control" ON time_control;
CREATE POLICY "Allow authenticated access to time_control" ON time_control FOR ALL USING (auth.role() = 'authenticated');

-- Enable realtime for manager tables
ALTER PUBLICATION supabase_realtime ADD TABLE treasury_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE treasury_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE internal_loans;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_items;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_adjustments;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE order_pipeline;
ALTER PUBLICATION supabase_realtime ADD TABLE time_control;

-- Seed default treasury accounts
INSERT INTO treasury_accounts (name, name_ar, type, opening_balance, current_balance) VALUES
('Main Treasury', 'الخزينة الرئيسية', 'main', 0, 0),
('Private Wallet', 'المحفظة الخاصة', 'private', 0, 0),
('Cash Drawer', 'درج الكاش', 'main', 0, 0)
ON CONFLICT DO NOTHING;

-- ============================================
-- Verify setup
-- ============================================
SELECT '✅ SETUP COMPLETE' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
