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
        supabase.from('time_control').select('id, user_id, user_name, date, clock_in, clock_out, break_start, break_end, total_hours, status, notes, created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('employees').select('id, full_name_ar, is_active').eq('is_active', true),
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
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-6 rounded-[2rem] shadow-2xl">
        <div>
          <h1 className="text-2xl font-black text-white">التحكم في الوقت</h1>
          <p className="text-sm text-gray-400 mt-1 font-medium">الحضور والانصراف وتوزيع الوقت التلقائي</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/manager/time-control/settings" className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 hover:text-white hover:bg-white/[0.08] transition-all font-bold">
            إعدادات الوقت
          </Link>
          <button onClick={handleClockIn} className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm hover:bg-emerald-500 hover:text-white transition-all font-bold shadow-lg shadow-transparent hover:shadow-emerald-500/25">
            تسجيل حضور سريع
          </button>
          <button onClick={() => setShowModal(true)} className="px-5 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm hover:bg-amber-500 hover:text-white transition-all font-bold shadow-lg shadow-transparent hover:shadow-amber-500/25">
            إضافة يدوي
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'يعمل الآن', value: activeNow.length, color: 'text-emerald-400', bg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-emerald-500/30 shadow-emerald-500/10', icon: '👨‍🍳' },
          { label: 'حضور اليوم', value: presentToday.length, color: 'text-blue-400', bg: 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border-blue-500/30 shadow-blue-500/10', icon: '📝' },
          { label: 'متأخر اليوم', value: lateToday.length, color: 'text-amber-400', bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30 shadow-amber-500/10', icon: '⏰' },
          { label: 'إجازات معتمدة', value: leaves.filter(l => l.status === 'approved').length, color: 'text-violet-400', bg: 'bg-gradient-to-br from-violet-500/20 to-purple-500/10 border-violet-500/30 shadow-violet-500/10', icon: '🏖️' },
        ].map((card, i) => (
          <div key={i} className={`border rounded-[2rem] p-6 shadow-2xl backdrop-blur-3xl transition-transform hover:-translate-y-1 duration-300 ${card.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">{card.icon}</span>
              <p className={`text-4xl font-black ${card.color}`}>{card.value}</p>
            </div>
            <p className="text-sm font-bold text-gray-300">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Settings Summary */}
        <div className="lg:col-span-1 rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-6 shadow-2xl">
          {settings ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-base font-bold text-white">توزيع الوقت التلقائي</p>
                <Link href="/manager/time-control/settings" className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white transition-all font-medium">تعديل التوزيع</Link>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-1 h-10 rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.04]">
                  {[
                    { key: 'pending_minutes', color: 'bg-amber-500', stage: 'pending' },
                    { key: 'preparing_minutes', color: 'bg-blue-500', stage: 'preparing' },
                    { key: 'ready_minutes', color: 'bg-emerald-500', stage: 'ready' },
                    { key: 'delivery_minutes', color: 'bg-violet-500', stage: 'delivery' },
                  ].map(({ key, color, stage }) => {
                    const minutes = (settings as any)[key] || 0;
                    const total = settings.total_delivery_minutes || 60;
                    const pct = total > 0 ? (minutes / total) * 100 : 0;
                    const info = STAGE_LABELS[stage];
                    return (
                      <div key={key} className={`${color} h-full flex items-center justify-center text-[10px] font-black text-white shadow-inner transition-all hover:opacity-90`}
                        style={{ width: `${Math.max(pct, 5)}%` }} title={`${info?.ar}: ${minutes} دقيقة`}>
                        {minutes}m
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                   {[
                    { key: 'pending_minutes', color: 'bg-amber-500', stage: 'pending' },
                    { key: 'preparing_minutes', color: 'bg-blue-500', stage: 'preparing' },
                    { key: 'ready_minutes', color: 'bg-emerald-500', stage: 'ready' },
                    { key: 'delivery_minutes', color: 'bg-violet-500', stage: 'delivery' },
                  ].map(({ key, color, stage }) => {
                    const minutes = (settings as any)[key] || 0;
                    const info = STAGE_LABELS[stage];
                    return (
                      <div key={stage} className="flex items-center gap-2 text-xs">
                        <span className={`w-3 h-3 rounded-full ${color}`}></span>
                        <span className="text-gray-400">{info?.ar}: <span className="text-white font-bold">{minutes}د</span></span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm font-medium">جاري التحميل...</div>
          )}
        </div>

        {/* SLA Performance Report */}
        <div className="lg:col-span-2 rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-6 shadow-2xl">
          {slaReport ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-base font-bold text-white">تقرير كفاءة اليوم (SLA)</p>
                <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">مباشر</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(slaReport.stageBreakdown).map(([stage, stats]: [string, any]) => {
                  const info = STAGE_LABELS[stage];
                  const avgMin = Math.round(stats.avgActual / 60);
                  const successRate = stats.total > 0 ? Math.round((stats.met / stats.total) * 100) : 100;
                  const isPoor = successRate < 80;
                  
                  return (
                    <div key={stage} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 text-center relative overflow-hidden group hover:bg-white/[0.04] transition-colors">
                      <div className={`absolute inset-0 bg-gradient-to-b ${isPoor ? 'from-red-500/5 to-transparent' : 'from-emerald-500/5 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                      <div className="relative">
                        <span className="text-3xl mb-2 block">{info?.icon}</span>
                        <p className="text-sm font-bold text-gray-300">{info?.ar}</p>
                        
                        <div className="my-3 flex items-center justify-center gap-1">
                          <p className={`text-2xl font-black ${isPoor ? 'text-red-400' : 'text-emerald-400'}`}>
                            {successRate}%
                          </p>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs px-2 py-1.5 bg-[#111114] rounded-lg border border-white/[0.04]">
                          <span className="text-gray-500">متوسط الوقت</span>
                          <span className="font-bold text-gray-300">{avgMin} د</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm font-medium">لا توجد بيانات SLA لليوم</div>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">سجل الحضور والانصراف</h2>
          <span className="text-xs font-bold text-gray-500 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.04]">آخر 100 حركة</span>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-emerald-500/50">
            <span className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400 font-medium">جاري تحميل السجل...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <p className="text-lg font-medium">لا توجد حركات مسجلة</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-8 px-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-right py-4 px-4 text-gray-400 font-bold whitespace-nowrap">الموظف</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-bold whitespace-nowrap">التاريخ</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-bold whitespace-nowrap">الحضور</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-bold whitespace-nowrap">الانصراف</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-bold whitespace-nowrap">ساعات العمل</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-bold whitespace-nowrap">الحالة</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-bold whitespace-nowrap">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4 font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs text-white/50 border border-white/[0.1]">
                          {entry.user_name.substring(0, 2)}
                        </div>
                        {entry.user_name}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-400 font-medium whitespace-nowrap">{new Date(entry.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    <td className="py-4 px-4 text-center font-mono whitespace-nowrap">
                      {entry.clock_in ? (
                        <span className="text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">{new Date(entry.clock_in).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-4 px-4 text-center font-mono whitespace-nowrap">
                      {entry.clock_out ? (
                        <span className="text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">{new Date(entry.clock_out).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {entry.total_hours ? (
                         <span className="font-black text-white">{entry.total_hours.toFixed(1)} <span className="text-xs font-normal text-gray-500">ساعة</span></span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className={cn('text-xs px-3 py-1.5 rounded-xl font-bold border inline-block min-w-[80px]',
                        entry.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        entry.status === 'late' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        entry.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      )}>
                        {entry.status === 'active' ? 'نشط الآن' : entry.status === 'late' ? 'حضور متأخر' : entry.status === 'completed' ? 'مكتمل' : 'غائب'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {entry.status === 'active' ? (
                        <button onClick={() => handleManualOverride(entry)} className="px-4 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-gray-300 hover:text-white hover:bg-white/[0.1] transition-all opacity-0 group-hover:opacity-100">
                          تسجيل انصراف
                        </button>
                      ) : <span className="text-gray-600">—</span>}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0A0A0C]/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] shadow-2xl shadow-amber-500/10 overflow-hidden" dir="rtl">
            <div className="px-8 py-6 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">تسجيل حضور يدوي</h3>
                  <p className="text-sm text-gray-400">إضافة حركة لموظف</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="text-sm font-bold text-gray-400 mb-2 block">الموظف</label>
                <select id="manual-employee" className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-base focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all [&>option]:bg-[#111114]">
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.full_name_ar}>{emp.full_name_ar}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-400 mb-2 block">تاريخ الحضور</label>
                  <input id="manual-date" type="date" defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-base focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-400 mb-2 block">وقت الحضور</label>
                  <input id="manual-time" type="time" defaultValue="09:00"
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-base focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all [color-scheme:dark]" />
                </div>
              </div>
            </div>
            
            <div className="p-8 pt-4 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold">إلغاء الأمر</button>
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
              }} className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-amber-600 to-amber-500 text-white font-bold hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25">تأكيد التسجيل</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
