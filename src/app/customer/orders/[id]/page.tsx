'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { trackingService, type TrackingSession } from '@/lib/customer-services/live-tracking';
import Link from 'next/link';

const supabase = createClient();

const STAGE_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  confirmed: { icon: '✅', label: 'تم تأكيد طلبك', color: 'bg-emerald-500' },
  preparing: { icon: '⚙️', label: 'قيد التحضير في المتجر', color: 'bg-blue-500' },
  ready: { icon: '📦', label: 'جاهز وبانتظار المندوب', color: 'bg-amber-500' },
  out_for_delivery: { icon: '🚴', label: 'المندوب في طريقه إليك', color: 'bg-violet-500' },
  delivered: { icon: '🎉', label: 'تم التوصيل', color: 'bg-emerald-500' },
};

const STAGES = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

export default function TrackingPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<TrackingSession | null>(null);
  const [progress, setProgress] = useState({ progressPct: 0, elapsedMinutes: 0, remainingMinutes: 0, driverLat: 0, driverLng: 0, currentStage: 'confirmed' });
  const [showCall, setShowCall] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initTracking();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [params.id]);

  async function initTracking() {
    const { data: o } = await supabase.from('orders').select('*').eq('id', params.id).single();
    setOrder(o);

    const s = await trackingService.getOrCreateSession(params.id, 60);
    setSession(s);
    await updateProgress(s);
  }

  async function updateProgress(s: TrackingSession) {
    const p = await trackingService.calculateProgress(s);
    setProgress(p);

    if (p.progressPct >= 100) {
      await trackingService.completeSession(s.id);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }

  useEffect(() => {
    if (!session) return;
    intervalRef.current = setInterval(() => {
      if (session) updateProgress(session);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [session]);

  useEffect(() => {
    const ch = supabase.channel('sync-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        initTracking();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const activeStageIdx = STAGES.indexOf(progress.currentStage);
  const circleColor = progress.progressPct < 50 ? '#10B981' : progress.progressPct < 80 ? '#F59E0B' : '#EF4444';
  const circleRadius = 70;
  const circumference = 2 * Math.PI * circleRadius;
  const offset = circumference - (progress.progressPct / 100) * circumference;
  const isDelivery = progress.currentStage === 'out_for_delivery' || progress.currentStage === 'delivered';

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white p-4 max-w-lg mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <Link href="/customer/orders" className="text-xs text-white/50 hover:text-white">← رجوع</Link>
        <h1 className="text-sm font-semibold">تتبع الطلب</h1>
        <div className="w-10" />
      </div>

      {/* Order Number */}
      <p className="text-center text-xs text-white/40 mb-6">
        طلب رقم #{order?.order_number || params.id.slice(0, 8)}
      </p>

      {/* Countdown Circle */}
      <div className="flex justify-center mb-8">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={circleRadius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle cx="80" cy="80" r={circleRadius} fill="none" stroke={circleColor} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-all duration-1000 ease-linear"
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold tabular-nums" style={{ color: circleColor }}>
              {String(Math.floor(progress.remainingMinutes / 60)).padStart(2, '0')}:{String(progress.remainingMinutes % 60).padStart(2, '0')}
            </span>
            <span className="text-xs text-white/40 mt-1">متبقي</span>
          </div>
        </div>
      </div>

      {/* Progress Pipeline */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-4">
        <div className="space-y-3">
          {STAGES.map((stage, idx) => {
            const info = STAGE_ICONS[stage];
            const isActive = idx <= activeStageIdx;
            const isCurrent = idx === activeStageIdx;
            return (
              <div key={stage} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                  isActive ? 'shadow-lg' : 'opacity-30'
                } ${isCurrent ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: isActive ? `${STAGE_ICONS[stage].color}30` : 'transparent', border: `1px solid ${isActive ? STAGE_ICONS[stage].color : 'rgba(255,255,255,0.06)'}` }}>
                  {info.icon}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${isActive ? 'text-white font-medium' : 'text-white/30'}`}>{info.label}</p>
                  {isCurrent && !session?.is_completed && (
                    <p className="text-[10px] text-emerald-400 mt-0.5">جارٍ الآن...</p>
                  )}
                </div>
                {isCurrent && !session?.is_completed && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
                {session?.is_completed && stage === 'delivered' && (
                  <span className="text-emerald-400 text-sm">✅</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulated Map */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden mb-4">
        <div className="h-48 relative bg-gradient-to-b from-emerald-900/20 to-blue-900/20">
          {/* Route line */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 192">
            <line x1="30" y1="160" x2="270" y2="32" stroke="rgba(16,185,129,0.3)" strokeWidth="2" strokeDasharray="6,4" />
            {/* Driver marker */}
            <circle cx={30 + (240 * progress.progressPct / 100)} cy={160 - (128 * progress.progressPct / 100)}
              r="10" fill="#10B981" className="animate-pulse" />
            {/* Store marker */}
            <rect x="20" y="150" width="20" height="20" rx="4" fill="#3B82F6" />
            <text x="30" y="163" textAnchor="middle" fill="white" fontSize="10">🏪</text>
            {/* Customer marker */}
            <rect x="260" y="22" width="20" height="20" rx="4" fill="#F59E0B" />
            <text x="270" y="35" textAnchor="middle" fill="white" fontSize="10">📍</text>
          </svg>
          {/* Labels */}
          <div className="absolute bottom-2 left-2 text-[8px] text-white/40">المتجر</div>
          <div className="absolute top-2 right-2 text-[8px] text-white/40">موقعك</div>
          {isDelivery && session?.driver_name && (
            <div className="absolute top-2 left-2 bg-black/50 rounded-lg px-2 py-1 text-[10px] text-emerald-400">
              🚴 {session.driver_name}
            </div>
          )}
        </div>
      </div>

      {/* Driver Info & Actions */}
      {session?.driver_name && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-sm font-bold">
                {session.driver_name[0]}
              </div>
              <div>
                <p className="text-sm font-medium">{session.driver_name}</p>
                <p className="text-[10px] text-white/40">مندوب التوصيل</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${session.driver_phone}`}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 transition-colors">
                📞 اتصال
              </a>
              <button onClick={() => setShowCall(!showCall)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/60 text-xs hover:bg-white/[0.1] transition-colors">
                💬 محادثة
              </button>
            </div>
          </div>
          {showCall && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <p className="text-xs text-white/50">رقم المندوب: {session.driver_phone}</p>
              <p className="text-xs text-white/30 mt-1">رقم الدعم: 01000000000</p>
            </div>
          )}
        </div>
      )}

      {/* Order Summary */}
      {order && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
          <p className="text-sm font-medium mb-2">تفاصيل الطلب</p>
          <div className="space-y-1.5">
            {(order.items || []).slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-white/70">{item.nameAr || item.name || item.product_name}</span>
                <span className="text-white/50">x{item.quantity || 1}</span>
              </div>
            ))}
            {(order.items || []).length > 5 && (
              <p className="text-[10px] text-white/30">+{order.items.length - 5} منتجات أخرى</p>
            )}
            <div className="pt-2 mt-2 border-t border-white/[0.06] flex justify-between">
              <span className="text-sm font-medium">الإجمالي</span>
              <span className="text-sm font-bold text-emerald-400">{order.total?.toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
