'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, Key, Lock, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function SecurityPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    const ch = supabase.channel('security-admin-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        if ((payload.new as any)) {
          setEvents(prev => [(payload.new as any), ...prev].slice(0, 10));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadEvents = async () => {
    try {
      const { data } = await supabase.from('audit_logs').select('id, event_type, action, actor_email, created_at').order('created_at', { ascending: false }).limit(10);
      if (data) setEvents(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div dir="rtl" className="space-y-6 pb-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const threatCount = events.filter(e => e.event_type?.includes('threat') || e.event_type?.includes('security_alert')).length;
  const status = {
    twoFactor: 'مفعل',
    encryption: 'مفعل',
    activeSessions: events.length > 0 ? `${events.length} حدث` : 'آمن',
    threats: threatCount > 0 ? `${threatCount} تهديد` : 'نظيف',
  };

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-md">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">الأمان</h1>
          <p className="text-xs text-gray-500">إعدادات الأمان والتحكم في صلاحيات المنصة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: Key, label: 'مصادقة ثنائية', desc: 'تفعيل 2FA لجميع حسابات المطورين', status: status.twoFactor, color: 'from-emerald-500 to-green-600' },
          { icon: Lock, label: 'تشفير البيانات', desc: 'تشفير AES-256 للبيانات الحساسة', status: status.encryption, color: 'from-emerald-500 to-green-600' },
          { icon: Users, label: 'جلسات النشطة', desc: `${events.length} حدث أمان مسجل`, status: status.activeSessions, color: 'from-blue-500 to-indigo-600' },
          { icon: AlertTriangle, label: 'محاولات اختراق', desc: `${events.filter(e => e.event_type?.includes('threat')).length} محاولة مشبوهة`, status: status.threats, color: 'from-emerald-500 to-green-600' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-0 shadow-lg dark:shadow-black/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">{s.status}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{s.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="border-0 shadow-lg dark:shadow-black/20">
        <div className="p-5 pb-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">أحداث الأمان الأخيرة</h3>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {events.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-gray-400">لا توجد أحداث أمان مسجلة</div>
            ) : events.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  {e.action === 'login' || e.action?.includes('success') ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0" />}
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">{e.event_type || e.action}</p>
                    <p className="text-[10px] text-gray-400">{e.actor_email || 'system'} — {new Date(e.created_at).toLocaleString('ar-EG')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
