const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Starting seed 2...');
  
  // Seed Orders
  const { data: orders } = await supabase.from('orders').select('id');
  if (!orders || orders.length < 5) {
    console.log('Seeding orders...');
    const fakeOrders = [];
    const now = new Date();
    for(let i=0; i<15; i++) {
      const date = new Date(now.getTime() - Math.random() * 15 * 24 * 60 * 60 * 1000);
      fakeOrders.push({
        order_number: `ORD-${Math.floor(Math.random() * 10000)}`,
        status: Math.random() > 0.3 ? 'completed' : 'pending',
        total: Math.floor(Math.random() * 1000) + 100,
        subtotal: Math.floor(Math.random() * 900) + 90,
        tax: Math.floor(Math.random() * 100),
        shipping_cost: 0,
        customer_id: null,
        shipping_address: {},
        payment_status: 'paid',
        payment_method: 'cash',
        created_at: date.toISOString()
      });
    }
    await supabase.from('orders').insert(fakeOrders);
  }

  // Seed Treasury
  const { data: treasury } = await supabase.from('treasury_accounts').select('id');
  if (!treasury || treasury.length === 0) {
    console.log('Seeding treasury...');
    await supabase.from('treasury_accounts').insert([
      { name_ar: 'الخزينة الرئيسية', name_en: 'Main Safe', current_balance: 50000, type: 'cash', is_active: true }
    ]);
  }
  
  const { data: tAccounts } = await supabase.from('treasury_accounts').select('id').limit(1);
  if (tAccounts && tAccounts.length > 0) {
    const { data: tx } = await supabase.from('treasury_transactions').select('id');
    if (!tx || tx.length < 5) {
      console.log('Seeding treasury transactions...');
      const fakeTx = [];
      const now = new Date();
      for(let i=0; i<10; i++) {
        const date = new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000);
        fakeTx.push({
          account_id: tAccounts[0].id,
          type: Math.random() > 0.3 ? 'in' : 'out',
          amount: Math.floor(Math.random() * 5000) + 100,
          description: 'حركة مالية لتجربة النظام',
          status: 'completed',
          created_at: date.toISOString()
        });
      }
      await supabase.from('treasury_transactions').insert(fakeTx);
    }
  }

  // Seed Expenses
  const { data: exps } = await supabase.from('expenses').select('id');
  if (!exps || exps.length < 5) {
    console.log('Seeding expenses...');
    const fakeExps = [];
    const now = new Date();
    for(let i=0; i<5; i++) {
      const date = new Date(now.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000);
      fakeExps.push({
        title_ar: `مصروف تجريبي ${i+1}`,
        amount: Math.floor(Math.random() * 1000) + 50,
        status: 'approved',
        category: 'general',
        created_at: date.toISOString()
      });
    }
    await supabase.from('expenses').insert(fakeExps);
  }

  console.log('Seed 2 completed!');
}

seed().catch(console.error);
