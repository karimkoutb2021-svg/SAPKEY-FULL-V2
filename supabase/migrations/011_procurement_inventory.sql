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
