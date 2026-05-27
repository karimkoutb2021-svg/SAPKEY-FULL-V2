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
