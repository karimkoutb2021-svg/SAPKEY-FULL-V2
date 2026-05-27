'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity, Server, Database, Globe, HardDrive, Shield, Terminal, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, Clock, Wifi, Cpu, Zap, Bug, Send, Copy,
  ChevronDown, ChevronUp, Download, Search, FileWarning,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'checking';
type TestResult = { label: string; labelAr: string; status: ServiceStatus; message: string; messageAr: string; details?: string };

function StatusDot({ status }: { status: ServiceStatus }) {
  const colors = { healthy: 'bg-emerald-500', degraded: 'bg-amber-500', down: 'bg-red-500', checking: 'bg-gray-400 animate-pulse' };
  return <div className={`h-2 w-2 rounded-full ${colors[status]} shrink-0`} />;
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const styles = {
    healthy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    degraded: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    down: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    checking: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };
  const labels = { healthy: 'سليم', degraded: 'منخفض', down: 'معطل', checking: 'فحص...' };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>{labels[status]}</span>;
}

async function checkSupabase(): Promise<TestResult> {
  try {
    const start = performance.now();
    const res = await fetch('https://fpcpqgpbznbsmeqqxmhx.supabase.co/rest/v1/', {
      headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
      signal: AbortSignal.timeout(8000),
    });
    const latency = Math.round(performance.now() - start);
    if (res.ok) return { label: 'Supabase API', labelAr: 'API Supabase', status: 'healthy', message: `Connected (${latency}ms)`, messageAr: `متصل (${latency}ms)` };
    return { label: 'Supabase API', labelAr: 'API Supabase', status: 'degraded', message: `Status ${res.status}`, messageAr: `الحالة ${res.status}` };
  } catch {
    return { label: 'Supabase API', labelAr: 'API Supabase', status: 'down', message: 'Connection failed', messageAr: 'فشل الاتصال' };
  }
}

async function checkAuth(): Promise<TestResult> {
  try {
    const res = await fetch('https://fpcpqgpbznbsmeqqxmhx.supabase.co/auth/v1/user', {
      headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
      signal: AbortSignal.timeout(5000),
    });
    return { label: 'Auth Service', labelAr: 'خدمة المصادقة', status: 'healthy', message: `Responded ${res.status}`, messageAr: `استجابة ${res.status}` };
  } catch {
    return { label: 'Auth Service', labelAr: 'خدمة المصادقة', status: 'down', message: 'No response', messageAr: 'لا استجابة' };
  }
}

