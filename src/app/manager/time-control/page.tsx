'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { timeControlSettingsService, slaPerformanceService, STAGE_LABELS, type TimeControlSettings } from '@/lib/time-engine/time-control-engine';
import Link from 'next/link';

const supabase = createClient();

interface TimeEntry {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  break_start?: string;
  break_end?: string;
  total_hours: number;
  status: 'active' | 'completed' | 'absent' | 'late';
  notes?: string;
  created_at: string;
}

interface Employee {
  id: string;
  full_name_ar: string;
  is_active: boolean;
}

interface Leave {
  id: string;
  employee_name?: string;
  from_date: string;
  to_date: string;
  status: string;
}

export default function TimeControlPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [settings, setSettings] = useState<TimeControlSettings | null>(null);
  const [slaReport, setSlaReport] = useState<{ employeeStats: Record<string, any>; stageBreakdown: Record<string, any> } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      const [entriesData, empsData, leavesData, settingsData] = await Promise.all([
        supabase.from('time_control').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('employees').select('*').eq('is_active', true),
        supabase.from('leaves').select('*').gte('to_date', today),
        timeControlSettingsService.get(),
      ]);
      setEntries((entriesData.data as TimeEntry[]) || []);
      setEmployees((empsData.data as Employee[]) || []);
      setLeaves((leavesData.data as Leave[]) || []);
      setSettings(settingsData);

      const report = await slaPerformanceService.getDailyReport(today).catch(() => null);
      if (report) setSlaReport(report);
    } catch (e) {
      console.error('Time fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase.channel('time-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_control' }, () => { fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => { fetchData(); })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchData]);

  const activeNow = entries.filter(e => e.status === 'active');
  const presentToday = entries.filter(e => {
    const today = new Date().toISOString().split('T')[0];
    return e.date === today && ['active', 'completed', 'late'].includes(e.status);
  });
  const lateToday = entries.filter(e => {
    const today = new Date().toISOString().split('T')[0];
    return e.date === today && e.status === 'late';
  });

  async function handleClockIn() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const hour = now.getHours();
    const isLate = hour >= 9;
    await supabase.from('time_control').insert({
      user_id: 'manager',
      user_name: 'Manager',
      date: today,
      clock_in: now.toISOString(),
      status: isLate ? 'late' : 'active',
    });
    fetchData();
  }

  async function handleManualOverride(entry: TimeEntry | null) {
    if (entry) {
      await supabase.from('time_control').update({
        clock_out: new Date().toISOString(),
        status: 'completed',
        total_hours: 8,
      }).eq('id', entry.id);
    }
    fetchData();
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">التحكم في الوقت</h1>
          <p className="text-sm text-white/50 mt-1">الحضور والانصراف وتوزيع الوقت التلقائي</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/manager/time-control/settings" className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] transition-colors">
            إعدادات الوقت
          </Link>
          <button onClick={handleClockIn} className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors">
            تسجيل حضور
          </button>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors">
            إضافة يدوي
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'يعمل الآن', value: activeNow.length, color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-500/20', icon: '🟢' },
          { label: 'حضور اليوم', value: presentToday.length, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-500/20', icon: '🔵' },
          { label: 'متأخر اليوم', value: lateToday.length, color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-500/20', icon: '🟡' },
          { label: 'إجازات', value: leaves.filter(l => l.status === 'approved').length, color: 'text-violet-400', bg: 'bg-violet-900/20 border-violet-500/20', icon: '🟣' },
        ].map((card, i) => (
          <div key={i} className={`${card.bg} border rounded-xl p-4`}>
            <div className="flex items-center justify-between">
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <span className="text-lg">{card.icon}</span>
            </div>
            <p className="text-xs text-white/50 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Time Settings Summary */}
      {settings && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white">توزيع الوقت التلقائي للطلبات</p>
            <Link href="/manager/time-control/settings" className="text-xs text-emerald-400 hover:text-emerald-300">تعديل</Link>
          </div>
          <div className="flex items-center gap-0.5 h-8 rounded-lg overflow-hidden">
            {[
              { key: 'pending_minutes', color: 'bg-yellow-500', stage: 'pending' },
              { key: 'preparing_minutes', color: 'bg-blue-500', stage: 'preparing' },
              { key: 'ready_minutes', color: 'bg-emerald-500', stage: 'ready' },
              { key: 'delivery_minutes', color: 'bg-violet-500', stage: 'delivery' },
            ].map(({ key, color, stage }) => {
              const minutes = (settings as any)[key] || 0;
              const total = settings.total_delivery_minutes || 60;
              const pct = total > 0 ? (minutes / total) * 100 : 0;
              const info = STAGE_LABELS[stage];
              return (
                <div key={key} className={`${color} h-full flex items-center justify-center text-[9px] font-bold text-white`}
                  style={{ width: `${Math.max(pct, 3)}%` }}>
                  {info?.ar} {minutes}m
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SLA Performance Report */}
      {slaReport && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <p className="text-sm font-medium text-white mb-3">تقرير كفاءة اليوم - SLA</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(slaReport.stageBreakdown).map(([stage, stats]: [string, any]) => {
              const info = STAGE_LABELS[stage];
              const avgMin = Math.round(stats.avgActual / 60);
              return (
                <div key={stage} className="bg-white/[0.03] rounded-xl p-3 text-center">
                  <span className="text-lg">{info?.icon}</span>
                  <p className="text-[10px] text-white/50 mt-1">{info?.ar}</p>
                  <p className={`text-lg font-bold mt-0.5 ${stats.missed > stats.met ? 'text-red-400' : 'text-emerald-400'}`}>
                    {stats.met}/{stats.total}
                  </p>
                  <p className="text-[10px] text-white/40">متوسط {avgMin} دقيقة</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-sm font-medium text-white">سجل الحضور</p>
          <span className="text-xs text-white/40">آخر 100 تسجيل</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-white/40">جاري التحميل...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-white/30">لا توجد تسجيلات حضور</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-gray-400 text-xs">
                  <th className="text-right py-3 px-3">الموظف</th>
                  <th className="text-right py-3 px-3">التاريخ</th>
                  <th className="text-center py-3 px-3">الحضور</th>
                  <th className="text-center py-3 px-3">الانصراف</th>
                  <th className="text-center py-3 px-3">الساعات</th>
                  <th className="text-center py-3 px-3">الحالة</th>
                  <th className="text-center py-3 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-medium text-white">{entry.user_name}</td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{new Date(entry.date).toLocaleDateString('ar-EG')}</td>
                    <td className="py-3 px-3 text-center text-xs">{entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td className="py-3 px-3 text-center text-xs">{entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td className="py-3 px-3 text-center font-mono text-xs">{entry.total_hours?.toFixed(1) || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full border',
                        entry.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        entry.status === 'late' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        entry.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      )}>
                        {entry.status === 'active' ? 'نشط' : entry.status === 'late' ? 'متأخر' : entry.status === 'completed' ? 'مكتمل' : 'غائب'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {entry.status === 'active' && (
                        <button onClick={() => handleManualOverride(entry)} className="px-2 py-1 rounded-lg bg-white/[0.06] text-[10px] hover:bg-white/[0.1]">
                          تسجيل انصراف
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Override Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">إضافة تسجيل حضور يدوي</h3>
            <div>
              <label className="text-xs text-white/50 mb-1 block">الموظف</label>
              <select id="manual-employee" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm">
                {employees.map(emp => (
                  <option key={emp.id} value={emp.full_name_ar}>{emp.full_name_ar}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">تاريخ الحضور</label>
                <input id="manual-date" type="date" defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">وقت الحضور</label>
                <input id="manual-time" type="time" defaultValue="09:00"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={async () => {
                const emp = (document.getElementById('manual-employee') as HTMLSelectElement)?.value;
                const date = (document.getElementById('manual-date') as HTMLInputElement)?.value;
                const time = (document.getElementById('manual-time') as HTMLInputElement)?.value;
                if (emp && date && time) {
                  await supabase.from('time_control').insert({
                    user_id: 'manual',
                    user_name: emp,
                    date,
                    clock_in: `${date}T${time}:00`,
                    status: 'completed',
                    total_hours: 8,
                    notes: 'تسجيل يدوي',
                  });
                  setShowModal(false);
                  fetchData();
                }
              }} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium">تأكيد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
