const { Client } = require('pg');

const sql = `
-- Missing Treasury & Finance
CREATE TABLE IF NOT EXISTS treasury_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar VARCHAR(200) NOT NULL,
    type VARCHAR(50) DEFAULT 'main',
    currency VARCHAR(10) DEFAULT 'EGP',
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treasury_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treasury_id UUID REFERENCES treasury_accounts(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    attachment_url TEXT,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internal_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID,
    borrower_name VARCHAR(200) NOT NULL,
    borrower_role VARCHAR(50) DEFAULT 'employee',
    loan_type VARCHAR(50) DEFAULT 'personal',
    amount DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'active',
    issue_date TIMESTAMPTZ DEFAULT NOW(),
    expected_settlement_date TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'EGP',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES customer_wallets(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    description TEXT,
    reference_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Missing Inventory & Operations
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    qty DECIMAL(15,2) NOT NULL,
    reason TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    assigned_to UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    location TEXT,
    type VARCHAR(50) DEFAULT 'main',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    status VARCHAR(50) DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    qty DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_session_id UUID REFERENCES audit_sessions(id) ON DELETE CASCADE,
    image_url TEXT,
    extracted_text TEXT,
    processed_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coding_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    barcode VARCHAR(100),
    layout VARCHAR(50),
    printed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID,
    total DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    qty DECIMAL(15,2) NOT NULL,
    cost DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracking_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID,
    current_location JSONB,
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    total_debit DECIMAL(15,2) NOT NULL,
    total_credit DECIMAL(15,2) NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    account_id UUID REFERENCES chart_of_accounts(id),
    receipt_url TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Missing Employees
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(100),
    position VARCHAR(100),
    salary DECIMAL(15,2) DEFAULT 0,
    hire_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS audit_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) DEFAULT 'manual',
    status VARCHAR(50) DEFAULT 'in_progress',
    initiated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    differences JSONB DEFAULT '[]'::jsonb
);

DROP TABLE IF EXISTS audit_items CASCADE;
CREATE TABLE IF NOT EXISTS audit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_session_id UUID REFERENCES audit_sessions(id) ON DELETE CASCADE,
    stock_item_id UUID,
    product_name VARCHAR(200),
    product_sku VARCHAR(100),
    system_qty DECIMAL(15,2) DEFAULT 0,
    actual_qty DECIMAL(15,2) DEFAULT 0,
    variance DECIMAL(15,2),
    variance_value DECIMAL(15,2),
    cost_price DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'matched',
    notes TEXT,
    shelf_location VARCHAR(100),
    voice_input TEXT,
    ocr_confidence DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS coding_drafts CASCADE;
CREATE TABLE IF NOT EXISTS coding_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(100),
    product_name VARCHAR(200),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    unit VARCHAR(50),
    shelf_number VARCHAR(100),
    cost_price DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) DEFAULT 0,
    min_stock DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    submitted_by UUID,
    submitted_by_name VARCHAR(200),
    submitted_by_role VARCHAR(50),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    voice_input JSONB,
    image_url TEXT,
    request_type VARCHAR(50) DEFAULT 'create',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function setupDB() {
  const pass = encodeURIComponent('Msbchz@12345@');
  const connStr = 'postgresql://postgres.fpcpqgpbznbsmeqqxmhx:' + pass + '@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';
  const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 10000 });
  
  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query(sql);
    console.log('All missing tables created successfully!');
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await client.end();
  }
}

setupDB();
