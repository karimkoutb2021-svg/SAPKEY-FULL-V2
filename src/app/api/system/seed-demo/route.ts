import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = createAdminClient();

    // 1. Fetch 10 existing products to use in orders
    const { data: products, error: productErr } = await supabase
      .from('products')
      .select('*')
      .limit(10);

    if (productErr || !products || products.length === 0) {
      return NextResponse.json({ error: 'يجب إضافة منتجات أولاً قبل توليد البيانات.' }, { status: 400 });
    }

    const { data: customers } = await supabase.from('customers').select('*').limit(5);

    const now = new Date();
    
    // Generate 15 Orders over the last 30 days
    for (let i = 0; i < 15; i++) {
      const orderDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const isDelivery = Math.random() > 0.5;
      const customer = customers && customers.length > 0 ? customers[Math.floor(Math.random() * customers.length)] : null;
      
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: customer?.id || null,
          status: 'completed',
          total_amount: 0, // will update later
          type: isDelivery ? 'delivery' : 'takeaway',
          created_at: orderDate.toISOString(),
        })
        .select()
        .single();

      if (orderErr) continue;

      let totalAmount = 0;
      const numItems = Math.floor(Math.random() * 4) + 1; // 1 to 4 items
      
      for (let j = 0; j < numItems; j++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const price = prod.price || Math.floor(Math.random() * 100) + 10;
        
        await supabase.from('order_items').insert({
          order_id: order.id,
          product_id: prod.id,
          quantity: qty,
          unit_price: price,
          total_price: qty * price
        });
        
        totalAmount += qty * price;
      }

      // Update Order Total
      await supabase.from('orders').update({ total_amount: totalAmount }).eq('id', order.id);

      // Create Treasury Transaction (Income)
      await supabase.from('treasury_transactions').insert({
        type: 'income',
        amount: totalAmount,
        category: 'مبيعات',
        reference_id: order.id,
        reference_type: 'order',
        notes: `مبيعات طلب #${order.id.slice(0, 8)}`,
        created_at: orderDate.toISOString()
      });

      // Create Invoice
      await supabase.from('invoices').insert({
        order_id: order.id,
        invoice_number: `INV-2026-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        customer_name: customer?.name || 'عميل نقدي',
        total_amount: totalAmount,
        tax_amount: totalAmount * 0.15,
        status: 'paid',
        issue_date: orderDate.toISOString()
      });

      // Create Delivery Tracking if applicable
      if (isDelivery) {
        await supabase.from('deliveries').insert({
          order_id: order.id,
          status: 'delivered',
          customer_address: customer?.address || 'القاهرة، مدينة نصر',
          tracking_code: `TRK-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          created_at: orderDate.toISOString()
        });
      }
    }

    // Generate 5 Expenses
    for (let i = 0; i < 5; i++) {
      const expDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const amount = Math.floor(Math.random() * 500) + 50;
      await supabase.from('expenses').insert({
        category: 'مصروفات تشغيل',
        amount: amount,
        notes: 'مصروفات تجريبية',
        payment_method: 'cash',
        date: expDate.toISOString().split('T')[0],
        created_at: expDate.toISOString()
      });

      await supabase.from('treasury_transactions').insert({
        type: 'expense',
        amount: amount,
        category: 'مصروفات',
        notes: 'مصروفات تشغيل تجريبية',
        created_at: expDate.toISOString()
      });
    }

    // Generate some Stock Adjustments (Receiving Goods)
    for (let i = 0; i < 3; i++) {
      const adjDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const prod = products[Math.floor(Math.random() * products.length)];
      await supabase.from('stock_adjustments').insert({
        product_id: prod.id,
        type: 'add',
        quantity: Math.floor(Math.random() * 50) + 10,
        reason: 'توليد بيانات - استلام بضاعة',
        created_at: adjDate.toISOString()
      });
    }

    return NextResponse.json({ success: true, message: 'تم توليد البيانات التجريبية بنجاح' });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
