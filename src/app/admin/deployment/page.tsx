'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Rocket, GitBranch, RefreshCw, Globe, CheckCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function DeploymentPage() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeployments();
    const ch = supabase.channel('deployment-admin-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'platform_events', filter: 'event_category=eq.deployment' }, (payload) => {
        if ((payload.new as any)) {
          setDeployments(prev => [(payload.new as any), ...prev].slice(0, 20));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadDeployments = async () => {
    try {
      const { data } = await supabase.from('platform_events').select('id, status, event_name, source, created_at, message').eq('event_category', 'deployment').order('created_at', { ascending: false }).limit(20);
      if (data) setDeployments(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const liveDeployment = deployments.find(d => d.status === 'success');
  const latestDeploy = deployments[0];

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-md">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">النشر</h1>
            <p className="text-xs text-gray-500">إدارة نشر التحديثات وإصدارات النظام</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px] flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </Badge>
          <button className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg hover:shadow-xl transition-all">
            <Rocket className="h-3.5 w-3.5" /> نشر تحديث جديد
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'الإصدار الحالي', value: liveDeployment?.event_name || 'v2.0.0', icon: Rocket, color: 'from-emerald-500 to-green-600' },
          { label: 'الفرع', value: latestDeploy?.source || 'main', icon: GitBranch, color: 'from-blue-500 to-indigo-600' },
          { label: 'آخر تحديث', value: latestDeploy ? `منذ ${Math.floor((Date.now() - new Date(latestDeploy.created_at).getTime()) / 3600000)} ساعات` : 'منذ 6 ساعات', icon: Clock, color: 'from-amber-500 to-orange-600' },
          { label: 'حالة البنية', value: liveDeployment?.status === 'success' ? 'ناجحة' : 'معلقة', icon: CheckCircle, color: 'from-emerald-500 to-green-600' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-0 shadow-lg dark:shadow-black/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md shrink-0`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="border-0 shadow-lg dark:shadow-black/20">
        <div className="p-5 pb-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">سجل النشر</h3>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {deployments.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-gray-400">لا توجد عمليات نشر مسجلة</div>
            ) : deployments.map((d) => (
              <motion.div key={d.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    d.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                    d.status === 'error' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-slate-800'
                  }`}>
                    <Globe className={`h-4 w-4 ${
                      d.status === 'success' ? 'text-emerald-600' :
                      d.status === 'error' ? 'text-red-500' : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{d.event_name || 'deploy'}</span>
                      <Badge className={`text-[8px] border-0 ${
                        d.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                        d.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>{d.status === 'success' ? 'مباشر' : d.status === 'error' ? 'فشل' : 'معلق'}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400">{d.message || d.event_name}</span>
                      <span className="text-[10px] text-gray-400">·</span>
                      <span className="text-[10px] text-gray-400">{new Date(d.created_at).toLocaleString('ar-EG')}</span>
                    </div>
                  </div>
                </div>
                <button className="text-[10px] text-emerald-600 hover:underline font-medium">إعادة نشر</button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
