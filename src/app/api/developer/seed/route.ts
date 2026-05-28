import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const host = new URL(url).host;

    // Load the seed file
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '006_seed_all_categories.sql');
    let sql = '';
    
    try {
      sql = fs.readFileSync(sqlPath, 'utf8');
    } catch (e) {
      console.warn("Could not load SQL file from filesystem, using fallback minimal seed");
      // Fallback logic if needed, but for now we expect the file to exist in the repo
      return NextResponse.json({ success: false, message: 'Could not load seed file from server' }, { status: 500 });
    }

    // Execute via Supabase PG-API
    const response = await fetch(`https://${host}/pg-api/v1/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    return NextResponse.json({ success: true, message: 'تم استعادة البيانات التجريبية بنجاح!' });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
