CREATE TYPE account_type AS ENUM ('cash', 'bank', 'wallet', 'safe');
CREATE TYPE transaction_type AS ENUM ('in', 'out', 'transfer');
CREATE TYPE loan_status AS ENUM ('active', 'paid', 'defaulted');
CREATE TYPE stock_adjustment_type AS ENUM ('addition', 'deduction', 'damage', 'loss');
CREATE TYPE audit_type AS ENUM ('manual', 'voice', 'ocr');
CREATE TYPE time_status AS ENUM ('clock_in', 'clock_out', 'break_start', 'break_end');

CREATE TABLE IF NOT EXISTS treasury_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar VARCHAR(100) NOT NULL,
    type account_type NOT NULL DEFAULT 'cash',
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treasury_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES treasury_accounts(id),
    type transaction_type NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    performed_by UUID,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internal_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID,
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    status loan_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name VARCHAR(100) NOT NULL,
    barcode VARCHAR(50),
    sku VARCHAR(50),
    current_qty DECIMAL(10,2) DEFAULT 0,
    min_qty DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(20),
    warehouse_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID REFERENCES stock_items(id),
    adjustment_type stock_adjustment_type NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    reason TEXT,
    adjusted_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type audit_type NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress',
    initiated_by UUID,
    differences JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS time_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    status time_status NOT NULL,
    location JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(15,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_warehouse_id UUID,
    to_warehouse_id UUID,
    items JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coding_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coding_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name VARCHAR(100) NOT NULL,
    barcode_data VARCHAR(100),
    qr_data TEXT,
    label_type VARCHAR(20),
    printed BOOLEAN DEFAULT false,
    printed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
