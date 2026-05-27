'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, MessageCircle, Clock, CheckCircle, Package, Truck, MapPin,
  Headphones, ChevronRight, Loader2, Navigation
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useBrandingStore } from '@/lib/store/branding-store';
import { createClient } from '@/lib/supabase/client';
import { trackingService } from '@/lib/customer-services/live-tracking';
import toast from 'react-hot-toast';

const supabase = createClient();

interface OrderStatus {
  id: string;
  label: string;
  icon: any;
  completed: boolean;
  active: boolean;
}

export default function TrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';

  const orderId = params.orderId as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [currentStatus, setCurrentStatus] = useState(0);
  const [driverProgress, setDriverProgress] = useState(0);
  const [driverLat, setDriverLat] = useState(0);
  const [driverLng, setDriverLng] = useState(0);
  const [storeLat, setStoreLat] = useState(30.0444);
  const [storeLng, setStoreLng] = useState(31.2357);
  const [custLat, setCustLat] = useState(30.0544);
  const [custLng, setCustLng] = useState(31.2457);
  const [showContactModal, setShowContactModal] = useState(false);
  const [trackingSession, setTrackingSession] = useState<any>(null);

  useEffect(() => {
    if (!orderId) return;
    loadOrderData();
  }, [orderId]);

  async function loadOrderData() {
    try {
      const { data: orderData, error } = await supabase
        .from('orders')
        .select('*, customers(name, phone, address, lat, lng), drivers(name, phone)')
        .eq('id', orderId)
        .single();

      if (error || !orderData) {
        // Fallback: try order_number search
        const { data } = await supabase
          .from('orders')
          .select('*, customers(name, phone, address, lat, lng), drivers(name, phone)')
          .eq('order_number', orderId)
          .single();
        if (!data) { toast.error('الطلب غير موجود'); router.push('/tracking'); return; }
        setOrder(data);
      } else {
        setOrder(orderData);
      }

      // Create or get tracking session
      const session = await trackingService.getOrCreateSession(orderId, 60);
      setTrackingSession(session);

      // Set locations
      const sLat = session.store_lat || 30.0444;
      const sLng = session.store_lng || 31.2357;
      const cLat = session.customer_lat || sLat + 0.01;
      const cLng = session.customer_lng || sLng + 0.01;
      setStoreLat(sLat);
      setStoreLng(sLng);
      setCustLat(cLat);
      setCustLng(cLng);

      // Map order status to pipeline index
      const statusMap: Record<string, number> = {
        confirmed: 0, pending: 0, preparing: 1, ready: 2,
        packed: 2, out_for_delivery: 3, delivering: 3,
        delivered: 4
      };
      const statusIdx = statusMap[orderData?.status || 'confirmed'] || 0;
      setCurrentStatus(statusIdx >= 4 ? 4 : statusIdx);

      // Calculate time
      const totalMins = session.total_delivery_minutes || 60;
      const elapsed = session.elapsed_minutes || 0;
      const remainingSecs = Math.max(0, (totalMins - elapsed) * 60);
      setTotalTime(totalMins * 60);
      setTimeLeft(remainingSecs);

      // Calculate initial driver progress
      const progress = await trackingService.calculateProgress(session);
      setDriverProgress(progress.progressPct);
      setDriverLat(progress.driverLat);
      setDriverLng(progress.driverLng);
    } catch (err) {
      toast.error('حدث خطأ في تحميل بيانات الطلب');
    } finally {
      setLoading(false);
    }
  }

  // Real-time subscription for order and tracking
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase.channel(`tracking-${orderId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `id=eq.${orderId}`
      }, async (payload) => {
        if (payload.new) {
          const updated = payload.new as any;
          const statusMap: Record<string, number> = {
            confirmed: 0, pending: 0, preparing: 1, ready: 2,
            packed: 2, out_for_delivery: 3, delivering: 3,
            delivered: 4
          };
          setOrder(updated);
          setCurrentStatus(updated.status ? (statusMap[updated.status] ?? 0) : 0);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_sessions' }, () => {
        loadOrderData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft > 0]);

  // Driver progress simulation (recalculate every 10s from service)
  useEffect(() => {
    if (!trackingSession) return;
    const interval = setInterval(async () => {
      const progress = await trackingService.calculateProgress(trackingSession);
      setDriverProgress(progress.progressPct);
      setDriverLat(progress.driverLat);
      setDriverLng(progress.driverLng);
    }, 10000);
    return () => clearInterval(interval);
  }, [trackingSession]);

  const statuses: OrderStatus[] = [
    { id: 'confirmed', label: 'تم تأكيد طلبك', icon: CheckCircle, completed: currentStatus >= 0, active: currentStatus === 0 },
    { id: 'preparing', label: 'قيد التحضير', icon: Package, completed: currentStatus >= 1, active: currentStatus === 1 },
    { id: 'packed', label: 'جاهز للمندوب', icon: Package, completed: currentStatus >= 2, active: currentStatus === 2 },
    { id: 'delivering', label: 'المندوب في الطريق', icon: Truck, completed: currentStatus >= 3, active: currentStatus === 3 },
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const getCircleColor = () => {
    if (progressPercent < 50) return '#22C55E';
    if (progressPercent < 80) return '#F59E0B';
    return '#EF4444';
  };

  // Calculate normalized position for map (0-100%)
  const driverX = storeLng !== custLng
    ? ((driverLng - storeLng) / (custLng - storeLng)) * 100
    : 50;
  const driverY = storeLat !== custLat
    ? ((driverLat - storeLat) / (custLat - storeLat)) * 100
    : 50;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">لم يتم العثور على الطلب</p>
          <button onClick={() => router.push('/tracking')}
            className="mt-4 h-10 px-6 rounded-xl text-white text-sm font-bold"
            style={{ backgroundColor: primaryColor }}>
            العودة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-3 h-12 flex items-center justify-between">
          <button onClick={() => router.back()} className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          <span className="text-xs font-bold text-gray-900 dark:text-white">تتبع الطلب</span>
          <button onClick={() => setShowContactModal(true)} className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
            <Headphones className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Order Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {order.order_number || `#${order.id?.slice(0, 8).toUpperCase()}`}
            </h2>
            <span className="text-xs text-gray-400">
              {new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{order.items || 0} منتجات</span>
            <span>{formatCurrency(order.total || 0)}</span>
          </div>
        </motion.div>

        {/* Countdown Circle */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 flex flex-col items-center">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-100 dark:text-slate-800" />
              <motion.circle
                cx="50" cy="50" r="45" fill="none" stroke={getCircleColor()} strokeWidth="6"
                strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 45}`}
                animate={{ strokeDashoffset: `${2 * Math.PI * 45 * (1 - progressPercent / 100)}` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ filter: `drop-shadow(0 0 8px ${getCircleColor()}40)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div key={timeLeft} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>
                <Clock className="h-6 w-6 mb-1 mx-auto" style={{ color: getCircleColor() }} />
                <span className="text-2xl font-black" style={{ color: getCircleColor() }}>{formatTime(timeLeft)}</span>
                <span className="text-[10px] text-gray-400">متبقي للتوصيل</span>
              </motion.div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            التوصيل المتوقع: {new Date(Date.now() + timeLeft * 1000).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </motion.div>

        {/* Progress Pipeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">حالة الطلب</h3>
          <div className="relative">
            {statuses.map((status, index) => (
              <div key={status.id} className="flex items-start gap-3 relative pb-6 last:pb-0">
                {/* Connector line */}
                {index < statuses.length - 1 && (
                  <div className={`absolute right-[14px] top-8 w-0.5 h-6 ${
                    status.completed ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-700'
                  }`} />
                )}
                {/* Status dot */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    status.completed
                      ? 'text-white'
                      : status.active
                        ? 'animate-pulse ring-2 ring-offset-2'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600'
                  }`}
                  style={{
                    backgroundColor: status.completed ? primaryColor : status.active ? `${primaryColor}15` : undefined,
                    color: status.completed ? '#fff' : status.active ? primaryColor : undefined,
                    borderColor: status.active ? primaryColor : undefined,
                  }}
                >
                  <status.icon className="h-3.5 w-3.5" />
                </motion.div>
                <div className="flex-1 pt-1">
                  <p className={`text-xs font-bold ${
                    status.completed || status.active ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                  }`}>
                    {status.label}
                  </p>
                  {/* Active indicator */}
                  {status.active && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] mt-0.5"
                      style={{ color: primaryColor }}
                    >
                      جاري الآن
                    </motion.p>
                  )}
                </div>
                {status.completed && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Live Map */}
        {currentStatus >= 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">موقع المندوب</h3>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                {driverProgress.toFixed(0)}% من الطريق
              </span>
            </div>

            <div className="relative h-52 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 overflow-hidden">
              {/* Grid lines for map feel */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
              </div>

              {/* Route bezier curve */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                <path
                  d="M 40 160 Q 120 30 200 100 T 360 40"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4"
                  className="text-gray-300 dark:text-slate-600"
                />
                <motion.path
                  d="M 40 160 Q 120 30 200 100 T 360 40"
                  fill="none" stroke={primaryColor} strokeWidth="2.5"
                  strokeDasharray="600"
                  animate={{ strokeDashoffset: 600 - (600 * driverProgress / 100) }}
                  transition={{ duration: 10, ease: 'linear' }}
                  style={{ filter: `drop-shadow(0 0 4px ${primaryColor}60)` }}
                />
              </svg>

              {/* Store marker */}
              <div className="absolute bottom-8 left-6">
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-emerald-200"
                >
                  <MapPin className="h-4 w-4 text-emerald-500" />
                </motion.div>
                <span className="text-[9px] font-bold text-gray-600 mt-1 block text-center">المتجر</span>
              </div>

              {/* Customer marker */}
              <div className="absolute top-8 right-6">
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                  className="h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-blue-200"
                >
                  <MapPin className="h-4 w-4 text-blue-500" />
                </motion.div>
                <span className="text-[9px] font-bold text-gray-600 mt-1 block text-center">موقعك</span>
              </div>

              {/* Animated Driver Motorcycle */}
              <motion.div
                className="absolute z-20"
                animate={{
                  left: `${10 + driverX * 0.75}%`,
                  bottom: `${10 + driverY * 0.3}%`,
                }}
                transition={{ duration: 10, ease: 'linear' }}
              >
                <motion.div
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="h-12 w-12 rounded-full bg-white shadow-xl flex items-center justify-center border-2"
                  style={{ borderColor: primaryColor }}
                >
                  <motion.div
                    animate={{ rotate: [0, 15, 0] }}
                    transition={{ repeat: Infinity, duration: 0.3 }}
                  >
                    <Truck className="h-6 w-6" style={{ color: primaryColor }} />
                  </motion.div>
                </motion.div>
                {/* Pulsing ring */}
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -inset-2 rounded-full"
                  style={{ backgroundColor: `${primaryColor}20` }}
                />
              </motion.div>
            </div>

            {/* Driver info */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  {(order.drivers?.name || order.driver_name || 'مندوب')[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {order.drivers?.name || order.driver_name || 'المندوب'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {currentStatus >= 4 ? 'تم التوصيل' : 'في الطريق إليك'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`tel:${order.drivers?.phone || order.driver_phone}`}
                  className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-emerald-500" />
                </a>
                <button className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Delivery Address */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">عنوان التوصيل</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {order.customers?.address || order.customer_address || 'لم يحدد'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Contact Support */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => setShowContactModal(true)}
          className="w-full h-11 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-sm font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
          <Headphones className="h-4 w-4" /> تواصل مع الدعم
        </motion.button>
      </div>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowContactModal(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto max-w-lg mx-auto" dir="rtl">
              <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-slate-600" /></div>
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">تواصل معنا</h3>
                  <p className="text-xs text-gray-400">اختار طريقة التواصل</p>
                </div>
                <button onClick={() => setShowContactModal(false)} className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <ArrowLeft className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <a href={`tel:${order.store_phone || '19XXX'}`}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">اتصال بالمتجر</p>
                    <p className="text-xs text-gray-400">{order.store_phone || '19XXX'}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </a>

                <a href={`tel:${order.drivers?.phone || order.driver_phone}`}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">اتصال بالمندوب</p>
                    <p className="text-xs text-gray-400">{order.drivers?.phone || order.driver_phone}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </a>

                <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">محادثة واتساب</p>
                    <p className="text-xs text-gray-400">تواصل عبر الواتساب</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
