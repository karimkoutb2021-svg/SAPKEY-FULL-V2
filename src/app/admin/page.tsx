'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Database, Server, Globe, HardDrive, Terminal,
  Users, CreditCard, Activity, ScrollText, BarChart3, Rocket,
  Palette, Clock, Cpu, Wifi, Cloud, RefreshCw, BookOpen,
  CheckCircle, XCircle,
} from 'lucide-react';
import { useSubscriptionStore } from '@/lib/store/subscription-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function AdminDashboard() {
  const { tenantPlans, plans } = useSubscriptionStore();
  const { user } = useAuthStore();
  const [health, setHealth] = useState({ server: 'checking', db: 'checking', auth: 'checking' });
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<'online' | 'degraded' | 'offline'>('online');

  const activeTenants = tenantPlans.filter((tp) => tp.status === 'active').length;
  const expiredTenants = tenantPlans.filter((tp) => tp.status === 'expired').length;
  const totalUsers = useAuthStore.getState().user ? 1 : 0;

  useEffect(() => {
    checkHealth();
    loadRecentEvents();

    const ch = supabase.channel('admin-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => { checkHealth(); loadRecentEvents(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_events' }, () => { checkHealth(); loadRecentEvents(); })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadRecentEvents = async () => {
    try {
      const { data } = await supabase.from('platform_events').select('*').order('created_at', { ascending: false }).limit(5);
      if (data) setRecentEvents(data);
    } catch { /* silent */ }
  };

  const checkHealth = async () => {
    setLoading(true);
    const results = { server: 'error', db: 'error', auth: 'error' };

    try {
      const res = await fetch('/api/system/health-log');
      results.server = res.ok ? 'online' : 'error';
    } catch { results.server = 'error'; }

    try {
      const supabase = createClient();
      const { error } = await supabase.from('audit_logs').select('id').limit(1);
      results.db = error ? 'error' : 'connected';
    } catch { results.db = 'error'; }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.getSession();
      results.auth = error ? 'error' : 'active';
    } catch { results.auth = 'error'; }

    setHealth(results);
    setLoading(false);
  };

  const healthItems = [
    { label: 'السيرفر', value: health.server === 'online' ? 'متصل' : 'غير متصل', sub: 'Vercel Edge', icon: Globe, color: health.server === 'online' ? 'from-emerald-500 to-green-600' : 'from-red-500 to-red-600' },
    { label: 'قاعدة البيانات', value: health.db === 'connected' ? 'متصلة' : 'غير متصلة', sub: 'Supabase PG', icon: Database, color: health.db === 'connected' ? 'from-emerald-500 to-green-600' : 'from-red-500 to-red-600' },
    { label: 'المصادقة', value: health.auth === 'active' ? 'نشطة' : 'غير نشطة', sub: 'Supabase Auth', icon: Shield, color: health.auth === 'active' ? 'from-emerald-500 to-green-600' : 'from-red-500 to-red-600' },
    { label: 'المستأجرين النشطين', value: String(activeTenants), sub: `من أصل ${tenantPlans.length}`, icon: Users, color: 'from-blue-500 to-indigo-600' },
    { label: 'الباقات', value: String(plans.length), sub: 'خطة متاحة', icon: CreditCard, color: 'from-emerald-500 to-green-600' },
    { label: 'المتنهي', value: String(expiredTenants), sub: 'يحتاج تجديد', icon: Clock, color: expiredTenants > 0 ? 'from-amber-500 to-orange-600' : 'from-emerald-500 to-green-600' },
  ];

  if (loading) {
    return (
      <div className="space-y-5 md:space-y-6 pb-8" dir="rtl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6 pb-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="h-8 w-8 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md md:shadow-lg">
            <Shield className="h-4 w-4 md:h-6 md:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm md:text-xl font-bold text-gray-900 dark:text-white">لوحة المطور</h1>
            <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">مراقبة تقنية SAPKEY</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <button onClick={checkHealth} disabled={loading}
            className="h-7 md:h-8 px-2 md:px-3 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 text-[10px] md:text-xs flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50">
            <RefreshCw className={`h-2.5 w-2.5 md:h-3 md:w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-0 text-[9px] md:text-[10px] px-1.5 md:px-2">Admin</Badge>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-1.5 md:gap-3">
        {healthItems.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-white/20 dark:border-white/5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 overflow-hidden">
              <CardContent className="p-2 md:p-3 flex items-center gap-2 md:gap-3">
                <div className={`h-7 w-7 md:h-9 md:w-9 rounded-lg md:rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-sm md:shadow-md shrink-0`}>
                  <Icon className="h-3 w-3 md:h-4 md:w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] md:text-[10px] font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="text-xs md:text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-[8px] md:text-[9px] text-gray-400">{s.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {[
          { label: 'إجمالي المستأجرين', value: tenantPlans.length, icon: Users, href: '/admin/tenants', color: 'from-blue-500 to-indigo-600' },
          { label: 'الباقات النشطة', value: activeTenants, icon: CreditCard, href: '/admin/subscriptions', color: 'from-emerald-500 to-green-600' },
          { label: 'المتنهي الصلاحية', value: expiredTenants, icon: Activity, href: '/admin/tenants', color: 'from-amber-500 to-orange-600' },
          { label: 'عدد الباقات', value: plans.length, icon: Terminal, href: '/admin/subscriptions', color: 'from-purple-500 to-violet-600' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <a key={s.label} href={s.href}
              className="group bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-lg md:rounded-2xl border border-white/20 dark:border-white/10 p-3 md:p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <p className="text-[9px] md:text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                <div className={`h-6 w-6 md:h-8 md:w-8 rounded-md md:rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center shadow-sm md:shadow-md`}>
                  <Icon className="h-3 w-3 md:h-4 md:w-4 text-white" />
                </div>
              </div>
              <p className="text-base md:text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            </a>
          );
        })}
      </div>

      {/* Platform Sections Grid */}
      <div>
        <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
          <Server className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500" />
          <h2 className="text-[11px] md:text-sm font-bold text-gray-900 dark:text-white">إدارة المنصة</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 md:gap-2.5">
          {[
            { title: 'المستأجرين', href: '/admin/tenants', icon: Users, color: 'from-blue-500 to-indigo-600', desc: 'إدارة العملاء' },
            { title: 'الباقات', href: '/admin/subscriptions', icon: CreditCard, color: 'from-emerald-500 to-green-600', desc: 'خطط الاشتراك' },
            { title: 'الميزات', href: '/admin/feature-flags', icon: Activity, color: 'from-purple-500 to-violet-600', desc: 'تفعيل/تعطيل الميزات' },
            { title: 'الأمان', href: '/admin/security', icon: Shield, color: 'from-rose-500 to-red-600', desc: 'إعدادات الصلاحيات' },
            { title: 'سجل المراجعة', href: '/admin/audit-logs', icon: ScrollText, color: 'from-amber-500 to-orange-600', desc: 'أحداث المنصة' },
            { title: 'تحليلات', href: '/admin/platform-analytics', icon: BarChart3, color: 'from-cyan-500 to-teal-600', desc: 'تحليلات الاستخدام' },
            { title: 'API', href: '/admin/api-monitoring', icon: Terminal, color: 'from-slate-500 to-gray-600', desc: 'مراقبة API' },
            { title: 'النشر', href: '/admin/deployment', icon: Rocket, color: 'from-pink-500 to-rose-600', desc: 'إدارة التحديثات' },
            { title: 'البراندينج', href: '/admin/branding', icon: Palette, color: 'from-violet-500 to-purple-600', desc: 'الهوية البصرية' },
            { title: 'النسخ الاحتياطي', href: '/admin/backup', icon: Database, color: 'from-slate-600 to-gray-700', desc: 'تصدير البيانات' },
            { title: 'دليل المطور', href: '/guides/developer', icon: BookOpen, color: 'from-red-500 to-rose-600', desc: 'الدليل التقني' },
            { title: 'مشاركة وتصدير الأدلة', href: '/admin/guide-export', icon: BookOpen, color: 'from-emerald-500 to-teal-600', desc: 'PDF و WhatsApp' },
            { title: 'إدارة الأدلة', href: '/admin/guides', icon: BookOpen, color: 'from-violet-500 to-purple-600', desc: 'تحرير الأدلة' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <a key={f.title} href={f.href}
                className="group relative overflow-hidden rounded-lg md:rounded-2xl p-2 md:p-4 text-right transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10">
                <div className={`h-7 w-7 md:h-10 md:w-10 rounded-md md:rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-sm md:shadow-md mb-1.5 md:mb-2`}>
                  <Icon className="h-3 w-3 md:h-4 md:w-4 text-white" />
                </div>
                <p className="text-[10px] md:text-xs font-bold text-gray-900 dark:text-white">{f.title}</p>
                <p className="text-[8px] md:text-[10px] text-gray-400 line-clamp-1">{f.desc}</p>
              </a>
            );
          })}
        </div>
      </div>

      {/* Recent Platform Events */}
      {recentEvents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
            <Activity className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500" />
            <h2 className="text-[11px] md:text-sm font-bold text-gray-900 dark:text-white">أحداث المنصة</h2>
          </div>
          <div className="grid grid-cols-1 gap-1.5 md:gap-2">
            {recentEvents.map((ev) => (
              <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-lg md:rounded-xl border border-gray-100 dark:border-slate-800 p-2 md:p-3 flex items-center gap-2 md:gap-3">
                {ev.status === 'error' ? <XCircle className="h-3 w-3 md:h-4 md:w-4 text-red-500 shrink-0" /> :
                 ev.status === 'success' ? <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-emerald-500 shrink-0" /> :
                 <Activity className="h-3 w-3 md:h-4 md:w-4 text-amber-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-xs font-bold text-gray-900 dark:text-white truncate">{ev.event_name}</p>
                  <p className="text-[8px] md:text-[10px] text-gray-400 truncate">{ev.message || ev.event_category}</p>
                </div>
                <span className="text-[8px] md:text-[10px] text-gray-400 shrink-0">{new Date(ev.created_at).toLocaleTimeString('ar-EG')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone: Factory Reset & Seed Data */}
      <div className="mt-12 bg-red-500/5 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-red-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        <div className="relative z-10 flex flex-col items-start gap-6">
          <div>
            <h2 className="text-lg font-black text-red-500 flex items-center gap-2">
              <HardDrive className="h-5 w-5" /> منطقة الخطر (المطور فقط)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
              ضبط المصنع: سيقوم بمسح كافة حركات البيع، الفواتير، المخازن، والطلبات. 
              استعادة البيانات: سيقوم بتوليد بيانات وهمية مكتملة (طلبات، فواتير، خزينة) للتجربة والمحاكاة.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={async () => {
                if (confirm('هل أنت متأكد من مسح كافة الحركات والبيانات التشغيلية؟')) {
                  if (confirm('تأكيد أخير: هل تريد الاستمرار في ضبط المصنع؟')) {
                    try {
                      const { error } = await supabase.rpc('factory_reset');
                      if (error) throw error;
                      alert('تم إعادة ضبط المصنع بنجاح!');
                      window.location.reload();
                    } catch (err) {
                      console.error(err);
                      alert('حدث خطأ أثناء محاولة ضبط المصنع. تأكد من رفع ملف SQL أولاً.');
                    }
                  }
                }
              }}
              className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-500 font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> ضبط المصنع (مسح الحركات)
            </button>

            <button 
              onClick={async (e) => {
                if (confirm('هل أنت متأكد من توليد بيانات تجريبية جديدة (طلبات، فواتير، حركات خزينة)؟')) {
                  const btn = e.currentTarget;
                  const originalText = btn.innerHTML;
                  btn.innerHTML = '<span class="animate-pulse">جاري التوليد...</span>';
                  btn.disabled = true;
                  try {
                    const res = await fetch('/api/system/seed-demo', { method: 'POST' });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'فشل التوليد');
                    alert('تم توليد البيانات التجريبية بنجاح!');
                    window.location.reload();
                  } catch (err: any) {
                    alert(err.message || 'حدث خطأ غير معروف');
                  } finally {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                  }
                }
              }}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Database className="h-4 w-4" /> استعادة البيانات التجريبية
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
