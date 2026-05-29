const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://cshpnhzhzahnpvfflsgx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running migration 007...');

  const tables = [
    {
      name: 'shifts',
      sql: `CREATE TABLE IF NOT EXISTS shifts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cashier_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        branch_id UUID,
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
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    },
    {
      name: 'pos_transactions',
      sql: `CREATE TABLE IF NOT EXISTS pos_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID,
        shift_id UUID,
        cashier_id UUID,
        branch_id UUID,
        transaction_number VARCHAR(50) UNIQUE NOT NULL,
        total DECIMAL(15,2) NOT NULL DEFAULT 0,
        cash_amount DECIMAL(15,2) DEFAULT 0,
        card_amount DECIMAL(15,2) DEFAULT 0,
        network_amount DECIMAL(15,2) DEFAULT 0,
        wallet_amount DECIMAL(15,2) DEFAULT 0,
        discount DECIMAL(15,2) DEFAULT 0,
        tax DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'completed',
        customer_id UUID,
        customer_name VARCHAR(255),
        items JSONB,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    },
    {
      name: 'held_orders',
      sql: `CREATE TABLE IF NOT EXISTS held_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cashier_id UUID,
        branch_id UUID,
        customer_name VARCHAR(255),
        items JSONB NOT NULL,
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax DECIMAL(15,2) DEFAULT 0,
        discount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    },
    {
      name: 'refunds',
      sql: `CREATE TABLE IF NOT EXISTS refunds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID,
        transaction_id UUID,
        cashier_id UUID,
        approved_by UUID,
        refund_number VARCHAR(50) UNIQUE NOT NULL,
        reason TEXT,
        items JSONB,
        total DECIMAL(15,2) NOT NULL DEFAULT 0,
        refund_method VARCHAR(50) DEFAULT 'cash',
        status VARCHAR(50) DEFAULT 'pending',
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    },
    {
      name: 'customer_wallets',
      sql: `CREATE TABLE IF NOT EXISTS customer_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        balance DECIMAL(15,2) DEFAULT 0,
        loyalty_points DECIMAL(15,2) DEFAULT 0,
        total_recharged DECIMAL(15,2) DEFAULT 0,
        total_spent DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    },
    {
      name: 'wallet_transactions',
      sql: `CREATE TABLE IF NOT EXISTS wallet_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id UUID,
        customer_id UUID,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        balance_after DECIMAL(15,2) NOT NULL,
        reference_type VARCHAR(50),
        reference_id UUID,
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    },
    {
      name: 'deliveries',
      sql: `CREATE TABLE IF NOT EXISTS deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID,
        driver_id UUID,
        customer_id UUID,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_address TEXT,
        customer_lat DECIMAL(10,8),
        customer_lng DECIMAL(11,8),
        store_lat DECIMAL(10,8) DEFAULT 30.0444,
        store_lng DECIMAL(11,8) DEFAULT 31.2357,
        status VARCHAR(50) DEFAULT 'pending',
        estimated_minutes INTEGER DEFAULT 30,
        actual_minutes INTEGER,
        delivery_fee DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        dispatched_at TIMESTAMPTZ,
        picked_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    },
    {
      name: 'delivery_proofs',
      sql: `CREATE TABLE IF NOT EXISTS delivery_proofs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        delivery_id UUID,
        photo_url TEXT,
        signature_url TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    },
    {
      name: 'loyalty_points',
      sql: `CREATE TABLE IF NOT EXISTS loyalty_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        points DECIMAL(15,2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        reference_type VARCHAR(50),
        reference_id UUID,
        expires_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    },
    {
      name: 'customer_addresses',
      sql: `CREATE TABLE IF NOT EXISTS customer_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        label VARCHAR(100),
        address TEXT NOT NULL,
        lat DECIMAL(10,8),
        lng DECIMAL(11,8),
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    },
    {
      name: 'order_status_log',
      sql: `CREATE TABLE IF NOT EXISTS order_status_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID,
        from_status VARCHAR(50),
        to_status VARCHAR(50) NOT NULL,
        changed_by UUID,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    }
  ];

  for (const table of tables) {
    console.log(`Creating table: ${table.name}...`);
    const { error } = await supabase.rpc('exec_sql', { sql_query: table.sql });
    if (error) {
      console.log(`  Note: Could not use exec_sql for ${table.name}, trying direct create...`);
      // Try creating via Supabase's REST API
      const { error: createError } = await supabase.from(table.name).select().limit(1);
      if (createError && createError.code === '42P01') {
        console.log(`  Table ${table.name} does not exist and exec_sql failed.`);
        console.log(`  Please run the SQL manually in Supabase SQL Editor.`);
      }
    } else {
      console.log(`  ✓ ${table.name} created`);
    }
  }

  // Enable RLS
  console.log('\nEnabling RLS...');
  const tableNames = tables.map(t => t.name);
  for (const name of tableNames) {
    await supabase.rpc('exec_sql', { sql_query: `ALTER TABLE ${name} ENABLE ROW LEVEL SECURITY` });
  }

  // Create customer wallets for existing customers
  console.log('\nCreating customer wallets...');
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('id');

  if (custError) {
    console.error('Error fetching customers:', custError.message);
  } else if (customers) {
    for (const customer of customers) {
      const { data: existing } = await supabase
        .from('customer_wallets')
        .select('id')
        .eq('customer_id', customer.id)
        .single();

      if (!existing) {
        await supabase.from('customer_wallets').insert({
          customer_id: customer.id,
          balance: 0,
          loyalty_points: 0,
          total_recharged: 0,
          total_spent: 0,
        });
        console.log(`  Created wallet for customer ${customer.id}`);
      }
    }
  }

  console.log('\nMigration complete!');
}

runMigration();
