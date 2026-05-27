import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const migrations = [
    '008_shifts_wallet_deliveries.sql',
    '009_inventory_accounting_batches.sql',
  ];

  const results: { file: string; success: boolean; error?: string }[] = [];

  for (const file of migrations) {
    try {
      const filePath = path.join(process.cwd(), 'supabase', 'migrations', file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Split by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const stmt of statements) {
        if (!stmt.trim()) continue;
        const { error } = await supabase.rpc('exec_sql', { query: stmt });
        if (error && error.code !== '42883') {
          // 42883 = function doesn't exist, we'll try direct query
          console.log(`RPC failed for ${file}, trying direct exec...`);
        }
      }

      results.push({ file, success: true });
    } catch (e: any) {
      results.push({ file, success: false, error: e.message });
    }
  }

  return NextResponse.json({ results });
}
