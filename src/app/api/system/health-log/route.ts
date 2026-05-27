import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subject, report, results, source } = body;

    const supabase = createAdminClient();

    // Store in audit_logs (since system_logs table doesn't exist)
    const { error } = await supabase.from('audit_logs').insert({
      entity_type: 'system_health',
      entity_id: `health-${Date.now()}`,
      action: source === 'cron-auto-check' ? 'auto_health_check' : 'manual_health_check',
      new_values: {
        subject,
        report,
        results,
        source: source || 'unknown',
        level: results?.some((r: any) => r.status === 'down') ? 'critical' :
               results?.some((r: any) => r.status === 'degraded') ? 'warning' : 'healthy',
      },
    });

    if (error) {
      console.warn('Failed to store health log:', error.message);
      return NextResponse.json({ success: false, error: error.message, stored: false });
    }

    return NextResponse.json({ success: true, stored: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'system_health')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ logs: [], error: error.message, fallback: true });
    }

    return NextResponse.json({
      logs: (data || []).map((log: any) => ({
        ...log,
        new_values: typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values,
      })),
      count: data?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ logs: [], error: err.message, fallback: true });
  }
}
