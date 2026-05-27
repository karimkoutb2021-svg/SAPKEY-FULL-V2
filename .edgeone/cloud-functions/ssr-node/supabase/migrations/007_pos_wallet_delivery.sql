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
