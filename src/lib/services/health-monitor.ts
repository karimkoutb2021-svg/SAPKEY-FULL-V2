'use client';

// Real-time system health monitor
// Checks system health every 5 minutes and immediately reports errors
// Runs ONLY when there's internet connectivity (navigator.onLine)

interface HealthResult {
  label: string;
  status: 'healthy' | 'degraded' | 'down';
  message: string;
  latency?: number;
}

let monitorInterval: ReturnType<typeof setInterval> | null = null;
let lastResults: HealthResult[] = [];
let previousState: 'healthy' | 'warning' | 'critical' = 'healthy';

async function checkService(url: string, label: string, headers?: Record<string, string>, timeoutMs = 10000): Promise<HealthResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latency = Date.now() - start;
    if (res.ok) {
      return { label, status: 'healthy', message: `متصل (${latency}ms)`, latency };
    }
    if (res.status === 401 || res.status === 403) {
      // 401/403 means the service IS running but needs auth — that's healthy
      return { label, status: 'healthy', message: `متصل (${latency}ms)`, latency };
    }
    return { label, status: 'degraded', message: `حالة: ${res.status} (${latency}ms)`, latency };
  } catch (e: any) {
    const latency = Date.now() - start;
    return {
      label,
      status: 'down',
      message: e?.name === 'AbortError' ? 'مهلة الاتصال' : 'غير متاح',
      latency,
    };
  }
}

async function runHealthCheck(): Promise<HealthResult[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cshpnhzhzahnpvfflsgx.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const results: HealthResult[] = await Promise.all([
    checkService(`${supabaseUrl}/rest/v1/`, 'Supabase API', { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }),
    checkService(`${supabaseUrl}/auth/v1/health`, 'Supabase Auth', { 'apikey': anonKey }),
    checkService(`${supabaseUrl}/storage/v1/bucket`, 'Supabase Storage', { 'apikey': anonKey }),
    checkService(typeof window !== 'undefined' ? `${window.location.origin}/api/seed-users` : '', 'Application Server'),
  ]);

  results.push({
    label: 'Internet Connection',
    status: navigator.onLine ? 'healthy' : 'down',
    message: navigator.onLine ? 'متصل' : 'غير متصل',
  });

  return results;
}

function getOverallState(results: HealthResult[]): 'healthy' | 'warning' | 'critical' {
  if (results.some((r) => r.status === 'down')) return 'critical';
  if (results.some((r) => r.status === 'degraded')) return 'warning';
  return 'healthy';
}

async function sendReport(results: HealthResult[], state: string) {
  const report = results.map((r) => `[${r.status.toUpperCase()}] ${r.label}: ${r.message}${r.latency ? ` (${r.latency}ms)` : ''}`).join('\n');

  try {
    await fetch('/api/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: state === 'critical' ? '⚠️ نظام SAPKEY — عطل في الخدمة' :
                 state === 'warning' ? '⚠️ نظام SAPKEY — تدهور في الأداء' :
                 '✅ نظام SAPKEY — تم استعادة الخدمة',
        report: `الفحص اللحظي التلقائي\nالحالة: ${state}\nالوقت: ${new Date().toLocaleString('ar-EG')}\n\n${report}`,
        results,
        source: 'realtime-monitor',
      }),
    });
  } catch {}
}

export function startHealthMonitor(intervalMs = 300000) {
  if (monitorInterval) return;
  console.log('[HealthMonitor] Started (interval: ' + (intervalMs / 1000) + 's)');

  const check = async () => {
    if (!navigator.onLine) return;

    const results = await runHealthCheck();
    lastResults = results;
    const state = getOverallState(results);

    if (state !== previousState) {
      console.log(`[HealthMonitor] State changed: ${previousState} -> ${state}`);
      sendReport(results, state);
      previousState = state;
    } else if (state === 'critical') {
      sendReport(results, state);
    }
  };

  check();
  monitorInterval = setInterval(check, intervalMs);
}

export function stopHealthMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('[HealthMonitor] Stopped');
  }
}

export function getLastHealthResults(): HealthResult[] {
  return lastResults;
}
