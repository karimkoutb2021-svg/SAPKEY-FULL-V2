'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Database, Download, Upload, Shield, CheckCircle, AlertTriangle,
  Loader2, FileText, Clock, RefreshCw, FileSpreadsheet, FileType,
  BarChart3, PieChart, TrendingUp, DownloadCloud, Trash2, ChevronDown,
  Users, CreditCard, Activity, AlertCircle, Server, Smartphone,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useSubscriptionStore } from '@/lib/store/subscription-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
import {
  exportToJson, exportToExcel, exportToPdf, type ReportData, type ReportColumn,
  exportBackupAsJson, exportBackupAsExcel,
} from '@/lib/services/reports-export';
import { getLastSyncReport } from '@/lib/services/daily-sync';
import toast from 'react-hot-toast';

const COLORS = ['#059669', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

export default function BackupPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { plans, tenantPlans } = useSubscriptionStore();
  const branding = useBrandingStore((s) => s.branding);
  const isAdmin = user?.role === 'admin';

  const [exporting, setExporting] = useState<'json' | 'excel' | 'pdf' | null>(null);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [backupData, setBackupData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastSync = getLastSyncReport();

  // Stats from subscription store
  const activePlans = tenantPlans.filter((tp) => tp.status === 'active');
  const expiredPlans = tenantPlans.filter((tp) => tp.status === 'expired');
  const activeSubsCount = activePlans.length;
  const expiredCount = expiredPlans.length;
  const totalTenants = tenantPlans.length;

  // Plan distribution for chart
  const planDistribution = plans.map((plan) => ({
    name: plan.nameAr,
    count: tenantPlans.filter((tp) => tp.planId === plan.id && tp.status === 'active').length,
    color: plan.color.split(' ').pop()?.replace('to-', '') || '#059669',
  })).filter((p) => p.count > 0);

  // Status distribution
  const statusData = [
    { name: 'نشط', value: activeSubsCount, color: '#059669' },
    { name: 'منتهي', value: expiredCount, color: '#EF4444' },
    { name: 'ملغي', value: tenantPlans.filter((tp) => tp.status === 'cancelled').length, color: '#6B7280' },
    { name: 'تجريبي', value: tenantPlans.filter((tp) => tp.status === 'trial').length, color: '#F59E0B' },
  ].filter((s) => s.value > 0);

  // Expiry timeline (next 30 days)
  const expiryTimeline = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const expiring = tenantPlans.filter((tp) => {
      const daysLeft = Math.ceil((tp.endDate - Date.now()) / 86400000);
      return daysLeft === day && tp.status === 'active';
    }).length;
    return { day: `+${day}`, count: expiring };
  });

  useEffect(() => {
    setLoading(false);
  }, []);

  const fetchBackup = useCallback(async () => {
    const res = await fetch('/api/admin/backup');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.backup;
  }, []);

  const handleExportJson = async () => {
    setExporting('json');
    try {
      const backup = await fetchBackup();
      setBackupData(backup);
      exportBackupAsJson({ backup });
      toast.success('تم تصدير النسخة الاحتياطية JSON بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'فشل التصدير');
    } finally { setExporting(null); }
  };

  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      const backup = await fetchBackup();
      setBackupData(backup);
      exportBackupAsExcel(backup);
      toast.success('تم تصدير التقارير Excel بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'فشل التصدير');
    } finally { setExporting(null); }
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    try {
      const backup = await fetchBackup();

      const subReport: ReportData = {
        title: 'Subscription Report',
        titleAr: 'تقرير الاشتراكات',
        subtitle: 'SAPKEY SOLUTIONS - Subscription Overview',
        subtitleAr: 'سابكي سوليوشنز - نظرة عامة على الاشتراكات',
        columns: [
          { key: 'index', label: '#', labelAr: '#', width: 6 },
          { key: 'tenantId', label: 'Tenant', labelAr: 'المستأجر', width: 25 },
          { key: 'planId', label: 'Plan', labelAr: 'الباقة', width: 18 },
          { key: 'status', label: 'Status', labelAr: 'الحالة', width: 14 },
          { key: 'endDate', label: 'Expiry', labelAr: 'تاريخ الانتهاء', type: 'date', width: 20 },
        ],
        rows: (backup.subscriptions || []).map((s: any, i: number) => ({
          index: i + 1,
          ...s,
        })),
        totals: {
          index: (backup.subscriptions?.length || 0),
        },
      };

      await exportToPdf('backup-chart-container', subReport, `sapkey-report-${new Date().toISOString().split('T')[0]}`);
      toast.success('تم تصدير تقرير PDF مع الرسوم البيانية بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'فشل التصدير');
    } finally { setExporting(null); }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('اختر ملف النسخة الاحتياطية أولاً');
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.backup) throw new Error('الملف غير صالح');

      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup: data.backup }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success(result.message);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      toast.error(err.message || 'فشل الاستيراد');
    } finally { setImporting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl mx-auto bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
            <Database className="h-7 w-7 text-white" />
          </div>
          <p className="text-sm text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6 pb-10 max-w-6xl mx-auto">
      {/* Apple-style Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-900 p-6 md:p-8 shadow-2xl"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Database className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">التقارير والنسخ الاحتياطي</h1>
              <p className="text-emerald-100/80 text-sm mt-1">SAPKEY SOLUTIONS — تصدير واستيراد واستعادة البيانات</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold text-white">{totalTenants}</p>
              <p className="text-[10px] text-emerald-100/70">الإجمالي</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold text-emerald-200">{activeSubsCount}</p>
              <p className="text-[10px] text-emerald-100/70">نشط</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold text-red-300">{expiredCount}</p>
              <p className="text-[10px] text-emerald-100/70">منتهي</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap items-center gap-3"
      >
        {lastSync && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[11px] text-gray-500">آخر مزامنة:</span>
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
              {new Date(lastSync.timestamp).toLocaleString('ar-EG')}
            </span>
            {lastSync.synced ? (
              <Badge variant="success" className="text-[9px] border-0 h-5">متزامن</Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px] border-0 h-5">غير متزامن</Badge>
            )}
          </div>
        )}
        <Badge variant="outline" className="text-[10px] gap-1 border-gray-200 dark:border-gray-700">
          <Shield className="h-3 w-3" />
          {isAdmin ? 'المطور' : 'المدير'}
        </Badge>
      </motion.div>

      {/* Charts Section - Beautiful recharts */}
      <div ref={chartRef} id="backup-chart-container" className="space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {/* Plan Distribution Bar Chart */}
          <Card className="border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden col-span-1 md:col-span-1 lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">توزيع الباقات</h3>
                </div>
                <span className="text-[10px] text-gray-400">{activeSubsCount} نشط</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={planDistribution} barSize={28} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontSize: 11, fontWeight: 600 }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#059669">
                    {planDistribution.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Pie Chart */}
          <Card className="border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-blue-500" />
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">حالة الاشتراكات</h3>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <RePieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontSize: 11, fontWeight: 600 }}
                  />
                </RePieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {statusData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-[10px] text-gray-500">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Expiry Timeline */}
          <Card className="border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">انتهاء الباقات (30 يوم)</h3>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={expiryTimeline}>
                  <defs>
                    <linearGradient id="expiryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontSize: 11, fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} fill="url(#expiryGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        {/* JSON Export */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-white dark:bg-gray-900 group">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <FileType className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">JSON</h3>
            <p className="text-[11px] text-gray-500 mb-5">نسخة احتياطية كاملة بجميع البيانات</p>
            <button onClick={handleExportJson} disabled={exporting === 'json'}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
              {exporting === 'json' ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
              {exporting === 'json' ? 'جاري...' : 'تصدير JSON'}
            </button>
          </CardContent>
        </Card>

        {/* Excel Export */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-white dark:bg-gray-900 group">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Excel</h3>
            <p className="text-[11px] text-gray-500 mb-5">تقارير Excel احترافية (اشتراكات + مستخدمين + سجلات)</p>
            <button onClick={handleExportExcel} disabled={exporting === 'excel'}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
              {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {exporting === 'excel' ? 'جاري...' : 'تصدير Excel'}
            </button>
          </CardContent>
        </Card>

        {/* PDF Export */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-white dark:bg-gray-900 group">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">PDF + رسوم بيانية</h3>
            <p className="text-[11px] text-gray-500 mb-5">تقرير PDF احترافي مع الرسوم البيانية المضمنة</p>
            <button onClick={handleExportPdf} disabled={exporting === 'pdf'}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
              {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {exporting === 'pdf' ? 'جاري...' : 'تصدير PDF'}
            </button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Import Section - Admin only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/10 dark:to-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">استيراد نسخة احتياطية</h3>
                  <p className="text-[11px] text-gray-500">متاح للمطور فقط — استعادة البيانات من ملف JSON</p>
                </div>
                <Badge variant="secondary" className="text-[9px] border-0 mr-auto">المطور فقط</Badge>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <input ref={fileRef} type="file" accept=".json" onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="flex-1 text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-amber-50 dark:file:bg-amber-950/30 file:text-amber-700 dark:file:text-amber-300 hover:file:bg-amber-100 transition-all" />
                <button onClick={handleImport} disabled={importing || !file}
                  className="h-11 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 shrink-0">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? 'جاري الاستيراد...' : 'استيراد'}
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Info & Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="border-0 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-gray-900 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1.5">
                <p className="font-medium text-gray-700 dark:text-gray-300">معلومات المزامنة والنسخ الاحتياطي</p>
                <ul className="space-y-1 mr-4 list-disc">
                  <li>تتم المزامنة اليومية تلقائياً — كل 24 ساعة أو فور عودة الاتصال بالإنترنت</li>
                  <li>خلال المزامنة: فحص تواريخ الباقات ← إيقاف المنتهية ← إرسال إشعارات واتساب ← مزامنة Supabase</li>
                  <li>إشعارات الباقة: قبل 7 أيام، 3 أيام، ويوم من الانتهاء + إشعار فوري عند الانتهاء</li>
                  <li>ملفات Excel تحتوي على تنسيق احترافي (ألوان، حدود، عناوين، إجمالي) — 3 أوراق منفصلة</li>
                  <li>ملفات PDF تحتوي على غلاف احترافي + جدول بيانات + الرسوم البيانية من الصفحة مضمنة</li>
                  <li>جميع التقارير قابلة للطباعة والمشاركة — مناسبة للعرض على العملاء</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
