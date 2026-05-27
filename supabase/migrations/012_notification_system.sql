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
