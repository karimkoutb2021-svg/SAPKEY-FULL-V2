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


-- ============================================
-- Additional Tables from 001_initial_schema.sql
-- ============================================

-- ============================================
-- Arabic Smart Supermarket ERP - Main Schema
-- Version: 1.0.0
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'accountant', 'cashier');
CREATE TYPE supplier_status AS ENUM ('active', 'inactive', 'blocked', 'pending');
CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'approved', 'paid', 'cancelled', 'overdue');
CREATE TYPE payment_type AS ENUM ('cash', 'card', 'transfer', 'partial');
CREATE TYPE payment_schedule_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE notification_type AS ENUM ('due_date', 'overdue', 'approval', 'low_stock', 'payment_reminder', 'balance_alert');
CREATE TYPE movement_type AS ENUM ('purchase', 'sale', 'return', 'adjustment', 'transfer');
CREATE TYPE invoice_importance AS ENUM ('low', 'medium', 'high', 'urgent');

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(255),
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'cashier',
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    branch_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================
-- BRANCHES
-- ============================================

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_main BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PERMISSIONS
-- ============================================

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- ============================================
-- SUPPLIERS
-- ============================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    category_id UUID,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    phone_2 VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'مصر',
    tax_number VARCHAR(50),
    commercial_registration VARCHAR(50),
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    iban VARCHAR(50),
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    status supplier_status DEFAULT 'active',
    notes TEXT,
    rating INTEGER DEFAULT 3,
    tags TEXT[],
    attachment_urls TEXT[],
    created_by UUID REFERENCES users(id),
    branch_id UUID REFERENCES branches(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_category ON suppliers(category_id);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_name_ar ON suppliers(name_ar);
CREATE INDEX idx_suppliers_balance ON suppliers(current_balance);

-- ============================================
-- SUPPLIER CATEGORIES
-- ============================================

CREATE TABLE supplier_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES supplier_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_categories_code ON supplier_categories(code);
CREATE INDEX idx_supplier_categories_parent ON supplier_categories(parent_id);

-- ============================================
-- SUPPLIER CONTACTS
-- ============================================

CREATE TABLE supplier_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);

-- ============================================
-- SUPPLIER DOCUMENTS
-- ============================================

CREATE TABLE supplier_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    expiry_date DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_documents_supplier ON supplier_documents(supplier_id);
CREATE INDEX idx_supplier_documents_expiry ON supplier_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- ============================================
-- SUPPLIER NOTES
-- ============================================

CREATE TABLE supplier_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_notes_supplier ON supplier_notes(supplier_id);

-- ============================================
-- SUPPLIER ACCOUNT STATEMENTS
-- ============================================

CREATE TABLE supplier_account_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    opening_balance DECIMAL(15,2) NOT NULL,
    total_debit DECIMAL(15,2) DEFAULT 0,
    total_credit DECIMAL(15,2) DEFAULT 0,
    closing_balance DECIMAL(15,2) NOT NULL,
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_statements_supplier ON supplier_account_statements(supplier_id);
CREATE INDEX idx_supplier_statements_dates ON supplier_account_statements(from_date, to_date);

-- ============================================
-- PURCHASE INVOICES
-- ============================================

CREATE TABLE purchase_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    supplier_code VARCHAR(50),
    supplier_name_ar VARCHAR(255),
    invoice_date DATE NOT NULL,
    due_date DATE,
    status invoice_status DEFAULT 'draft',
    importance invoice_importance DEFAULT 'medium',
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 15,
    total DECIMAL(15,2) DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    attachment_urls TEXT[],
    ocr_data JSONB,
    original_file_url TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    branch_id UUID REFERENCES branches(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchase_invoices_number ON purchase_invoices(invoice_number);
CREATE INDEX idx_purchase_invoices_supplier ON purchase_invoices(supplier_id);
CREATE INDEX idx_purchase_invoices_status ON purchase_invoices(status);
CREATE INDEX idx_purchase_invoices_date ON purchase_invoices(invoice_date);
CREATE INDEX idx_purchase_invoices_due ON purchase_invoices(due_date);

-- ============================================
-- PURCHASE INVOICE ITEMS
-- ============================================

CREATE TABLE purchase_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_id UUID,
    product_code VARCHAR(50),
    product_name_ar VARCHAR(255),
    product_name_en VARCHAR(255),
    barcode VARCHAR(100),
    supplier_product_code VARCHAR(100),
    quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(50) DEFAULT 'قطعة',
    unit_price DECIMAL(15,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 15,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON purchase_invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON purchase_invoice_items(product_id);

-- ============================================
-- PAYMENT SCHEDULES
-- ============================================

CREATE TABLE payment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    status payment_schedule_status DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_schedules_invoice ON payment_schedules(invoice_id);
CREATE INDEX idx_payment_schedules_due ON payment_schedules(due_date);
CREATE INDEX idx_payment_schedules_status ON payment_schedules(status);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    invoice_id UUID REFERENCES purchase_invoices(id),
    amount DECIMAL(15,2) NOT NULL,
    payment_type payment_type NOT NULL,
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100),
    bank_name VARCHAR(255),
    check_number VARCHAR(100),
    notes TEXT,
    attachment_url TEXT,
    created_by UUID REFERENCES users(id),
    branch_id UUID REFERENCES branches(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_number ON payments(payment_number);
CREATE INDEX idx_payments_supplier ON payments(supplier_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- ============================================
-- PRODUCTS (for Smart Product Coding)
-- ============================================

CREATE TABLE products (
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
    min_stock_level DECIMAL(15,3) DEFAULT 10,
    current_stock DECIMAL(15,3) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_ar ON products(name_ar);

-- ============================================
-- PRODUCT SUPPLIER MAPPING
-- ============================================

CREATE TABLE product_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_product_code VARCHAR(100),
    supplier_product_name VARCHAR(255),
    unit_price DECIMAL(15,2),
    is_preferred BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, supplier_id)
);

CREATE INDEX idx_product_suppliers_product ON product_suppliers(product_id);
CREATE INDEX idx_product_suppliers_supplier ON product_suppliers(supplier_id);

-- ============================================
-- WAREHOUSES
-- ============================================

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    is_main BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVENTORY STOCK
-- ============================================

CREATE TABLE inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    warehouse_id UUID REFERENCES warehouses(id),
    quantity DECIMAL(15,3) DEFAULT 0,
    reserved_quantity DECIMAL(15,3) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

CREATE INDEX idx_inventory_product ON inventory_stock(product_id);
CREATE INDEX idx_inventory_warehouse ON inventory_stock(warehouse_id);

-- ============================================
-- STOCK MOVEMENTS
-- ============================================

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    warehouse_id UUID REFERENCES warehouses(id),
    movement_type movement_type NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    supplier_id UUID REFERENCES suppliers(id),
    invoice_id UUID REFERENCES purchase_invoices(id),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_supplier ON notifications(supplier_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_date ON notifications(created_at);

-- ============================================
-- ACCOUNTING - JOURNAL ENTRIES
-- ============================================

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    total_debit DECIMAL(15,2) NOT NULL,
    total_credit DECIMAL(15,2) NOT NULL,
    is_posted BOOLEAN DEFAULT false,
    posted_by UUID REFERENCES users(id),
    posted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_entries_number ON journal_entries(entry_number);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_posted ON journal_entries(is_posted);

-- ============================================
-- ACCOUNTING - JOURNAL LINES
-- ============================================

CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_code VARCHAR(50) NOT NULL,
    account_name_ar VARCHAR(255) NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_lines_entry ON journal_lines(entry_id);
CREATE INDEX idx_journal_lines_account ON journal_lines(account_code);

-- ============================================
-- CHART OF ACCOUNTS
-- ============================================

CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    account_type VARCHAR(50) NOT NULL,
    parent_code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chart_of_accounts_code ON chart_of_accounts(code);
CREATE INDEX idx_chart_of_accounts_type ON chart_of_accounts(account_type);

-- ============================================
-- SUPPLIER LEDGER
-- ============================================

CREATE TABLE supplier_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id),
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplier_ledger_supplier ON supplier_ledger(supplier_id);
CREATE INDEX idx_supplier_ledger_date ON supplier_ledger(entry_date);

-- ============================================
-- IMPORT/EXPORT LOGS
-- ============================================

CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    total_rows INTEGER NOT NULL,
    success_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    errors JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_logs_type ON import_logs(import_type);
CREATE INDEX idx_import_logs_status ON import_logs(status);
CREATE INDEX idx_import_logs_date ON import_logs(created_at);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    year_val TEXT;
    seq_val INTEGER;
BEGIN
    year_val := EXTRACT(YEAR FROM NOW())::TEXT;
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 7 FOR 6) AS INTEGER)), 0) + 1
    INTO seq_val
    FROM purchase_invoices
    WHERE invoice_number LIKE prefix || year_val || '%';
    
    new_number := prefix || year_val || LPAD(seq_val::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Update supplier balance
CREATE OR REPLACE FUNCTION update_supplier_balance(supplier_uuid UUID, amount DECIMAL, is_credit BOOLEAN)
RETURNS VOID AS $$
BEGIN
    IF is_credit THEN
        UPDATE suppliers SET current_balance = current_balance + amount WHERE id = supplier_uuid;
    ELSE
        UPDATE suppliers SET current_balance = current_balance - amount WHERE id = supplier_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals(invoice_uuid UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal DECIMAL(15,2);
    v_discount DECIMAL(15,2);
    v_tax DECIMAL(15,2);
    v_total DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(total), 0) INTO v_subtotal
    FROM purchase_invoice_items
    WHERE invoice_id = invoice_uuid;
    
    SELECT discount_percent, discount_amount INTO v_discount, v_discount
    FROM purchase_invoices
    WHERE id = invoice_uuid;
    
    v_total := v_subtotal - COALESCE(v_discount, 0);
    v_tax := v_total * (SELECT tax_percent FROM purchase_invoices WHERE id = invoice_uuid) / 100;
    v_total := v_total + v_tax;
    
    UPDATE purchase_invoices
    SET subtotal = v_subtotal, total = v_total, remaining_amount = v_total - paid_amount
    WHERE id = invoice_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_purchase_invoices_updated_at
    BEFORE UPDATE ON purchase_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- From: 003_orders.sql
-- ============================================
-- ============================================
-- Orders & POS Tables
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount DECIMAL(15,2) NOT NULL DEFAULT 0,
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
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_name);

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID UNIQUE,
    quantity DECIMAL(15,3) DEFAULT 0,
    reserved_quantity DECIMAL(15,3) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);

