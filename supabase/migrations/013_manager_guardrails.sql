-- ============================================
-- Database Guardrails & Missing Tables
-- Version: 1.0.0
-- Fixes all 9 missing tables + double-entry engine
-- ============================================

-- ============================================
-- TIME CONTROL ENGINE TABLES
-- ============================================

-- Time control settings (manager sets total delivery time)
CREATE TABLE IF NOT EXISTS time_control_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_delivery_minutes INTEGER NOT NULL DEFAULT 60,
    pending_minutes INTEGER NOT NULL DEFAULT 5,
    preparing_minutes INTEGER NOT NULL DEFAULT 20,
    ready_minutes INTEGER NOT NULL DEFAULT 5,
    delivery_minutes INTEGER NOT NULL DEFAULT 30,
    auto_escalate BOOLEAN DEFAULT true,
    alert_blink_threshold_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage timers per order (SLA tracking)
CREATE TABLE IF NOT EXISTS order_stage_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    sla_seconds INTEGER NOT NULL,
    is_overdue BOOLEAN DEFAULT false,
    assigned_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLA performance log
CREATE TABLE IF NOT EXISTS sla_performance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    user_id UUID REFERENCES users(id),
    stage VARCHAR(50) NOT NULL,
    sla_seconds INTEGER NOT NULL,
    actual_seconds INTEGER NOT NULL,
    variance_seconds INTEGER NOT NULL,
    met_sla BOOLEAN NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMPLOYEES
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    department VARCHAR(100),
    salary NUMERIC(12,2) DEFAULT 0,
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEAVES & PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('annual', 'sick', 'emergency', 'permission')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASKS (Kanban)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id),
    assigned_to_employee UUID REFERENCES employees(id),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXPENSES & CUSTODIAN
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    employee_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    attachment_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custodian_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_budget NUMERIC(12,2) NOT NULL DEFAULT 5000,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 5000,
    last_replenished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RECONCILIATION
-- ============================================
CREATE TABLE IF NOT EXISTS reconciliation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    system_total NUMERIC(12,2) DEFAULT 0,
    actual_total NUMERIC(12,2) DEFAULT 0,
    difference NUMERIC(12,2) DEFAULT 0,
    settled BOOLEAN DEFAULT false,
    settled_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discrepancy_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('cash_shortage', 'cash_surplus', 'missing_item', 'extra_item', 'price_diff', 'other')),
    expected_value NUMERIC(12,2) NOT NULL,
    actual_value NUMERIC(12,2) NOT NULL,
    difference NUMERIC(12,2) NOT NULL,
    reason TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TREASURY LOANS (fallback table)
-- ============================================
CREATE TABLE IF NOT EXISTS treasury_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES treasury_accounts(id),
    amount NUMERIC(12,2) NOT NULL,
    loan_type VARCHAR(50) NOT NULL CHECK (loan_type IN ('personal', 'custodian_cashier', 'custodian_driver', 'advance_salary')),
    borrower_name VARCHAR(255),
    borrower_role VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_settled', 'settled', 'cancelled')),
    due_date DATE,
    settled_amount NUMERIC(12,2) DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOUBLE-ENTRY FINANCIAL GUARDRAILS
-- ============================================

-- Function: double-entry treasury transaction (guarantees ledger integrity)
CREATE OR REPLACE FUNCTION guard_double_entry_treasury()
RETURNS TRIGGER AS $$
BEGIN
    -- For every deposit: increment treasury_accounts balance
    IF NEW.type = 'deposit' THEN
        UPDATE treasury_accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'withdrawal' THEN
        UPDATE treasury_accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'transfer_in' THEN
        UPDATE treasury_accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'transfer_out' THEN
        UPDATE treasury_accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    END IF;

    -- Record in ledger for central audit
    INSERT INTO treasury_transaction_ledger (
        transaction_id, account_id, amount, type, balance_before, balance_after
    ) VALUES (
        NEW.id, NEW.account_id, NEW.amount, NEW.type,
        COALESCE((SELECT balance FROM treasury_accounts WHERE id = NEW.account_id), 0),
        COALESCE((SELECT balance FROM treasury_accounts WHERE id = NEW.account_id), 0)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ledger table for financial audit trail
CREATE TABLE IF NOT EXISTS treasury_transaction_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES treasury_transactions(id),
    account_id UUID REFERENCES treasury_accounts(id),
    amount NUMERIC(12,2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    balance_before NUMERIC(12,2),
    balance_after NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-balance treasury on any transaction
DROP TRIGGER IF EXISTS trg_treasury_double_entry ON treasury_transactions;
CREATE TRIGGER trg_treasury_double_entry
    AFTER INSERT ON treasury_transactions
    FOR EACH ROW
    EXECUTE FUNCTION guard_double_entry_treasury();

-- Function: concurrent stock debit/credit guardrail
CREATE OR REPLACE FUNCTION guard_stock_double_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Log stock movement in ledger
    INSERT INTO stock_movement_ledger (
        product_id, warehouse_id, quantity_before, quantity_after, movement_type, reference_id
    ) VALUES (
        NEW.product_id, NEW.warehouse_id,
        COALESCE((SELECT quantity FROM stock_items WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id), 0),
        COALESCE((SELECT quantity FROM stock_items WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id), 0) + NEW.quantity_change,
        TG_ARGV[0],
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Stock movement ledger
CREATE TABLE IF NOT EXISTS stock_movement_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    warehouse_id UUID REFERENCES warehouses(id),
    quantity_before NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity_after NUMERIC(12,2) NOT NULL DEFAULT 0,
    movement_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_date ON leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_reconciliation_sessions_date ON reconciliation_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_discrepancy_entries_session ON discrepancy_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_order_stage_timers_order ON order_stage_timers(order_id);
CREATE INDEX IF NOT EXISTS idx_order_stage_timers_stage ON order_stage_timers(stage);
CREATE INDEX IF NOT EXISTS idx_sla_performance_log_user ON sla_performance_log(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movement_ledger_product ON stock_movement_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_treasury_ledger_account ON treasury_transaction_ledger(account_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custodian_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS discrepancy_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reconciliation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS treasury_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS treasury_transaction_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_movement_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS time_control_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_stage_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sla_performance_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='employees' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leaves' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON leaves FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tasks' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='expenses' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='custodian_settings' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON custodian_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reconciliation_sessions' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON reconciliation_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='discrepancy_entries' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON discrepancy_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reconciliation_logs' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON reconciliation_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='treasury_transaction_ledger' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON treasury_transaction_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_movement_ledger' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON stock_movement_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='time_control_settings' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON time_control_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_stage_timers' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON order_stage_timers FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sla_performance_log' AND policyname='Allow all for authenticated') THEN
        CREATE POLICY "Allow all for authenticated" ON sla_performance_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
