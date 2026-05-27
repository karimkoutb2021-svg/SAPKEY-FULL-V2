import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient<any, any>;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

const SQL = `
-- ============================================
-- SAFE ENUM CREATION
-- ============================================
DO $$ BEGIN CREATE TYPE treasury_account_type AS ENUM ('main', 'private', 'branch', 'wallet'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE treasury_transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'opening'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE treasury_transaction_status AS ENUM ('pending', 'processing', 'delayed', 'completed', 'reconciled', 'rejected', 'returned'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE stock_adjustment_type AS ENUM ('add', 'remove', 'correction', 'damage', 'return', 'audit'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE audit_type AS ENUM ('voice', 'ocr', 'manual'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE audit_status AS ENUM ('in_progress', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE order_pipeline_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'refunded'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE time_status AS ENUM ('active', 'completed', 'absent', 'late'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE warehouse_type AS ENUM ('main', 'branch', 'cold_storage', 'dry_storage', 'display'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE coding_status AS ENUM ('pending', 'approved', 'rejected', 'active'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE audit_item_status AS ENUM ('matched', 'shortage', 'overage', 'damaged', 'not_found'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE transfer_status AS ENUM ('draft', 'pending_approval', 'approved', 'in_transit', 'received', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE product_history_type AS ENUM ('purchase', 'sale', 'transfer_in', 'transfer_out', 'adjustment', 'audit', 'damage', 'return', 'coding'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE purchase_order_status AS ENUM ('draft', 'pending', 'approved', 'received', 'partial', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'manager', 'accountant', 'cashier', 'warehouse', 'sales', 'delivery', 'supplier', 'customer', 'purchase'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- USERS
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
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(200),
    customer_phone VARCHAR(50),
    date TIMESTAMPTZ DEFAULT NOW(),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    paid DECIMAL(15,2) DEFAULT 0,
    remaining DECIMAL(15,2) DEFAULT 0,
    due_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'unpaid', 'partial', 'overdue', 'cancelled')),
    payment_method VARCHAR(50),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HELD ORDERS (POS)
-- ============================================
CREATE TABLE IF NOT EXISTS held_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BANK ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(200) NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_number VARCHAR(100),
    iban VARCHAR(50),
    swift VARCHAR(20),
    currency VARCHAR(10) DEFAULT 'EGP',
    opening_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    branch_name VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BANK TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'fee', 'interest')),
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    reference_number VARCHAR(100),
    counterparty_name VARCHAR(200),
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    is_reconciled BOOLEAN DEFAULT false,
    reconciliation_date TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PETTY CASH ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS petty_cash_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    paid_by VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    receipt_url TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TAX PERIODS
-- ============================================
CREATE TABLE IF NOT EXISTS tax_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_name VARCHAR(200) NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_sales DECIMAL(15,2) DEFAULT 0,
    total_purchases DECIMAL(15,2) DEFAULT 0,
    total_tax_due DECIMAL(15,2) DEFAULT 0,
    total_tax_paid DECIMAL(15,2) DEFAULT 0,
    filing_status VARCHAR(20) DEFAULT 'draft' CHECK (filing_status IN ('draft', 'filed', 'paid', 'overdue')),
    filed_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COUPON REDEMPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID,
    customer_id UUID,
    order_id UUID,
    discount_amount DECIMAL(15,2) NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'used' CHECK (status IN ('used', 'expired', 'cancelled'))
);

-- ============================================
-- CUSTOMER ADDRESSES
-- ============================================
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    label VARCHAR(100) DEFAULT 'المنزل',
    full_name VARCHAR(200),
    phone VARCHAR(20),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'مصر',
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WALLET TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES customer_wallets(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'purchase', 'refund', 'loyalty_earned', 'loyalty_redeemed', 'bonus', 'admin_adjustment')),
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    description TEXT,
    reference_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMER WISHLIST
-- ============================================
CREATE TABLE IF NOT EXISTS customer_wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, product_id)
);

-- ============================================
-- CUSTOMER NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS customer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(30) DEFAULT 'info' CHECK (type IN ('info', 'order', 'promo', 'wallet', 'system')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS (Platform)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    actor_id UUID,
    actor_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLATFORM EVENTS (Admin monitoring)
-- ============================================
CREATE TABLE IF NOT EXISTS platform_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_category VARCHAR(50) NOT NULL CHECK (event_category IN ('system', 'api', 'auth', 'database', 'deployment', 'security')),
    event_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'warning', 'error', 'info')),
    message TEXT,
    duration_ms INTEGER,
    source VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export async function GET() {
  const allTables = [
    'users', 'orders', 'products', 'customers', 'inventory',
    'treasury_accounts', 'treasury_transactions', 'internal_loans',
    'stock_items', 'stock_adjustments', 'audit_sessions',
    'order_pipeline', 'time_control',
    'warehouses', 'coding_drafts', 'audit_items',
    'stock_transfers', 'transfer_items', 'product_history',
    'audit_ocr_results', 'coding_labels',
    'purchase_orders', 'purchase_order_items',
    'tracking_sessions', 'customer_wallets', 'loyalty_transactions', 'coupons',
    'bank_accounts', 'bank_transactions', 'employees', 'tax_periods',
    'chart_of_accounts', 'journal_entries', 'expenses', 'petty_cash_entries',
    'invoices', 'held_orders',
    'coupon_redemptions', 'customer_addresses', 'wallet_transactions',
    'customer_wishlist', 'customer_notifications',
    'audit_logs', 'platform_events',
  ];
  const checkResults: Record<string, string> = {};
  for (const table of allTables) {
    const { error } = await getSupabase().from(table).select('count()', { count: 'exact', head: true });
    checkResults[table] = error ? '❌ missing' : '✅ exists';
  }

  const allExist = Object.values(checkResults).every(v => v === '✅ exists');

  return NextResponse.json({
    tables: checkResults,
    allReady: allExist,
    totalTables: allTables.length,
  });
}

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const host = new URL(url).host;

    const response = await fetch(`https://${host}/pg-api/v1/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ query: SQL })
    });

    if (response.ok) {
      return NextResponse.json({ status: 'success', message: 'Tables created!' });
    }

    const text = await response.text();
    return NextResponse.json({
      status: 'error',
      message: text.substring(0, 500),
      note: 'Please run SQL manually at: https://supabase.com/dashboard/project/fpcpqgpbznbsmeqqxmhx/sql'
    }, { status: 500 });

  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      message: err.message,
      note: 'Please run SQL manually at: https://supabase.com/dashboard/project/fpcpqgpbznbsmeqqxmhx/sql'
    }, { status: 500 });
  }
}