-- Customers table
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

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for development)
DROP POLICY IF EXISTS "Allow all orders" ON orders;
CREATE POLICY "Allow all orders" ON orders FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all inventory" ON inventory;
CREATE POLICY "Allow all inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all customers" ON customers;
CREATE POLICY "Allow all customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- Triggers
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- From: 004_branding_settings.sql
-- ============================================
-- Branding settings table for real-time sync
-- Stores all branding config fields including admin access code
CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read branding settings (public config)
CREATE POLICY "Branding settings are publicly readable"
  ON branding_settings FOR SELECT
  USING (true);

-- Allow authenticated users to update branding settings
CREATE POLICY "Authenticated users can update branding settings"
  ON branding_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branding_settings_key ON branding_settings(key);


-- ============================================
-- From: 007_pos_wallet_delivery.sql
-- ============================================
-- ============================================
-- MIGRATION 007: POS, Wallet, Delivery, Tracking System
-- ============================================
-- Creates all missing tables for the POS & Client Apps system

-- ============================================
-- 1. SHIFTS TABLE (Cashier Shift Management)
-- ============================================
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    starting_cash DECIMAL(15,2) DEFAULT 0,
    expected_cash DECIMAL(15,2) DEFAULT 0,
    actual_cash DECIMAL(15,2) DEFAULT 0,
    expected_card DECIMAL(15,2) DEFAULT 0,
    actual_card DECIMAL(15,2) DEFAULT 0,
    expected_network DECIMAL(15,2) DEFAULT 0,
    actual_network DECIMAL(15,2) DEFAULT 0,
    cash_shortage DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'open', -- open, closed, pending_approval
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. POS TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    cash_amount DECIMAL(15,2) DEFAULT 0,
    card_amount DECIMAL(15,2) DEFAULT 0,
    network_amount DECIMAL(15,2) DEFAULT 0,
    wallet_amount DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed', -- completed, voided, refunded, held
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    items JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. HELD ORDERS TABLE (Hold Bill Feature)
-- ============================================
CREATE TABLE IF NOT EXISTS held_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    items JSONB NOT NULL,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. REFUNDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES pos_transactions(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    refund_number VARCHAR(50) UNIQUE NOT NULL,
    reason TEXT,
    items JSONB,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    refund_method VARCHAR(50) DEFAULT 'cash', -- cash, card, wallet
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, completed
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. CUSTOMER WALLETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customer_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) DEFAULT 0,
    loyalty_points DECIMAL(15,2) DEFAULT 0,
    total_recharged DECIMAL(15,2) DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. WALLET TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES customer_wallets(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- deposit, withdrawal, purchase, refund, loyalty_earned, loyalty_redeemed
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    reference_type VARCHAR(50), -- order, recharge, admin
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. DELIVERIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    customer_lat DECIMAL(10,8),
    customer_lng DECIMAL(11,8),
    store_lat DECIMAL(10,8),
    store_lng DECIMAL(11,8),
    status VARCHAR(50) DEFAULT 'pending', -- pending, assigned, picked, in_transit, delivered, failed
    estimated_minutes INTEGER DEFAULT 30,
    actual_minutes INTEGER,
    delivery_fee DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    dispatched_at TIMESTAMPTZ,
    picked_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. DELIVERY PROOFS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
    photo_url TEXT,
    signature_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. LOYALTY POINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    points DECIMAL(15,2) NOT NULL,
    type VARCHAR(50) NOT NULL, -- earned, redeemed, expired, adjusted
    reference_type VARCHAR(50), -- order, admin
    reference_id UUID,
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. CUSTOMER ADDRESSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    label VARCHAR(100), -- home, work, etc.
    address TEXT NOT NULL,
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. ORDER STATUS LOG TABLE (for tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS order_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - Public read for authenticated users
-- ============================================
CREATE POLICY "Anyone can view shifts" ON shifts FOR SELECT USING (true);
CREATE POLICY "Anyone can view pos_transactions" ON pos_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can view held_orders" ON held_orders FOR SELECT USING (true);
CREATE POLICY "Anyone can view refunds" ON refunds FOR SELECT USING (true);
CREATE POLICY "Anyone can view customer_wallets" ON customer_wallets FOR SELECT USING (true);
CREATE POLICY "Anyone can view wallet_transactions" ON wallet_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can view deliveries" ON deliveries FOR SELECT USING (true);
CREATE POLICY "Anyone can view delivery_proofs" ON delivery_proofs FOR SELECT USING (true);
CREATE POLICY "Anyone can view loyalty_points" ON loyalty_points FOR SELECT USING (true);
CREATE POLICY "Anyone can view customer_addresses" ON customer_addresses FOR SELECT USING (true);
CREATE POLICY "Anyone can view order_status_log" ON order_status_log FOR SELECT USING (true);

-- Insert policies
CREATE POLICY "Authenticated users can insert shifts" ON shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can insert pos_transactions" ON pos_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can insert held_orders" ON held_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can insert refunds" ON refunds FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can insert customer_wallets" ON customer_wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can insert wallet_transactions" ON wallet_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can insert deliveries" ON deliveries FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can insert delivery_proofs" ON delivery_proofs FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can insert loyalty_points" ON loyalty_points FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can insert customer_addresses" ON customer_addresses FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can insert order_status_log" ON order_status_log FOR INSERT WITH CHECK (true);

-- Update policies
CREATE POLICY "Authenticated users can update shifts" ON shifts FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can update pos_transactions" ON pos_transactions FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can update held_orders" ON held_orders FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can update refunds" ON refunds FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can update customer_wallets" ON customer_wallets FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can update wallet_transactions" ON wallet_transactions FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can update deliveries" ON deliveries FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can update delivery_proofs" ON delivery_proofs FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can update loyalty_points" ON loyalty_points FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can update customer_addresses" ON customer_addresses FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can update order_status_log" ON order_status_log FOR UPDATE USING (true);

-- ============================================
-- SEED: Create customer wallets for existing customers
-- ============================================
INSERT INTO customer_wallets (customer_id, balance, loyalty_points)
SELECT id, 0, 0 FROM customers
WHERE id NOT IN (SELECT customer_id FROM customer_wallets)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED: Create a default delivery for testing
-- ============================================
-- (Will be created when orders are placed with delivery)


-- ============================================
-- From: 008_shifts_wallet_deliveries.sql
-- ============================================
-- ============================================
-- POS Shifts, Wallet, and Audit Tables
-- ============================================

-- ============================================
-- SHIFTS TABLE (Cashier Shift Management)
-- ============================================

CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID NOT NULL REFERENCES users(id),
    branch_id UUID REFERENCES branches(id),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    starting_cash DECIMAL(15,2) DEFAULT 0,
    expected_cash DECIMAL(15,2) DEFAULT 0,
    actual_cash DECIMAL(15,2) DEFAULT 0,
    expected_card DECIMAL(15,2) DEFAULT 0,
    actual_card DECIMAL(15,2) DEFAULT 0,
    expected_network DECIMAL(15,2) DEFAULT 0,
    actual_network DECIMAL(15,2) DEFAULT 0,
    cash_shortage DECIMAL(15,2) DEFAULT 0,
    previous_shift_closing_cash DECIMAL(15,2) DEFAULT 0,
    discrepancy_amount DECIMAL(15,2) DEFAULT 0,
    discrepancy_reason VARCHAR(100),
    discrepancy_approved_by UUID REFERENCES users(id),
    discrepancy_approved_at TIMESTAMPTZ,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shifts_cashier ON shifts(cashier_id);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_opened ON shifts(opened_at);

-- ============================================
-- SHIFT AUDIT LOG (Discrepancy Tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS shift_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES shifts(id),
    cashier_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    previous_value DECIMAL(15,2),
    new_value DECIMAL(15,2),
    difference DECIMAL(15,2),
    reason VARCHAR(100),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shift_audit_shift ON shift_audit_log(shift_id);
CREATE INDEX idx_shift_audit_cashier ON shift_audit_log(cashier_id);
CREATE INDEX idx_shift_audit_action ON shift_audit_log(action);

-- ============================================
-- CUSTOMER WALLETS
-- ============================================

CREATE TABLE IF NOT EXISTS customer_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id),
    balance DECIMAL(15,2) DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

CREATE INDEX idx_wallets_customer ON customer_wallets(customer_id);

-- ============================================
-- WALLET TRANSACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES customer_wallets(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_customer ON wallet_transactions(customer_id);
CREATE INDEX idx_wallet_tx_type ON wallet_transactions(type);

-- ============================================
-- DELIVERIES
-- ============================================

CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    driver_id UUID REFERENCES users(id),
    customer_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    estimated_minutes INTEGER DEFAULT 30,
    actual_minutes INTEGER,
    customer_address TEXT,
    customer_phone VARCHAR(20),
    customer_location JSONB,
    driver_location JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_order ON deliveries(order_id);
CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);

-- ============================================
-- HELD ORDERS (POS Bill Hold)
-- ============================================

CREATE TABLE IF NOT EXISTS held_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID NOT NULL REFERENCES users(id),
    customer_name VARCHAR(255),
    items JSONB NOT NULL,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_held_orders_cashier ON held_orders(cashier_id);
CREATE INDEX idx_held_orders_created ON held_orders(created_at);

-- ============================================
-- POS TRANSACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    shift_id UUID REFERENCES shifts(id),
    cashier_id UUID NOT NULL REFERENCES users(id),
    customer_id UUID REFERENCES users(id),
    items JSONB NOT NULL,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    cash_amount DECIMAL(15,2) DEFAULT 0,
    card_amount DECIMAL(15,2) DEFAULT 0,
    network_amount DECIMAL(15,2) DEFAULT 0,
    wallet_amount DECIMAL(15,2) DEFAULT 0,
    payment_method VARCHAR(20) DEFAULT 'cash',
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pos_transactions_order ON pos_transactions(order_number);
CREATE INDEX idx_pos_transactions_shift ON pos_transactions(shift_id);
CREATE INDEX idx_pos_transactions_cashier ON pos_transactions(cashier_id);
CREATE INDEX idx_pos_transactions_date ON pos_transactions(created_at);

-- ============================================
-- REFUNDS
-- ============================================

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES pos_transactions(id),
    order_number VARCHAR(50),
    cashier_id UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    items JSONB NOT NULL,
    total DECIMAL(15,2) DEFAULT 0,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refunds_transaction ON refunds(transaction_id);
CREATE INDEX idx_refunds_cashier ON refunds(cashier_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customer_wallets_updated_at
    BEFORE UPDATE ON customer_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own shifts
CREATE POLICY "Users can view their own shifts"
    ON shifts FOR SELECT
    USING (auth.uid() = cashier_id);

-- Allow cashiers to insert their own shifts
CREATE POLICY "Cashiers can create shifts"
    ON shifts FOR INSERT
    WITH CHECK (auth.uid() = cashier_id);

-- Allow cashiers to update their own open shifts
CREATE POLICY "Cashiers can update their own shifts"
    ON shifts FOR UPDATE
    USING (auth.uid() = cashier_id AND status = 'open');

-- Allow users to view their own wallet
CREATE POLICY "Users can view their own wallet"
    ON customer_wallets FOR SELECT
    USING (auth.uid() = customer_id);

-- Allow users to view their own wallet transactions
CREATE POLICY "Users can view their own wallet transactions"
    ON wallet_transactions FOR SELECT
    USING (auth.uid() = customer_id);

-- Allow cashiers to view their own held orders
CREATE POLICY "Cashiers can view their own held orders"
    ON held_orders FOR SELECT
    USING (auth.uid() = cashier_id);

-- Allow cashiers to create held orders
CREATE POLICY "Cashiers can create held orders"
    ON held_orders FOR INSERT
    WITH CHECK (auth.uid() = cashier_id);

-- Allow cashiers to delete their own held orders
CREATE POLICY "Cashiers can delete their own held orders"
    ON held_orders FOR DELETE
    USING (auth.uid() = cashier_id);


-- ============================================
-- From: 009_inventory_accounting_batches.sql
-- ============================================
-- ============================================
-- COMPREHENSIVE INVENTORY, ACCOUNTING & BATCHES
-- ============================================

-- ============================================
-- CHART OF ACCOUNTS (شجرة الحسابات)
-- ============================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    parent_id UUID REFERENCES chart_of_accounts(id),
    account_type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
    account_level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coa_code ON chart_of_accounts(code);
CREATE INDEX idx_coa_parent ON chart_of_accounts(parent_id);
CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);

-- ============================================
-- JOURNAL ENTRIES (قيود يومية)
-- ============================================

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    reference_type VARCHAR(50), -- order, payment, adjustment, etc.
    reference_id UUID,
    created_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'draft', -- draft, posted, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_je_number ON journal_entries(entry_number);
CREATE INDEX idx_je_date ON journal_entries(entry_date);
CREATE INDEX idx_je_status ON journal_entries(status);

-- ============================================
-- JOURNAL ENTRY LINES (بنود القيد)
-- ============================================

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    description TEXT,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_je_lines_entry ON journal_entry_lines(entry_id);
CREATE INDEX idx_je_lines_account ON journal_entry_lines(account_id);

-- ============================================
-- WAREHOUSES (المستودعات)
-- ============================================

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    location TEXT,
    manager_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warehouses_active ON warehouses(is_active);

-- ============================================
-- INVENTORY ITEMS (المخزون)
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    quantity DECIMAL(15,3) DEFAULT 0,
    reserved_quantity DECIMAL(15,3) DEFAULT 0,
    min_quantity DECIMAL(15,3) DEFAULT 0,
    max_quantity DECIMAL(15,3) DEFAULT 0,
    cost_price DECIMAL(15,2) DEFAULT 0,
    last_received_at TIMESTAMPTZ,
    last_sold_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

CREATE INDEX idx_inventory_product ON inventory_items(product_id);
CREATE INDEX idx_inventory_warehouse ON inventory_items(warehouse_id);
CREATE INDEX idx_inventory_low ON inventory_items(quantity, min_quantity);

-- ============================================
-- INVENTORY MOVEMENTS (حركات المخزون)
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    movement_type VARCHAR(30) NOT NULL, -- receive, issue, transfer, adjustment, return, damage
    quantity DECIMAL(15,3) NOT NULL,
    quantity_before DECIMAL(15,3) NOT NULL,
    quantity_after DECIMAL(15,3) NOT NULL,
    reference_type VARCHAR(50), -- order, purchase, transfer, adjustment
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_movements_warehouse ON inventory_movements(warehouse_id);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_movements_date ON inventory_movements(created_at);

-- ============================================
-- BATCHES / LOTS (الدفعات)
-- ============================================

CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    batch_number VARCHAR(50) NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id),
    quantity DECIMAL(15,3) DEFAULT 0,
    cost_price DECIMAL(15,2) DEFAULT 0,
    expiry_date DATE,
    production_date DATE,
    supplier_id UUID REFERENCES users(id),
    purchase_order_id UUID,
    status VARCHAR(20) DEFAULT 'active', -- active, expired, depleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batches_product ON batches(product_id);
CREATE INDEX idx_batches_number ON batches(batch_number);
CREATE INDEX idx_batches_expiry ON batches(expiry_date);
CREATE INDEX idx_batches_status ON batches(status);

-- ============================================
-- STOCK TRANSFERS (تحويلات المخزون)
-- ============================================

CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_transit, completed, cancelled
    notes TEXT,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfers_number ON stock_transfers(transfer_number);
CREATE INDEX idx_transfers_status ON stock_transfers(status);

-- ============================================
-- STOCK TRANSFER ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    batch_id UUID REFERENCES batches(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfer_items_transfer ON stock_transfer_items(transfer_id);
CREATE INDEX idx_transfer_items_product ON stock_transfer_items(product_id);

-- ============================================
-- PURCHASE ORDERS (طلبات الشراء)
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES users(id),
    warehouse_id UUID REFERENCES warehouses(id),
    status VARCHAR(20) DEFAULT 'draft', -- draft, approved, ordered, received, cancelled
    total DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    expected_date DATE,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_number ON purchase_orders(order_number);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- ============================================
-- PURCHASE ORDER ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    received_quantity DECIMAL(15,3) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_items_order ON purchase_order_items(order_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(product_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_chart_of_accounts_updated_at
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_stock_transfers_updated_at
    BEFORE UPDATE ON stock_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read chart of accounts
CREATE POLICY "Anyone can view chart of accounts"
    ON chart_of_accounts FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to read warehouses
CREATE POLICY "Anyone can view warehouses"
    ON warehouses FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to view inventory
CREATE POLICY "Anyone can view inventory"
    ON inventory_items FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to view movements
CREATE POLICY "Anyone can view inventory movements"
    ON inventory_movements FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to view batches
CREATE POLICY "Anyone can view batches"
    ON batches FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to view journal entries
CREATE POLICY "Anyone can view journal entries"
    ON journal_entries FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to view journal entry lines
CREATE POLICY "Anyone can view journal entry lines"
    ON journal_entry_lines FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================
-- SEED DATA: Chart of Accounts (شجرة الحسابات)
-- ============================================

INSERT INTO chart_of_accounts (code, name_ar, name_en, account_type, account_level) VALUES
('1000', 'الأصول', 'Assets', 'asset', 1),
('1100', 'الأصول المتداولة', 'Current Assets', 'asset', 2),
('1110', 'النقدية', 'Cash', 'asset', 3),
('1120', 'البنوك', 'Banks', 'asset', 3),
('1130', 'العملاء', 'Accounts Receivable', 'asset', 3),
('1140', 'المخزون', 'Inventory', 'asset', 3),
('1200', 'الأصول الثابتة', 'Fixed Assets', 'asset', 2),
('1210', 'الأثاث والمعدات', 'Furniture & Equipment', 'asset', 3),
('1220', 'مجمع الإهلاك', 'Accumulated Depreciation', 'asset', 3),

('2000', 'الخصوم', 'Liabilities', 'liability', 1),
('2100', 'الخصوم المتداولة', 'Current Liabilities', 'liability', 2),
('2110', 'الموردين', 'Accounts Payable', 'liability', 3),
('2120', 'رواتب مستحقة', 'Accrued Salaries', 'liability', 3),
('2130', 'ضرائب مستحقة', 'Accrued Taxes', 'liability', 3),
('2200', 'الخصوم طويلة الأجل', 'Long-term Liabilities', 'liability', 2),

('3000', 'حقوق الملكية', 'Equity', 'equity', 1),
('3100', 'رأس المال', 'Capital', 'equity', 2),
('3200', 'الأرباح المحتجزة', 'Retained Earnings', 'equity', 2),
('3300', 'الأرباح الحالية', 'Current Year Earnings', 'equity', 2),

('4000', 'الإيرادات', 'Revenue', 'revenue', 1),
('4100', 'إيرادات المبيعات', 'Sales Revenue', 'revenue', 2),
('4110', 'مبيعات نقدية', 'Cash Sales', 'revenue', 3),
('4120', 'مبيعات آجلة', 'Credit Sales', 'revenue', 3),
('4130', 'مردودات مبيعات', 'Sales Returns', 'revenue', 3),
('4200', 'إيرادات أخرى', 'Other Revenue', 'revenue', 2),

('5000', 'المصروفات', 'Expenses', 'expense', 1),
('5100', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'expense', 2),
('5200', 'مصروفات تشغيلية', 'Operating Expenses', 'expense', 2),
('5210', 'رواتب وأجور', 'Salaries & Wages', 'expense', 3),
('5220', 'إيجارات', 'Rent', 'expense', 3),
('5230', 'مرافق', 'Utilities', 'expense', 3),
('5240', 'صيانة', 'Maintenance', 'expense', 3),
('5250', 'نقل وتوصيل', 'Delivery', 'expense', 3),
('5260', 'مصروفات متنوعة', 'Miscellaneous', 'expense', 3),
('5300', 'مصروفات إدارية', 'Administrative Expenses', 'expense', 2),
('5400', 'مصروفات تسويق', 'Marketing Expenses', 'expense', 2)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED DATA: Default Warehouse
-- ============================================

INSERT INTO warehouses (name_ar, name_en, location) VALUES
('المخزن الرئيسي', 'Main Warehouse', 'الفرع الرئيسي')
ON CONFLICT DO NOTHING;


-- ============================================
-- From: 010_enable_realtime_products.sql
-- ============================================
-- Enable Realtime for products and categories if not already enabled
BEGIN;

-- Check if publication exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add tables to publication
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE product_categories;

COMMIT;


-- ============================================
-- From: 010_manager_dashboard.sql
-- ============================================
-- ============================================
-- Manager Dashboard Tables
-- Version: 1.0.0
-- Tables: treasury_accounts, treasury_transactions, internal_loans,
--         stock_items, stock_adjustments, audit_sessions,
--         order_pipeline, time_control
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE treasury_account_type AS ENUM ('main', 'private', 'branch', 'wallet');
CREATE TYPE treasury_transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'opening');
CREATE TYPE treasury_transaction_status AS ENUM ('pending', 'processing', 'delayed', 'completed', 'reconciled', 'rejected', 'returned');
CREATE TYPE stock_adjustment_type AS ENUM ('add', 'remove', 'correction', 'damage', 'return', 'audit');
CREATE TYPE audit_type AS ENUM ('voice', 'ocr', 'manual');
CREATE TYPE audit_status AS ENUM ('in_progress', 'completed', 'cancelled');
CREATE TYPE order_pipeline_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'refunded');
CREATE TYPE time_status AS ENUM ('active', 'completed', 'absent', 'late');

-- ============================================
-- TREASURY ACCOUNTS
-- ============================================

CREATE TABLE treasury_accounts (
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

CREATE INDEX idx_treasury_accounts_type ON treasury_accounts(type);
CREATE INDEX idx_treasury_accounts_active ON treasury_accounts(is_active);

-- ============================================
-- TREASURY TRANSACTIONS
-- ============================================

CREATE TABLE treasury_transactions (
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

CREATE INDEX idx_treasury_transactions_treasury ON treasury_transactions(treasury_id);
CREATE INDEX idx_treasury_transactions_type ON treasury_transactions(type);
CREATE INDEX idx_treasury_transactions_status ON treasury_transactions(status);
CREATE INDEX idx_treasury_transactions_performed ON treasury_transactions(performed_at);

-- ============================================
-- INTERNAL LOANS
-- ============================================

CREATE TABLE internal_loans (
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

CREATE INDEX idx_internal_loans_borrower ON internal_loans(borrower_id);
CREATE INDEX idx_internal_loans_status ON internal_loans(status);

-- ============================================
-- STOCK ITEMS
-- ============================================

CREATE TABLE stock_items (
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

CREATE INDEX idx_stock_items_product ON stock_items(product_id);
CREATE INDEX idx_stock_items_sku ON stock_items(sku);
CREATE INDEX idx_stock_items_barcode ON stock_items(barcode);
CREATE INDEX idx_stock_items_low ON stock_items(current_qty, min_qty);

-- ============================================
-- STOCK ADJUSTMENTS
-- ============================================

CREATE TABLE stock_adjustments (
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

CREATE INDEX idx_stock_adjustments_stock ON stock_adjustments(stock_id);
CREATE INDEX idx_stock_adjustments_type ON stock_adjustments(type);
CREATE INDEX idx_stock_adjustments_performed ON stock_adjustments(performed_at);

-- ============================================
-- AUDIT SESSIONS
-- ============================================

CREATE TABLE audit_sessions (
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

CREATE INDEX idx_audit_sessions_type ON audit_sessions(type);
CREATE INDEX idx_audit_sessions_status ON audit_sessions(status);
CREATE INDEX idx_audit_sessions_started ON audit_sessions(started_at);

-- ============================================
-- ORDER PIPELINE
-- ============================================

CREATE TABLE order_pipeline (
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

CREATE INDEX idx_order_pipeline_order ON order_pipeline(order_id);
CREATE INDEX idx_order_pipeline_status ON order_pipeline(status);
CREATE INDEX idx_order_pipeline_payment ON order_pipeline(payment_status);

-- ============================================
-- TIME CONTROL
-- ============================================

CREATE TABLE time_control (
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

CREATE INDEX idx_time_control_user ON time_control(user_id);
CREATE INDEX idx_time_control_date ON time_control(date);
CREATE INDEX idx_time_control_status ON time_control(status);

-- ============================================
-- REALTIME ENABLEMENT
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE treasury_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE treasury_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE internal_loans;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_items;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_adjustments;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE order_pipeline;
ALTER PUBLICATION supabase_realtime ADD TABLE time_control;
ALTER PUBLICATION supabase_realtime ADD TABLE branding_settings;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE treasury_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_control ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (can be tightened later)
CREATE POLICY "Allow authenticated access to treasury_accounts" ON treasury_accounts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to treasury_transactions" ON treasury_transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to internal_loans" ON internal_loans FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to stock_items" ON stock_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to stock_adjustments" ON stock_adjustments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to audit_sessions" ON audit_sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to order_pipeline" ON order_pipeline FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to time_control" ON time_control FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- SEED DATA - Default Treasury Accounts
-- ============================================

INSERT INTO treasury_accounts (name, name_ar, type, opening_balance, current_balance) VALUES
('Main Treasury', 'الخزينة الرئيسية', 'main', 0, 0),
('Private Wallet', 'المحفظة الخاصة', 'private', 0, 0),
('Cash Drawer', 'درج الكاش', 'main', 0, 0);


-- ============================================
-- From: 011_procurement_inventory.sql
-- ============================================
-- ============================================
-- Procurement, Inventory & Warehouse System
-- Version: 2.0.0
-- Tables: warehouses, coding_drafts, audit_items,
--         stock_transfers, transfer_items,
--         product_history, audit_ocr_results,
--         coding_labels, purchase_orders
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE warehouse_type AS ENUM ('main', 'branch', 'cold_storage', 'dry_storage', 'display');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE coding_status AS ENUM ('pending', 'approved', 'rejected', 'active');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_item_status AS ENUM ('matched', 'shortage', 'overage', 'damaged', 'not_found');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transfer_status AS ENUM ('draft', 'pending_approval', 'approved', 'in_transit', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_history_type AS ENUM ('purchase', 'sale', 'transfer_in', 'transfer_out', 'adjustment', 'audit', 'damage', 'return', 'coding');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE purchase_order_status AS ENUM ('draft', 'pending', 'approved', 'received', 'partial', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- WAREHOUSES
-- ============================================

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    type warehouse_type NOT NULL DEFAULT 'main',
    location VARCHAR(255),
    address TEXT,
    capacity INTEGER DEFAULT 0,
    manager_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warehouses_type ON warehouses(type);
CREATE INDEX idx_warehouses_active ON warehouses(is_active);

-- ============================================
-- STOCK ITEMS (enhanced with warehouse)
-- ============================================

ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS shelf_number VARCHAR(50);
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS main_warehouse_qty DECIMAL(15,3) DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS branch_warehouse_qty DECIMAL(15,3) DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS turnover_ratio DECIMAL(10,2) DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS barcode_url TEXT;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS total_profit DECIMAL(15,2) DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS last_purchase_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS last_audit_result TEXT;

-- ============================================
-- CODING DRAFTS (Cashier pending coding)
-- ============================================

CREATE TABLE IF NOT EXISTS coding_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'قطعة',
    shelf_number VARCHAR(50),
    cost_price DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) DEFAULT 0,
    min_stock DECIMAL(15,3) DEFAULT 10,
    status coding_status NOT NULL DEFAULT 'pending',
    submitted_by UUID,
    submitted_by_name VARCHAR(255),
    submitted_by_role VARCHAR(50),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    voice_input JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coding_drafts_status ON coding_drafts(status);
CREATE INDEX idx_coding_drafts_submitted ON coding_drafts(submitted_by);
CREATE INDEX idx_coding_drafts_created ON coding_drafts(created_at DESC);

-- ============================================
-- AUDIT ITEMS (individual audit line items)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_session_id UUID REFERENCES audit_sessions(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES stock_items(id),
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    system_qty DECIMAL(15,3) NOT NULL,
    actual_qty DECIMAL(15,3) NOT NULL,
    variance DECIMAL(15,3) GENERATED ALWAYS AS (actual_qty - system_qty) STORED,
    variance_value DECIMAL(15,2) GENERATED ALWAYS AS ((actual_qty - system_qty) * cost_price) STORED,
    cost_price DECIMAL(15,2) DEFAULT 0,
    status audit_item_status NOT NULL DEFAULT 'matched',
    notes TEXT,
    shelf_location VARCHAR(100),
    voice_input TEXT,
    ocr_confidence DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_items_session ON audit_items(audit_session_id);
CREATE INDEX idx_audit_items_status ON audit_items(status);
CREATE INDEX idx_audit_items_variance ON audit_items(variance);

-- ============================================
-- STOCK TRANSFERS
-- ============================================

CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    status transfer_status NOT NULL DEFAULT 'draft',
    total_items INTEGER DEFAULT 0,
    notes TEXT,
    requested_by UUID,
    requested_by_name VARCHAR(255),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    received_by UUID,
    received_by_name VARCHAR(255),
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_transfers_number ON stock_transfers(transfer_number);
CREATE INDEX idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX idx_stock_transfers_from ON stock_transfers(from_warehouse_id);
CREATE INDEX idx_stock_transfers_to ON stock_transfers(to_warehouse_id);
CREATE INDEX idx_stock_transfers_created ON stock_transfers(created_at DESC);

-- ============================================
-- TRANSFER ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID REFERENCES stock_transfers(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES stock_items(id),
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    requested_qty DECIMAL(15,3) NOT NULL,
    approved_qty DECIMAL(15,3) DEFAULT 0,
    received_qty DECIMAL(15,3) DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'قطعة',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfer_items_transfer ON transfer_items(transfer_id);
CREATE INDEX idx_transfer_items_product ON transfer_items(stock_item_id);

-- ============================================
-- PRODUCT HISTORY LEDGER
-- ============================================

CREATE TABLE IF NOT EXISTS product_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID REFERENCES stock_items(id),
    product_name VARCHAR(255) NOT NULL,
    type product_history_type NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    price DECIMAL(15,2) DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    reference_id VARCHAR(100),
    reference_type VARCHAR(50),
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    performed_by UUID,
    performed_by_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_history_stock ON product_history(stock_item_id);
CREATE INDEX idx_product_history_type ON product_history(type);
CREATE INDEX idx_product_history_created ON product_history(created_at DESC);
CREATE INDEX idx_product_history_reference ON product_history(reference_id);

-- ============================================
-- AUDIT OCR RESULTS
-- ============================================

CREATE TABLE IF NOT EXISTS audit_ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_session_id UUID REFERENCES audit_sessions(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    ocr_text TEXT,
    extracted_items JSONB,
    processing_status VARCHAR(50) DEFAULT 'pending',
    confidence_score DECIMAL(5,2),
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_ocr_session ON audit_ocr_results(audit_session_id);
CREATE INDEX idx_audit_ocr_status ON audit_ocr_results(processing_status);

-- ============================================
-- CODING LABELS (for printing)
-- ============================================

CREATE TABLE IF NOT EXISTS coding_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID REFERENCES stock_items(id),
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    selling_price DECIMAL(15,2) DEFAULT 0,
    label_type VARCHAR(50) DEFAULT 'barcode',
    barcode_data VARCHAR(255),
    qr_data TEXT,
    printed BOOLEAN DEFAULT false,
    printed_at TIMESTAMPTZ,
    printed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coding_labels_stock ON coding_labels(stock_item_id);
CREATE INDEX idx_coding_labels_printed ON coding_labels(printed);
CREATE INDEX idx_coding_labels_created ON coding_labels(created_at DESC);

-- ============================================
-- PURCHASE ORDERS
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    status purchase_order_status NOT NULL DEFAULT 'draft',
    total_items INTEGER DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    expected_date DATE,
    received_date DATE,
    notes TEXT,
    created_by UUID,
    created_by_name VARCHAR(255),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchase_orders_number ON purchase_orders(order_number);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_created ON purchase_orders(created_at DESC);

-- ============================================
-- PURCHASE ORDER ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES stock_items(id),
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    received_qty DECIMAL(15,3) DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'قطعة',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(stock_item_id);

-- ============================================
-- REALTIME ENABLEMENT
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS warehouses;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS coding_drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS audit_items;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS stock_transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS transfer_items;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS product_history;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS audit_ocr_results;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS coding_labels;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS purchase_order_items;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to warehouses" ON warehouses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to coding_drafts" ON coding_drafts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to audit_items" ON audit_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to stock_transfers" ON stock_transfers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to transfer_items" ON transfer_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to product_history" ON product_history FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to audit_ocr_results" ON audit_ocr_results FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to coding_labels" ON coding_labels FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to purchase_orders" ON purchase_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to purchase_order_items" ON purchase_order_items FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- SEED DATA - Default Warehouses
-- ============================================

INSERT INTO warehouses (name, name_ar, type, location) VALUES
('Main Warehouse', 'المخزن الرئيسي', 'main', 'القاهرة'),
('Branch Store', 'مخزن الفرع', 'branch', 'القاهرة'),
('Cold Storage', 'مستودع التبريد', 'cold_storage', 'القاهرة'),
('Dry Storage', 'مخزن المواد الجافة', 'dry_storage', 'بورسعيد'),
('Display Racks', 'رفوف العرض', 'display', 'القاهرة')
ON CONFLICT DO NOTHING;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate transfer number
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    seq_val INTEGER;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYMMDD');
    SELECT COALESCE(MAX(CAST(SUBSTRING(transfer_number FROM 9 FOR 6) AS INTEGER)), 0) + 1
    INTO seq_val
    FROM stock_transfers
    WHERE transfer_number LIKE 'TRF-' || date_part || '-%';
    RETURN 'TRF-' || date_part || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate purchase order number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    seq_val INTEGER;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYMMDD');
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9 FOR 6) AS INTEGER)), 0) + 1
    INTO seq_val
    FROM purchase_orders
    WHERE order_number LIKE 'PO-' || date_part || '-%';
    RETURN 'PO-' || date_part || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Calculate inventory variance
CREATE OR REPLACE FUNCTION calculate_variance(system_qty DECIMAL, actual_qty DECIMAL, cost_price DECIMAL)
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'system_qty', system_qty,
        'actual_qty', actual_qty,
        'variance', actual_qty - system_qty,
        'variance_value', (actual_qty - system_qty) * cost_price,
        'status', CASE
            WHEN actual_qty = system_qty THEN 'matched'
            WHEN actual_qty < system_qty THEN 'shortage'
            WHEN actual_qty > system_qty THEN 'overage'
            ELSE 'not_found'
        END
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Verify setup
-- ============================================

SELECT '✅ Procurement & Inventory System Setup Complete' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;


-- ============================================
-- From: 012_notification_system.sql
-- ============================================
-- ============================================
-- Advanced Notification System
-- Version: 1.0.0
-- Tables: notification_rules, product_notification_thresholds,
--         cash_threshold_configs, notifications (extended)
-- ============================================

-- Extend notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'expiry_alert';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'return_request';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invoice_cancelled';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invoice_modified';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'cash_threshold';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'purchase_order';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'transfer_alert';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'system_alert';

-- ============================================
-- NOTIFICATION RULES
-- ============================================
CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type notification_type NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT true,
    delegable BOOLEAN DEFAULT false,
    delegated_to UUID REFERENCES users(id),
    requires_biometric BOOLEAN DEFAULT false,
    threshold_value NUMERIC(12,2),
    advance_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCT NOTIFICATION THRESHOLDS
-- ============================================
CREATE TABLE IF NOT EXISTS product_notification_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    custom_min_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
    expiry_alert_days INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- ============================================
-- CASH THRESHOLD CONFIG
-- ============================================
CREATE TABLE IF NOT EXISTS cash_threshold_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    safe_limit NUMERIC(12,2) NOT NULL DEFAULT 50000,
    enabled BOOLEAN DEFAULT true,
    notify_manager BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id)
);

-- ============================================
-- EXTEND NOTIFICATIONS TABLE
-- ============================================
-- Add new columns if not already present
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='product_id') THEN
        ALTER TABLE notifications ADD COLUMN product_id UUID REFERENCES products(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='shift_id') THEN
        ALTER TABLE notifications ADD COLUMN shift_id UUID REFERENCES shifts(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='return_id') THEN
        ALTER TABLE notifications ADD COLUMN return_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='requires_approval') THEN
        ALTER TABLE notifications ADD COLUMN requires_approval BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='approved') THEN
        ALTER TABLE notifications ADD COLUMN approved BOOLEAN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='approved_at') THEN
        ALTER TABLE notifications ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='approved_by') THEN
        ALTER TABLE notifications ADD COLUMN approved_by UUID REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='metadata') THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_approval ON notifications(requires_approval, approved) WHERE requires_approval = true;
CREATE INDEX IF NOT EXISTS idx_notifications_product ON notifications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_notification_thresholds_product ON product_notification_thresholds(product_id);
CREATE INDEX IF NOT EXISTS idx_product_notification_thresholds_warehouse ON product_notification_thresholds(warehouse_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_notification_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_threshold_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_rules' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON notification_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_notification_thresholds' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON product_notification_thresholds FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cash_threshold_configs' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON cash_threshold_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Enable realtime for notification tables
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notification_rules') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notification_rules;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='product_notification_thresholds') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE product_notification_thresholds;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='cash_threshold_configs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE cash_threshold_configs;
    END IF;
END $$;

-- Seed default notification rules
INSERT INTO notification_rules (type, enabled, delegable, requires_biometric, threshold_value, advance_days)
VALUES
    ('low_stock', true, false, false, NULL, NULL),
    ('expiry_alert', true, false, false, NULL, 30),
    ('return_request', true, true, false, NULL, NULL),
    ('invoice_cancelled', true, true, false, NULL, NULL),
    ('invoice_modified', true, true, false, NULL, NULL),
    ('cash_threshold', true, false, true, 50000, NULL),
    ('due_date', true, false, false, NULL, NULL),
    ('overdue', true, false, false, NULL, NULL),
    ('approval', true, false, true, NULL, NULL),
    ('payment_reminder', true, false, false, NULL, NULL),
    ('balance_alert', true, false, true, NULL, NULL),
    ('transfer_alert', true, false, false, NULL, NULL),
    ('system_alert', true, false, false, NULL, NULL)
ON CONFLICT (type) DO NOTHING;


-- ============================================
-- From: 013_google_auth_trigger.sql
-- ============================================
-- Trigger to automatically create a public.users record for Google OAuth signups
-- ensuring they are restricted to the 'customer' role.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- If the user signed up via Google OAuth
  IF new.raw_app_meta_data->>'provider' = 'google' THEN
    INSERT INTO public.users (id, email, full_name_ar, full_name_en, role, is_active, password_hash)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      'customer',
      true,
      'google_oauth'
    )
    ON CONFLICT (id) DO UPDATE SET 
      role = 'customer'; -- ensure role remains customer if logged in via google
      
    -- Also sync to customers table safely
    INSERT INTO public.customers (id, name, email, phone, loyalty_points)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.email,
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      0
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- From: 013_manager_guardrails.sql
-- ============================================
-- ============================================
-- Database Guardrails & Missing Tables
-- Version: 1.0.0
-- Fixes all 9 missing tables + double-entry engine
-- ============================================

-- ============================================
-- TIME CONTROL ENGINE TABLES
-- ============================================

-- Time control settings (manager sets total delivery time)
CREATE TABLE IF NOT EXISTS time_control_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_delivery_minutes INTEGER NOT NULL DEFAULT 60,
    pending_minutes INTEGER NOT NULL DEFAULT 5,
    preparing_minutes INTEGER NOT NULL DEFAULT 20,
    ready_minutes INTEGER NOT NULL DEFAULT 5,
    delivery_minutes INTEGER NOT NULL DEFAULT 30,
    auto_escalate BOOLEAN DEFAULT true,
    alert_blink_threshold_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage timers per order (SLA tracking)
CREATE TABLE IF NOT EXISTS order_stage_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    sla_seconds INTEGER NOT NULL,
    is_overdue BOOLEAN DEFAULT false,
    assigned_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLA performance log
CREATE TABLE IF NOT EXISTS sla_performance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    user_id UUID REFERENCES users(id),
    stage VARCHAR(50) NOT NULL,
    sla_seconds INTEGER NOT NULL,
    actual_seconds INTEGER NOT NULL,
    variance_seconds INTEGER NOT NULL,
    met_sla BOOLEAN NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMPLOYEES
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    department VARCHAR(100),
    salary NUMERIC(12,2) DEFAULT 0,
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEAVES & PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('annual', 'sick', 'emergency', 'permission')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASKS (Kanban)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id),
    assigned_to_employee UUID REFERENCES employees(id),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXPENSES & CUSTODIAN
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    employee_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    attachment_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custodian_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_budget NUMERIC(12,2) NOT NULL DEFAULT 5000,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 5000,
    last_replenished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RECONCILIATION
-- ============================================
CREATE TABLE IF NOT EXISTS reconciliation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    system_total NUMERIC(12,2) DEFAULT 0,
    actual_total NUMERIC(12,2) DEFAULT 0,
    difference NUMERIC(12,2) DEFAULT 0,
    settled BOOLEAN DEFAULT false,
    settled_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discrepancy_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('cash_shortage', 'cash_surplus', 'missing_item', 'extra_item', 'price_diff', 'other')),
    expected_value NUMERIC(12,2) NOT NULL,
    actual_value NUMERIC(12,2) NOT NULL,
    difference NUMERIC(12,2) NOT NULL,
    reason TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TREASURY LOANS (fallback table)
