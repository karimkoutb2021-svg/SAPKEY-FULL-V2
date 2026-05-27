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
