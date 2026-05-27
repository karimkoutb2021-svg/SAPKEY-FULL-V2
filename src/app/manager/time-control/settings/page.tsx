'use client';

import { useEffect, useState } from 'react';
import { timeControlSettingsService, STAGE_LABELS, DEFAULT_TIME_SETTINGS, type TimeControlSettings } from '@/lib/time-engine/time-control-engine';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function TimeSettingsPage() {
  const [settings, setSettings] = useState<TimeControlSettings>(DEFAULT_TIME_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    timeControlSettingsService.get().then(data => {
      setSettings(data);
      setLoading(false);
    });

    const channel = supabase.channel('time-settings-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_control_settings' }, () => {
        timeControlSettingsService.get().then(setSettings);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const calcTotal = (s: TimeControlSettings) =>
    (s.pending_minutes || 0) + (s.preparing_minutes || 0) + (s.ready_minutes || 0) + (s.delivery_minutes || 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await timeControlSettingsService.upsert(settings);
      toast.success('تم حفظ إعدادات الوقت');
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleSliderChange = (field: keyof TimeControlSettings, value: number) => {
    const updated = { ...settings, [field]: value };
    const total = (updated.pending_minutes || 0) + (updated.preparing_minutes || 0) + (updated.ready_minutes || 0) + (updated.delivery_minutes || 0);
    updated.total_delivery_minutes = total;
    setSettings(updated);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
      <div className="animate-pulse text-white/40">جاري التحميل...</div>
    </div>
  );

  const total = calcTotal(settings);

  return (
    <div className="min-h-screen bg-[#0A0A0C] p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">محرك الوقت الديناميكي</h1>
          <p className="text-sm text-white/50 mt-1">ضبط توزيع الوقت التلقائي لحركة الطلبات</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/manager/time-control" className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] transition-colors">
            لوحة الحضور
          </Link>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {/* Total Time Card */}
      <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 rounded-2xl p-6 text-center">
        <p className="text-sm text-emerald-300/70 mb-1">الوقت الكلي للتوصيل</p>
        <p className="text-5xl font-bold text-emerald-400">{total} <span className="text-lg text-emerald-400/60">دقيقة</span></p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-xs text-white/40">التقسيم التلقائي أدناه</span>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center gap-0.5 h-16 rounded-xl overflow-hidden">
          {[
            { key: 'pending_minutes', stage: 'pending', color: 'bg-yellow-500' },
            { key: 'preparing_minutes', stage: 'preparing', color: 'bg-blue-500' },
            { key: 'ready_minutes', stage: 'ready', color: 'bg-emerald-500' },
            { key: 'delivery_minutes', stage: 'delivery', color: 'bg-violet-500' },
          ].map(({ key, stage, color }) => {
            const minutes = (settings as any)[key] || 0;
            const pct = total > 0 ? (minutes / total) * 100 : 0;
            const info = STAGE_LABELS[stage];
            return (
              <div key={key} className={`${color} h-full flex items-center justify-center text-xs font-bold text-white relative transition-all duration-300`}
                style={{ width: `${Math.max(pct, 3)}%`, minWidth: pct > 0 ? '40px' : '0' }}>
                <div className="text-center leading-tight">
                  <div>{minutes}m</div>
                  <div className="text-[9px] opacity-80">{info?.ar}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Settings */}
      <div className="space-y-3">
        {[
          { field: 'pending_minutes', stage: 'pending', min: 1, max: 30, desc: 'الوقت المسموح لتأكيد الطلب' },
          { field: 'preparing_minutes', stage: 'preparing', min: 5, max: 120, desc: 'الوقت المسموح لتجهيز الطلب' },
          { field: 'ready_minutes', stage: 'ready', min: 1, max: 30, desc: 'الوقت المسموح لاستلام المندوب للطلب' },
          { field: 'delivery_minutes', stage: 'delivery', min: 5, max: 120, desc: 'الوقت المسموح لتوصيل الطلب للعميل' },
        ].map(({ field, stage, min, max, desc }) => {
          const info = STAGE_LABELS[stage];
          const value = (settings as any)[field] || 0;
          return (
            <div key={field} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{info?.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{info?.ar}</p>
                    <p className="text-[10px] text-white/40">{desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={value} min={min} max={max}
                    onChange={e => handleSliderChange(field as keyof TimeControlSettings, parseInt(e.target.value) || min)}
                    className="w-16 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 text-center" />
                  <span className="text-xs text-white/40">دقيقة</span>
                </div>
              </div>
              <input type="range" value={value} min={min} max={max}
                onChange={e => handleSliderChange(field as keyof TimeControlSettings, parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-white/[0.08] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:cursor-pointer" />
              <div className="flex justify-between text-[10px] text-white/30 mt-1">
                <span>{min} دقيقة</span>
                <span>{max} دقيقة</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Automation Toggle */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">الترقية التلقائية للطلبات</p>
            <p className="text-xs text-white/50 mt-0.5">عند تجاوز الوقت المحدد لأي مرحلة، يتم ترقية الطلب تلقائياً للمرحلة التالية مع إشعار للمدير</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={settings.auto_escalate}
              onChange={e => setSettings({ ...settings, auto_escalate: e.target.checked })}
              className="sr-only peer" />
            <div className="w-11 h-6 bg-white/[0.08] rounded-full peer peer-checked:bg-emerald-500/50 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>
      </div>

      {/* Alert Threshold */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">حد التنبيه قبل انتهاء الوقت</p>
            <p className="text-xs text-white/50 mt-0.5">عدد الثواني قبل انتهاء المهلة لبدء الوميض الأحمر</p>
          </div>
          <input type="number" value={settings.alert_blink_threshold_seconds}
            onChange={e => setSettings({ ...settings, alert_blink_threshold_seconds: parseInt(e.target.value) || 30 })}
            className="w-20 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 text-center" />
        </div>
      </div>
    </div>
  );
}