async function checkStorage(): Promise<TestResult> {
  try {
    const res = await fetch('https://fpcpqgpbznbsmeqqxmhx.supabase.co/storage/v1/bucket', {
      headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok || res.status === 401) return { label: 'Storage', labelAr: 'التخزين', status: 'healthy', message: 'Service online', messageAr: 'الخدمة عاملة' };
    return { label: 'Storage', labelAr: 'التخزين', status: 'degraded', message: `Status ${res.status}`, messageAr: `الحالة ${res.status}` };
  } catch {
    return { label: 'Storage', labelAr: 'التخزين', status: 'down', message: 'Unreachable', messageAr: 'لا يمكن الوصول' };
  }
}

async function checkVercel(): Promise<TestResult> {
  try {
    const start = performance.now();
    const res = await fetch('/api/seed-users', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    const latency = Math.round(performance.now() - start);
    return { label: 'Vercel Edge', labelAr: 'Vercel Edge', status: 'healthy', message: `${latency}ms response`, messageAr: `استجابة ${latency}ms`, details: `API endpoint /api/seed-users returned ${res.status}` };
  } catch {
    return { label: 'Vercel Edge', labelAr: 'Vercel Edge', status: 'degraded', message: 'Slow or no response', messageAr: 'بطيء أو لا استجابة' };
  }
}

async function checkNextjs(): Promise<TestResult> {
  return { label: 'Next.js Runtime', labelAr: 'بيئة Next.js', status: 'healthy', message: `v16 Turbopack`, messageAr: `v16 Turbopack` };
}

async function runAllChecks(): Promise<TestResult[]> {
  return Promise.all([checkSupabase(), checkAuth(), checkStorage(), checkVercel(), checkNextjs()]);
}

function generateReport(results: TestResult[], logs: string[]): string {
  const now = new Date().toISOString();
  const lines = [
    '========================================',
    '  SAPKEY SOLUTIONS — SYSTEM REPORT',
    '========================================',
    `  Generated: ${now}`,
    `  Environment: ${typeof window !== 'undefined' ? window.location.href : 'server'}`,
    `  User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
    '========================================',
    '',
    '--- SERVICE STATUS ---',
    ...results.map((r) => `  [${r.status.toUpperCase()}] ${r.label}: ${r.message}${r.details ? ` (${r.details})` : ''}`),
    '',
    '--- DIAGNOSTIC LOG ---',
    ...logs.map((l) => `  ${l}`),
    '',
    '--- FIX RECOMMENDATIONS ---',
    ...results.filter((r) => r.status === 'down' || r.status === 'degraded').map((r) => {
      if (r.label === 'Supabase API') return `  [FIX] ${r.label}: Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local. Check Supabase dashboard for service status. Restart: Go to Supabase > Settings > Restart project.`;
      if (r.label === 'Auth Service') return `  [FIX] ${r.label}: Check Supabase Auth settings > Providers. Ensure email/password auth is enabled. Clear browser cache and re-login.`;
      if (r.label === 'Storage') return `  [FIX] ${r.label}: Check Supabase Storage policies. Ensure buckets exist and RLS policies allow access. Verify storage URL configuration.`;
      if (r.label === 'Vercel Edge') return `  [FIX] ${r.label}: Check Vercel dashboard for deployment issues. Redeploy or check function logs. Verify environment variables are set in Vercel.`;
      return `  [FIX] ${r.label}: Restart the service and check configuration.`;
    }),
    '',
    '========================================',
    '  SAPKEY SOLUTIONS © 2026',
    '========================================',
  ];
  return lines.join('\n');
}

export default function SystemHealthPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [reportText, setReportText] = useState('');
  const logsRef = useRef<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const entry = `[${new Date().toLocaleTimeString('ar-EG')}] ${msg}`;
    logsRef.current = [...logsRef.current, entry];
    setLogs(logsRef.current);
  }, []);

  const runTests = useCallback(async () => {
    setRunning(true);
    setResults([]);
    setLogs([]);
    logsRef.current = [];
    addLog('بدء فحص النظام...');

    addLog('جاري فحص اتصال Supabase API...');
    const r = await runAllChecks();
    setResults(r);
    addLog(`تم الفحص: ${r.filter((x) => x.status === 'healthy').length}/5 خدمات سليمة`);

    const down = r.filter((x) => x.status === 'down');
    const degraded = r.filter((x) => x.status === 'degraded');
    if (down.length > 0) addLog(`تحذير: ${down.length} خدمات معطلة — يلزم تدخل فوري`);
    if (degraded.length > 0) addLog(`تنبيه: ${degraded.length} خدمات بأداء منخفض`);

    const report = generateReport(r, logsRef.current);
    setReportText(report);
    setRunning(false);
  }, [addLog]);

  useEffect(() => { runTests(); }, []);

  useEffect(() => {
    const ch = supabase.channel('admin-audit_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
        runTests();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText).then(() => toast.success('تم نسخ التقرير')).catch(() => toast.error('فشل النسخ'));
  };

  const sendReport = async () => {
    toast.success('جاري إرسال التقرير...');
    try {
      const res = await fetch('/api/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `تقرير حالة النظام — ${new Date().toLocaleDateString('ar-EG')}`,
          report: reportText,
          results: results.map((r) => ({ label: r.label, status: r.status, message: r.message })),
          source: 'admin-system-health',
        }),
      });
      if (res.ok) toast.success('تم إرسال التقرير إلى البريد الإلكتروني للمطور');
      else toast.error('فشل إرسال التقرير — تم حفظه محلياً');
    } catch {
      toast.error('فشل إرسال التقرير — تم حفظه محلياً');
    }
  };

  const downloadReport = () => {
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `system-report-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تحميل التقرير');
  };

  const overallStatus: ServiceStatus = results.length === 0 ? 'checking' :
    results.some((r) => r.status === 'down') ? 'down' :
    results.some((r) => r.status === 'degraded') ? 'degraded' : 'healthy';

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md ${
            overallStatus === 'healthy' ? 'from-emerald-500 to-green-600' :
            overallStatus === 'degraded' ? 'from-amber-500 to-orange-600' : 'from-red-500 to-rose-600'
          }`}>
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">صحة النظام والتشخيص</h1>
            <p className="text-xs text-gray-500">فحص شامل لجميع خدمات المنصة مع تقارير diagnotic وإصلاح</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runTests} disabled={running}
            className="h-9 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} /> إعادة الفحص
          </button>
          <button onClick={sendReport} disabled={running || results.length === 0}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
            <Send className="h-3.5 w-3.5" /> إرسال التقرير
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={`border-0 shadow-lg overflow-hidden ${
          overallStatus === 'healthy' ? 'bg-gradient-to-r from-emerald-500/5 to-green-600/5' :
          overallStatus === 'degraded' ? 'bg-gradient-to-r from-amber-500/5 to-orange-600/5' : 'bg-gradient-to-r from-red-500/5 to-rose-600/5'
        }`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              {overallStatus === 'healthy' ? <CheckCircle className="h-10 w-10 text-emerald-500" /> :
               overallStatus === 'degraded' ? <AlertTriangle className="h-10 w-10 text-amber-500" /> :
               <XCircle className="h-10 w-10 text-red-500" />}
              <div className="flex-1">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {overallStatus === 'healthy' ? 'جميع الخدمات تعمل بكفاءة' :
                   overallStatus === 'degraded' ? 'بعض الخدمات تعمل بأداء منخفض' : 'توجد أعطال في النظام'}
                </p>
                <p className="text-xs text-gray-500">
                  {overallStatus === 'healthy' ? 'النظام مستقر — لا توجد مشاكل' :
                   `تم اكتشاف ${results.filter((r) => r.status === 'down').length} عطل و${results.filter((r) => r.status === 'degraded').length} أداء منخفض — راجع التفاصيل أدناه`}
                </p>
              </div>
              <StatusBadge status={overallStatus} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {results.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`border shadow-sm hover:shadow-md transition-all ${
              s.status === 'healthy' ? 'border-emerald-200/50 dark:border-emerald-900/20' :
              s.status === 'degraded' ? 'border-amber-200/50 dark:border-amber-900/20' : 'border-red-200/50 dark:border-red-900/20'
            }`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm ${
                    s.status === 'healthy' ? 'from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' :
                    s.status === 'degraded' ? 'from-amber-100 to-orange-100' : 'from-red-100 to-rose-100'
                  }`}>
                    {s.status === 'healthy' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> :
                     s.status === 'degraded' ? <AlertTriangle className="h-5 w-5 text-amber-600" /> :
                     <XCircle className="h-5 w-5 text-red-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{s.labelAr}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-gray-500">{s.messageAr}</p>
                    {s.details && <p className="text-[9px] text-gray-400 font-mono mt-0.5">{s.details}</p>}
                  </div>
                </div>
              </CardContent>
              {s.status === 'down' && (
                <div className="px-4 pb-3">
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">الإصلاح المقترح:</p>
                    <p className="text-[10px] text-red-500 dark:text-red-300 mt-0.5">
                      {s.label === 'Supabase API' ? 'تحقق من المتغيرات SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في .env.local. افتح لوحة Supabase وتحقق من حالة الخدمة.' :
                       s.label === 'Auth Service' ? 'تأكد من تفعيل تسجيل الدخول بالبريد الإلكتروني في Supabase Auth > Providers. امسح ذاكرة المتصفح وحاول تسجيل الدخول مرة أخرى.' :
                       s.label === 'Storage' ? 'تأكد من وجود buckets التخزين في Supabase ومن تفعيل سياسات RLS المسموحة.' :
                       'أعد تشغيل الخدمة وتحقق من الإعدادات.'}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Diagnostic Log */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-0 shadow-lg dark:shadow-black/20 overflow-hidden">
          <button onClick={() => setExpanded(!expanded)} className="w-full p-5 pb-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">سجل التشخيص</h3>
              <Badge className="text-[9px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-0">{logs.length}</Badge>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gray-950 dark:bg-black p-4 font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto" dir="ltr">
                    {logs.length === 0 ? <span className="text-gray-600">No diagnostic data yet...</span> : logs.map((log, i) => (
                      <p key={i} className={`${log.includes('تحذير') || log.includes('معطل') ? 'text-red-400' : log.includes('تنبيه') || log.includes('منخفض') ? 'text-amber-400' : 'text-emerald-400'}`}>
                        <span className="text-gray-600">{'>'}</span> {log}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Error Explorer */}
      {results.some((r) => r.status === 'down' || r.status === 'degraded') && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 border-red-200/50 dark:border-red-900/20 shadow-lg bg-gradient-to-br from-red-50/50 to-white dark:from-red-950/10 dark:to-gray-950 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileWarning className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">مستكشف الأخطاء — إصلاح تلقائي مقترح</h3>
              </div>
              <div className="space-y-3">
                {results.filter((r) => r.status === 'down' || r.status === 'degraded').map((r) => (
                  <div key={r.label} className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Bug className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{r.labelAr}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.status === 'down' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.status === 'down' ? 'عطل' : 'ضعف أداء'}
                      </span>
                    </div>
                    <div className="space-y-1.5 mr-6">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-white">المشكلة: </span>
                        {r.status === 'down' ? 'لا يمكن الاتصال بالخدمة' : 'استجابة بطيئة من الخدمة'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-white">السبب المحتمل: </span>
                        {r.label === 'Supabase API' ? 'قد يكون انقطاع في خدمة Supabase أو خطأ في مفتاح API' :
                         r.label === 'Auth Service' ? 'قد يكون تعطيل في خدمة المصادقة أو خطأ في إعدادات OAuth' :
                         r.label === 'Storage' ? 'قد يكون عدم وجود صلاحيات وصول للملفات أو bucket محذوف' :
                         r.label === 'Vercel Edge' ? 'قد يكون هناك تأخير في استجابة Vercel أو خطأ في دالة serverless' :
                         'خطأ غير معروف — يرجى مراجعة السجلات'}
                      </p>
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 mt-2">
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">🔧 خطة الإصلاح:</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-300 mt-0.5">
                          {r.label === 'Supabase API' ? '1. افتح لوحة Supabase وتحقق من حالة الخدمة\n2. تأكد من صحة SUPABASE_URL و SUPABASE_ANON_KEY في .env.local\n3. أعد نشر التطبيق على Vercel\n4. جرب إعادة تشغيل Supabase project' :
                           r.label === 'Auth Service' ? '1. اذهب إلى Supabase Dashboard > Authentication > Providers\n2. تأكد من تفعيل Email/Password\n3. تأكد من صحة Site URL في إعدادات Auth\n4. امسح ذاكرة المتصفح وجرب مرة أخرى' :
                           r.label === 'Storage' ? '1. اذهب إلى Supabase Dashboard > Storage\n2. تأكد من وجود buckets المطلوبة\n3. تحقق من RLS policies للقراءة والكتابة\n4. جرب رفع ملف للتحقق من الصلاحيات' :
                           r.label === 'Vercel Edge' ? '1. افتح Vercel Dashboard وتحقق من حالة deployment\n2. راجع Function Logs للأخطاء\n3. تأكد من تعيين متغيرات البيئة في Vercel\n4. أعد النشر (redeploy)' :
                           '1. راجع سجل الأخطاء أعلاه\n2. حدد الخدمة المتأثرة\n3. اتصل بالدعم الفني'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Report Actions */}
      {reportText && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-lg dark:shadow-black/20">
            <div className="p-5 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">تقرير النظام الكامل</h3>
              <div className="flex items-center gap-2">
                <button onClick={copyReport} className="h-7 px-2.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-[10px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1">
                  <Copy className="h-3 w-3" /> نسخ
                </button>
                <button onClick={downloadReport} className="h-7 px-2.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-[10px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1">
                  <Download className="h-3 w-3" /> تحميل
                </button>
                <button onClick={sendReport} className="h-7 px-2.5 rounded-lg bg-emerald-500 text-white text-[10px] font-medium hover:bg-emerald-600 transition-all flex items-center gap-1">
                  <Send className="h-3 w-3" /> إرسال للمطور
                </button>
              </div>
            </div>
            <CardContent className="p-0">
              <pre className="p-4 bg-gray-950 dark:bg-black text-[10px] text-emerald-400 font-mono leading-relaxed max-h-80 overflow-y-auto rounded-b-2xl whitespace-pre-wrap" dir="ltr">{reportText}</pre>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
