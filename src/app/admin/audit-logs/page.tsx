'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ScrollText, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
    const ch = supabase.channel('audit-logs-admin-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => loadLogs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadLogs = async () => {
    try {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (data) setLogs(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const filtered = logs.filter(l =>
    !search || l.event_type?.includes(search) || l.actor_email?.includes(search) || l.action?.includes(search)
  );

  const typeColor = (type: string) => {
    if (type?.includes('security') || type?.includes('threat')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (type?.includes('deploy') || type?.includes('update')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (type?.includes('tenant') || type?.includes('user')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
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

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
          <ScrollText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">سجل المراجعة</h1>
          <p className="text-xs text-gray-500">سجل أحداث المنصة — جميع التغييرات والإجراءات</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="بحث في السجل..." className="w-full h-10 pr-9 pl-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
      </div>

      <Card className="border-0 shadow-lg dark:shadow-black/20">
        <div className="p-0">
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-gray-400">لا توجد أحداث مسجلة</div>
            ) : filtered.map((log) => (
              <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    log.event_type?.includes('security') ? 'bg-red-500' : log.event_type?.includes('deploy') ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{log.event_type || log.action}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400">{log.actor_email || 'system'}</span>
                      <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                    </div>
                  </div>
                </div>
                <Badge className={`text-[9px] border-0 ${typeColor(log.event_type)}`}>{log.event_type || log.action}</Badge>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
