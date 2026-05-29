'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, ExternalLink, Copy, Check } from 'lucide-react';

export default function SetupPage() {
  const [status, setStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const checkTables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup');
      const data = await res.json();
      setStatus(data.tables || {});
    } catch { }
    setLoading(false);
  };

  const runMigration = async () => {
    setRunning(true);
    setMessage('');
    try {
      const res = await fetch('/api/setup', { method: 'POST' });
      const data = await res.json();
      setMessage(data.status === 'success' ? '✅ تم إنشاء الجداول بنجاح!' : '❌ ' + (data.message || data.note || 'خطأ'));
      await checkTables();
    } catch (e: any) {
      setMessage('❌ ' + e.message);
    }
    setRunning(false);
  };

  useEffect(() => { checkTables(); }, []);

  const allReady = Object.values(status).every(v => v === '✅ exists');
  const sqlUrl = 'https://supabase.com/dashboard/project/cshpnhzhzahnpvfflsgx/sql';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">إعداد قاعدة البيانات</h1>
          <p className="text-muted-foreground mt-2">SAPKEY ERP - Supabase Setup</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
          <h2 className="text-lg font-semibold">🔍 حالة الجداول</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" /> جاري الفحص...</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(status).map(([name, s]) => (
                <div key={name} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-slate-50">
                  {s === '✅ exists' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  <span>{name}</span>
                  <span className={`mr-auto ${s === '✅ exists' ? 'text-green-600' : 'text-red-500'}`}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {allReady ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-700 font-medium">
              ✅ كل الجداول موجودة! النظام جاهز للتشغيل.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                ⚠️ بعض الجداول غير موجودة. يرجى تنفيذ الخطوات التالية:
              </div>

              <div className="space-y-2">
                <a href={sqlUrl} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
                  <ExternalLink className="h-4 w-4" />
                  فتح Supabase SQL Editor
                </a>

                <p className="text-xs text-muted-foreground text-center">
                  الخطوة 1: افتح الرابط أعلاه وسجل الدخول
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  الخطوة 2: افتح ملف <code className="bg-slate-100 px-1 rounded">supabase/migrations/setup_all.sql</code> في المشروع
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  الخطوة 3: انسخ المحتوى بالكامل وألصقه في SQL Editor
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  الخطوة 4: اضغط Run أو Ctrl+Enter
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={checkTables}
                        className="flex-1 h-10 rounded-xl border border-slate-300 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-1">
                  <RefreshCw className="h-3 w-3" /> إعادة الفحص
                </button>
                <button onClick={runMigration} disabled={running}
                        className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1">
                  {running ? <RefreshCw className="h-3 w-3 animate-spin" /> : '🔄'} محاولة تلقائية
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className="bg-slate-50 rounded-xl p-3 text-sm font-mono border">{message}</div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-3">
          <h2 className="text-lg font-semibold">🚀 روابط مهمة</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">التطبيق:</span>{' '}
              <a href="https://sapkey-solutions.vercel.app" className="text-blue-600 hover:underline" target="_blank">sapkey-solutions.vercel.app</a>
            </p>
            <p><span className="font-medium">GitHub:</span>{' '}
              <a href="https://github.com/karimkoutb2021-svg/SAPKEY-SOLUTIONS" className="text-blue-600 hover:underline" target="_blank">karimkoutb2021-svg/SAPKEY-SOLUTIONS</a>
            </p>
            <p><span className="font-medium">Supabase:</span>{' '}
              <a href="https://supabase.com/dashboard/project/cshpnhzhzahnpvfflsgx" className="text-blue-600 hover:underline" target="_blank">cshpnhzhzahnpvfflsgx</a>
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          SAPKEY ERP v1.0 - Supabase Migration
        </div>
      </div>
    </div>
  );
}
