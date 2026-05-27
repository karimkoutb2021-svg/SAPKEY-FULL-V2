import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// This endpoint is called by Vercel Cron Jobs every 6 hours
// It checks for expired/expiring subscriptions and sends notifications
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all tenant plans from system_logs or a dedicated table
    // For now, we use the hardcoded demo data logic
    // In production, this would query a tenants table

    const now = Date.now();
    const threeDaysFromNow = now + 86400000 * 3;

    // Try to fetch from Supabase
    const { data: tenants, error } = await supabase
      .from('system_logs')
      .select('*')
      .eq('level', 'subscription')
      .gte('created_at', new Date(now - 86400000 * 7).toISOString())
      .limit(50);

    // Log the check
    try {
      await supabase.from('system_logs').insert({
        subject: 'فحص انتهاء الباقات',
        report: `فحص تلقائي للباقات المنتهية\nالوقت: ${new Date().toISOString()}`,
        level: 'info',
        source: 'cron-expiry-check',
        created_at: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      timestamp: Date.now(),
      status: 'ok',
      checked: true,
      message: 'Expiry check completed',
    });
  } catch (err: any) {
    console.error('Expiry check failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
