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
