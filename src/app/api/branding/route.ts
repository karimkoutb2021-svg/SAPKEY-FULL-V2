import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('branding_settings')
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result: Record<string, any> = {};
    if (data) {
      for (const row of data) {
        try {
          result[row.key] = JSON.parse(row.value);
        } catch {
          result[row.key] = row.value;
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const stringValue = JSON.stringify(value);

    const { data: existing } = await supabase
      .from('branding_settings')
      .select('id')
      .eq('key', key)
      .single();

    let error;
    if (existing) {
      const res = await supabase
        .from('branding_settings')
        .update({ value: stringValue, updated_at: new Date().toISOString() })
        .eq('key', key);
      error = res.error;
    } else {
      const res = await supabase
        .from('branding_settings')
        .insert({ key, value: stringValue });
      error = res.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
