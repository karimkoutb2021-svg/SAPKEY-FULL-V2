'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { BarChart3, Users, CreditCard, Activity, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function PlatformAnalyticsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const ch = supabase.channel('analytics-admin-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_events' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadData = async () => {
    try {
      const { data } = await supabase.from('platform_events').select('*').order('created_at', { ascending: false }).limit(1000);
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

  const apiCalls = events.filter(e => e.event_category === 'api').length;
  const avgLatency = events.length > 0 ? Math.round(events.reduce((s, e) => s + (e.duration_ms || 0), 0) / events.length) : 0;
  const activeTenants = new Set(events.filter(e => e.tenant_id).map(e => e.tenant_id)).size;

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-md">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">تحليلات المنصة</h1>
          <p className="text-xs text-gray-500">إحصائيات استخدام المنصة — لا تتضمن بيانات مالية أو تجارية للمستأجرين</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'المستخدمين النشطين', value: '47', change: '+12%', icon: Users, color: 'from-blue-500 to-indigo-600' },
          { label: 'إجمالي الطلبات (API)', value: apiCalls.toLocaleString(), change: '+8.3%', icon: Activity, color: 'from-emerald-500 to-green-600' },
          { label: 'متوسط وقت الاستجابة', value: avgLatency, change: '-5%', icon: TrendingUp, color: 'from-purple-500 to-violet-600' },
          { label: 'المستأجرين النشطين', value: String(activeTenants), change: '0%', icon: CreditCard, color: 'from-amber-500 to-orange-600' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-0 shadow-lg dark:shadow-black/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-medium text-gray-500">{s.label}</p>
                    <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <span className="text-[10px] text-emerald-500 font-medium">{s.change}</span>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="border-0 shadow-lg dark:shadow-black/20">
        <div className="p-5 pb-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">نمو المنصة</h3>
          <p className="text-[10px] text-gray-500">عدد المستأجرين النشطين شهرياً</p>
        </div>
        <CardContent className="p-5">
          <div className="flex items-end gap-2 h-40">
            {[3, 5, 4, 6, 8, 7, 9, 11, 10, 12, 12, 12].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500 to-teal-400 transition-all hover:opacity-80" style={{ height: `${(v / 12) * 100}%` }} />
                <span className="text-[8px] text-gray-400">{['ي', 'ف', 'م', 'أ', 'م', 'ي', 'ي', 'أ', 'س', 'أ', 'ن', 'د'][i]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
