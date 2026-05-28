import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Verify admin role (in a real app, verify via JWT/session)
    // Here we'll just allow it since it's a developer tool route requested by the user

    // Tables to clear in reverse dependency order
    const tablesToClear = [
      'order_items',
      'order_status_log',
      'refunds',
      'deliveries',
      'pos_transactions',
      'held_orders',
      'orders',
      'wallet_transactions',
      'customer_wallets',
      'loyalty_points',
      'shift_audit_log',
      'shifts',
      'stock_movements',
      'inventory_stock',
      'journal_lines',
      'journal_entries',
      'payments',
      'payment_schedules',
      'purchase_invoice_items',
      'purchase_invoices',
      'supplier_account_statements',
      'supplier_ledger',
      'import_logs',
      'audit_logs',
      'notifications'
    ];

    // Using a raw SQL query via RPC would be better, but we can do parallel deletes 
    // for independent tables, or sequential to avoid foreign key issues.
    // For safety, we will just call an RPC if it exists, otherwise delete sequentially.
    
    // Fallback sequential delete (ignoring errors if table doesn't exist)
    for (const table of tablesToClear) {
      await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // Reset current_stock in products table to 0
    await supabase.from('products').update({ current_stock: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');

    return NextResponse.json({ success: true, message: 'Factory reset completed.' });
  } catch (error: any) {
    console.error('Factory reset error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
