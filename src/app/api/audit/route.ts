import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Create new audit session using Service Role (bypasses RLS)
    const { data: session, error } = await supabase
      .from('audit_sessions')
      .insert({
        type: data.type || 'manual',
        status: data.status || 'in_progress',
        initiated_by: data.initiated_by
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    console.error('Audit Creation Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
