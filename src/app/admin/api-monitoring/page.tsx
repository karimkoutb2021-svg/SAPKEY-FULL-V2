'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Activity, Terminal, CheckCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function ApiMonitoringPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    const ch = supabase.channel('api-monitoring-admin-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'platform_events' }, () => loadEvents())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadEvents = async () => {
    try {
      const { data } = await supabase.from('platform_events').select('*').eq('event_category', 'api').order('created_at', { ascending: false }).limit(50);
      if (data) setEvents(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const totalCalls = events.length;
  const successRate = totalCalls > 0 ? `${Math.round((events.filter(e => e.status === 'success').length / totalCalls) * 100)}%` : '0%';
  const avgLatency = totalCalls > 0 ? `${Math.round(events.reduce((s, e) => s + (e.duration_ms || 0), 0) / totalCalls)}ms` : '0ms';
  const errors = events.filter(e => e.status === 'error').length;

  if (loading) {
    return (
      <div dir="rtl" className="space-y-6 pb-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center shadow-md">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">مراقبة API</h1>
          <p className="text-xs text-gray-500">مراقبة واجهات API — الأداء والاستجابة</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الطلبات', value: totalCalls.toLocaleString(), sub: 'آخر 24 ساعة', icon: Activity, color: 'from-blue-500 to-indigo-600' },
          { label: 'معدل النجاح', value: successRate, sub: '200/2xx', icon: CheckCircle, color: 'from-emerald-500 to-green-600' },
          { label: 'متوسط السرعة', value: avgLatency, sub: 'عبر جميع endpoints', icon: Terminal, color: 'from-purple-500 to-violet-600' },
          { label: 'الأخطاء', value: String(errors), sub: '5xx/4xx آخر ساعة', icon: AlertTriangle, color: errors > 0 ? 'from-red-500 to-rose-600' : 'from-amber-500 to-orange-600' },
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
                  <p className="text-[9px] text-gray-400">{s.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="border-0 shadow-lg dark:shadow-black/20 overflow-hidden">
        <div className="p-5 pb-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">أحداث API</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                <th className="text-right px-4 py-3 text-[10px] font-medium text-gray-500">Event</th>
                <th className="text-right px-4 py-3 text-[10px] font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-medium text-gray-500">Latency</th>
                <th className="text-right px-4 py-3 text-[10px] font-medium text-gray-500">Source</th>
                <th className="text-right px-4 py-3 text-[10px] font-medium text-gray-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {events.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">لا توجد أحداث API مسجلة</td></tr>
              ) : events.slice(0, 20).map((ev) => (
                <motion.tr key={ev.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-700 dark:text-gray-300">{ev.event_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      ev.status === 'success' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' :
                      ev.status === 'error' ? 'text-red-600 bg-red-50 dark:bg-red-900/30' :
                      'text-amber-600 bg-amber-50 dark:bg-amber-900/30'
                    }`}>{ev.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{ev.duration_ms ? `${ev.duration_ms}ms` : '-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{ev.source || '-'}</td>
                  <td className="px-4 py-3 text-[10px] text-gray-400">{new Date(ev.created_at).toLocaleString('ar-EG')}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