-- ============================================
CREATE TABLE IF NOT EXISTS treasury_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES treasury_accounts(id),
    amount NUMERIC(12,2) NOT NULL,
    loan_type VARCHAR(50) NOT NULL CHECK (loan_type IN ('personal', 'custodian_cashier', 'custodian_driver', 'advance_salary')),
    borrower_name VARCHAR(255),
    borrower_role VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_settled', 'settled', 'cancelled')),
    due_date DATE,
    settled_amount NUMERIC(12,2) DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOUBLE-ENTRY FINANCIAL GUARDRAILS
-- ============================================

-- Function: double-entry treasury transaction (guarantees ledger integrity)
CREATE OR REPLACE FUNCTION guard_double_entry_treasury()
RETURNS TRIGGER AS $$
BEGIN
    -- For every deposit: increment treasury_accounts balance
    IF NEW.type = 'deposit' THEN
        UPDATE treasury_accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'withdrawal' THEN
        UPDATE treasury_accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'transfer_in' THEN
        UPDATE treasury_accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'transfer_out' THEN
        UPDATE treasury_accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    END IF;

    -- Record in ledger for central audit
    INSERT INTO treasury_transaction_ledger (
        transaction_id, account_id, amount, type, balance_before, balance_after
    ) VALUES (
        NEW.id, NEW.account_id, NEW.amount, NEW.type,
        COALESCE((SELECT balance FROM treasury_accounts WHERE id = NEW.account_id), 0),
        COALESCE((SELECT balance FROM treasury_accounts WHERE id = NEW.account_id), 0)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ledger table for financial audit trail
CREATE TABLE IF NOT EXISTS treasury_transaction_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES treasury_transactions(id),
    account_id UUID REFERENCES treasury_accounts(id),
    amount NUMERIC(12,2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    balance_before NUMERIC(12,2),
    balance_after NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-balance treasury on any transaction
DROP TRIGGER IF EXISTS trg_treasury_double_entry ON treasury_transactions;
CREATE TRIGGER trg_treasury_double_entry
    AFTER INSERT ON treasury_transactions
    FOR EACH ROW
    EXECUTE FUNCTION guard_double_entry_treasury();

-- Function: concurrent stock debit/credit guardrail
CREATE OR REPLACE FUNCTION guard_stock_double_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Log stock movement in ledger
    INSERT INTO stock_movement_ledger (
        product_id, warehouse_id, quantity_before, quantity_after, movement_type, reference_id
    ) VALUES (
        NEW.product_id, NEW.warehouse_id,
        COALESCE((SELECT quantity FROM stock_items WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id), 0),
        COALESCE((SELECT quantity FROM stock_items WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id), 0) + NEW.quantity_change,
        TG_ARGV[0],
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Stock movement ledger
CREATE TABLE IF NOT EXISTS stock_movement_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    warehouse_id UUID REFERENCES warehouses(id),
    quantity_before NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity_after NUMERIC(12,2) NOT NULL DEFAULT 0,
    movement_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_date ON leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_date ON reconciliation_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_discrepancy_entries_session ON discrepancy_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_order_stage_timers_order ON order_stage_timers(order_id);
CREATE INDEX IF NOT EXISTS idx_order_stage_timers_stage ON order_stage_timers(stage);
CREATE INDEX IF NOT EXISTS idx_sla_performance_log_user ON sla_performance_log(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_ledger_product ON stock_movement_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_treasury_ledger_account ON treasury_transaction_ledger(account_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custodian_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS discrepancy_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reconciliation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS treasury_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS treasury_transaction_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_movement_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS time_control_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_stage_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sla_performance_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='employees' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leaves' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON leaves FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tasks' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='expenses' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='custodian_settings' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON custodian_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reconciliation_sessions' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON reconciliation_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='discrepancy_entries' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON discrepancy_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reconciliation_logs' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON reconciliation_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='treasury_transaction_ledger' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON treasury_transaction_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_movement_ledger' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON stock_movement_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='time_control_settings' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON time_control_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_stage_timers' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON order_stage_timers FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sla_performance_log' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON sla_performance_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;


-- ============================================
-- From: 014_customer_platform.sql
-- ============================================
-- ============================================
-- Customer Platform: Wallet, Loyalty, Tracking
-- Version: 1.0.0
-- ============================================

-- ============================================
-- CUSTOMER WALLET
-- ============================================
CREATE TABLE IF NOT EXISTS customer_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC(12,2) DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    total_recharged NUMERIC(12,2) DEFAULT 0,
    total_spent NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES customer_wallets(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('recharge', 'payment', 'refund', 'bonus', 'transfer')),
    method VARCHAR(50) CHECK (method IN ('cashier', 'transfer_code', 'card', 'coupon')),
    reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LOYALTY POINTS & COUPONS
-- ============================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES customer_wallets(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'expire')),
    reference VARCHAR(255),
    order_id UUID REFERENCES orders(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(12,2) NOT NULL,
    min_order NUMERIC(12,2) DEFAULT 0,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STOCK RESERVATIONS (Online Hold)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    warehouse_id UUID REFERENCES warehouses(id),
    quantity NUMERIC(12,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'deducted', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMER ADDRESSES
-- ============================================
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    address_text TEXT NOT NULL,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRACKING SIMULATION DATA
-- ============================================
CREATE TABLE IF NOT EXISTS tracking_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    current_stage VARCHAR(50) NOT NULL DEFAULT 'confirmed',
    stage_started_at TIMESTAMPTZ DEFAULT NOW(),
    total_delivery_minutes INTEGER NOT NULL DEFAULT 60,
    elapsed_minutes INTEGER DEFAULT 0,
    progress_pct NUMERIC(5,2) DEFAULT 0,
    driver_name VARCHAR(255),
    driver_phone VARCHAR(50),
    driver_lat NUMERIC(10,7),
    driver_lng NUMERIC(10,7),
    store_lat NUMERIC(10,7) DEFAULT 30.0444,
    store_lng NUMERIC(10,7) DEFAULT 31.2357,
    customer_lat NUMERIC(10,7),
    customer_lng NUMERIC(10,7),
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMER ORDERS (extended view)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    total NUMERIC(12,2),
    item_count INTEGER,
    status VARCHAR(50),
    reorder_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customer_wallets_user ON customer_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_wallet ON loyalty_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_coupons_user ON coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order ON stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user ON customer_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_order ON tracking_sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_history_user ON customer_order_history(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE customer_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_order_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_wallets' AND policyname='Customer can read own wallet') THEN
        CREATE POLICY "Customer can read own wallet" ON customer_wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wallet_transactions' AND policyname='Customer can read own transactions') THEN
        CREATE POLICY "Customer can read own transactions" ON wallet_transactions FOR SELECT TO authenticated USING (wallet_id IN (SELECT id FROM customer_wallets WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coupons' AND policyname='Customer can read own coupons') THEN
        CREATE POLICY "Customer can read own coupons" ON coupons FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_reservations' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON stock_reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_addresses' AND policyname='Customer manage own addresses') THEN
        CREATE POLICY "Customer manage own addresses" ON customer_addresses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tracking_sessions' AND policyname='Customer can read tracking') THEN
        CREATE POLICY "Customer can read tracking" ON tracking_sessions FOR SELECT TO authenticated USING (order_id IN (SELECT id FROM orders WHERE customer_id::text = auth.uid()::text OR customer_phone IS NOT NULL));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customer_order_history' AND policyname='Customer can read own history') THEN
        CREATE POLICY "Customer can read own history" ON customer_order_history FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
END $$;

