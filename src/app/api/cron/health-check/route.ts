import { NextResponse } from 'next/server';

// This endpoint is called by Vercel Cron Jobs every hour
// It auto-checks system health and sends reports to admin email
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function checkService(url: string, label: string, headers?: Record<string, string>, timeoutMs = 8000) {
  const start = Date.now();
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    const latency = Date.now() - start;
    // 401/403 means service IS running but requires auth — that's healthy
    const isHealthy = res.ok || res.status === 401 || res.status === 403;
    return {
      label,
      status: isHealthy ? 'healthy' : 'degraded',
      message: isHealthy ? `متصل (${latency}ms)` : `حالة: ${res.status} (${latency}ms)`,
      latency,
    };
  } catch (e: any) {
    return { label, status: 'down', message: e?.name === 'AbortError' ? 'مهلة' : 'فشل الاتصال', latency: Date.now() - start };
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const results: { label: string; status: string; message: string; latency?: number }[] = [];

  // 1. Check Supabase API
  if (supabaseUrl) {
    results.push(await checkService(
      `${supabaseUrl}/rest/v1/`,
      'Supabase API',
      { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    ));
  }

  // 2. Check Supabase Auth
  if (supabaseUrl) {
    results.push(await checkService(
      `${supabaseUrl}/auth/v1/health`,
      'Supabase Auth',
      { 'apikey': anonKey }
    ));
  }

  // 3. Check Vercel Edge
  const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (vercelUrl) {
    results.push(await checkService(
      vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`,
      'Vercel Edge'
    ));
  }

  // 4. Check Next.js Runtime
  results.push({
    label: 'Next.js Runtime',
    status: 'healthy',
    message: `مدة التشغيل: ${process.uptime().toFixed(0)}ث`,
  });

  // Determine overall status
  const hasDown = results.some((r) => r.status === 'down');
  const hasDegraded = results.some((r) => r.status === 'degraded');
  const overall = hasDown ? 'critical' : hasDegraded ? 'warning' : 'healthy';

  // Send report to admin email via report-error API
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/report-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: overall === 'healthy' ? '✅ الفحص الدوري — النظام سليم' : '⚠️ الفحص الدوري — توجد مشاكل',
        report: `الفحص التلقائي الدوري للنظام\nالحالة العامة: ${overall}\nالوقت: ${new Date().toISOString()}\n\nالخدمات المفحوصة:\n${results.map((r) => `[${r.status}] ${r.label}: ${r.message}${r.latency ? ` (${r.latency}ms)` : ''}`).join('\n')}`,
        results,
        source: 'cron-auto-check',
      }),
    });
  } catch {}

  return NextResponse.json({
    timestamp: Date.now(),
    overall,
    results,
  });
}
