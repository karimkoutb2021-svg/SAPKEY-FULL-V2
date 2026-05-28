require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
  const { data: users } = await supabase.from('users').select('id').limit(1);
  const userId = users?.[0]?.id || '00000000-0000-0000-0000-000000000000'; // fallback
  
  console.log('Seeding customers...');
  for (let i=1; i<=5; i++) {
    const { error } = await supabase.from('customers').insert({
      name: `عميل تجريبي ${i}`,
      phone: `055000000${i}`
    });
    if (error) console.error('Customer Error:', error.message);
  }
  
  console.log('Seeding treasury...');
  const { data: accounts } = await supabase.from('treasury_accounts').select('id');
  let accountId = accounts?.[0]?.id;
  if (!accountId) {
    const { data: newAcc, error } = await supabase.from('treasury_accounts').insert({
       name_ar: 'الخزينة الرئيسية',
       type: 'cash',
       current_balance: 50000
    }).select('id').single();
    if (error) console.error('Treasury Account Error:', error.message);
    if (newAcc) accountId = newAcc.id;
  }
  if (accountId) {
    for (let i=1; i<=5; i++) {
      const { error } = await supabase.from('treasury_transactions').insert({
        account_id: accountId,
        type: i % 2 === 0 ? 'in' : 'out',
        amount: 500 * i,
        description: `حركة مالية تجريبية ${i}`,
        performed_by: userId
      });
      if (error) console.error('Treasury Transaction Error:', error.message);
    }
  }

  console.log('Seeding stock adjustments...');
  const { data: prods } = await supabase.from('products').select('id').limit(1);
  const productId = prods?.[0]?.id;
  if (productId) {
    for (let i=1; i<=5; i++) {
      const { error } = await supabase.from('stock_items').select('id').eq('product_id', productId).limit(1);
      const stockItemId = error?.id || productId;
      
      const { error: e2 } = await supabase.from('stock_adjustments').insert({
        item_id: productId,
        type: i % 2 === 0 ? 'in' : 'out',
        quantity: 10 * i,
        reason: `حركة مخزنية تجريبية ${i}`,
        user_id: userId
      });
      if (e2) {
          await supabase.from('stock_movements').insert({
              product_id: productId,
              type: i % 2 === 0 ? 'in' : 'out',
              quantity: 10 * i,
              reference: `حركة مخزنية تجريبية ${i}`,
              user_id: userId
          }).catch(()=>{});
      }
    }
  }

  console.log('Seeding complete');
}
seed().catch(console.error);
