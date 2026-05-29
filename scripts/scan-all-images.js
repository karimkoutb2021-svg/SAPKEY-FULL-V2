const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const OLD_URL = process.env.OLD_SUPABASE_URL;
const OLD_KEY = process.env.OLD_SUPABASE_KEY;
const oldSb = createClient(OLD_URL, OLD_KEY);

async function scanAllTables() {
  const tablesToCheck = [
    'products', 'product_categories', 'categories', 'banners', 'branding_settings',
    'users', 'orders', 'customers', 'suppliers', 'inventory', 'stock_items',
    'treasury_accounts', 'audit_sessions', 'order_pipeline',
    'audit_logs', 'notifications',
    'customer_notifications', 'customer_wishlist',
    'purchase_invoices', 'supplier_documents',
    'coupons', 'stock_adjustments', 'internal_loans',
    'tax_periods', 'bank_accounts', 'bank_transactions',
    'employees', 'journal_entries', 'chart_of_accounts',
    'expenses', 'petty_cash_entries', 'invoices',
    'held_orders', 'coupon_redemptions', 'customer_addresses',
    'wallet_transactions', 'platform_events',
    'stock_items', 'stock_adjustments', 'audit_items',
    'warehouses', 'coding_drafts', 'stock_transfers',
    'purchase_order_items', 'product_suppliers',
    'supplier_categories', 'supplier_contacts', 'supplier_ledger',
    'purchase_invoice_items', 'payment_schedules', 'payments',
    'product_images', 'product_variants',
    'delivery_orders', 'delivery_zones', 'delivery_partners',
    'loyalty_transactions', 'reward_items', 'customer_wallets',
  ];

  const report = {};

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await oldSb.from(table).select('*', { count: 'exact', head: true });
      if (error) continue;

      // Get one row to see column names
      const { data: sample } = await oldSb.from(table).select('*').limit(1);
      if (!sample || sample.length === 0) {
        console.log(`⏭️  ${table}: 0 rows`);
        report[table] = { rows: 0, imageColumns: [], note: 'empty' };
        continue;
      }

      // Find image-related columns
      const imageColumns = [];
      for (const col of Object.keys(sample[0])) {
        const colLower = col.toLowerCase();
        if (
          colLower.includes('image') || colLower.includes('img') ||
          colLower.includes('photo') || colLower.includes('picture') ||
          colLower.includes('avatar') || colLower.includes('icon') ||
          colLower.includes('logo') || colLower.includes('banner') ||
          colLower.includes('file') || colLower.includes('attachment') ||
          colLower.includes('url') || colLower.includes('thumbnail')
        ) {
          imageColumns.push(col);
        }
      }

      // Count how many rows have data in those columns
      const colStats = {};
      for (const col of imageColumns) {
        const { data: rows } = await oldSb.from(table).select(col).limit(1000);
        if (rows) {
          const nonEmpty = rows.filter(r => r[col] && r[col].length > 10).length;
          const base64Count = rows.filter(r => r[col] && typeof r[col] === 'string' && r[col].startsWith('data:')).length;
          const urlCount = rows.filter(r => r[col] && typeof r[col] === 'string' && (r[col].startsWith('http') || r[col].startsWith('/'))).length;
          colStats[col] = { nonEmpty, base64: base64Count, url: urlCount, sample: rows.find(r => r[col]) ? String(rows.find(r => r[col])[col]).substring(0, 80) : null };
        }
      }

      const { count } = await oldSb.from(table).select('*', { count: 'exact', head: true });
      console.log(`📋 ${table}: ${count} rows, columns: ${JSON.stringify(colStats)}`);
      report[table] = { rows: count, imageColumns, colStats };
    } catch (e) {
      // Skip tables that don't exist
    }
  }

  fs.writeFileSync(
    path.join(__dirname, '..', 'backup-data', 'schema-scan-report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('\n✅ Schema scan complete → backup-data/schema-scan-report.json');
}

scanAllTables().catch(console.error);
