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
