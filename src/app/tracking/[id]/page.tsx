'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Phone, MapPin, Clock, CheckCircle2, 
  Package, ChefHat, Bike, Home 
} from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 'preparing', label: 'جاري التجهيز', icon: ChefHat },
  { id: 'picked_up', label: 'تم الاستلام', icon: Package },
  { id: 'on_the_way', label: 'في الطريق إليك', icon: Bike },
  { id: 'delivered', label: 'تم التوصيل', icon: Home },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#10B981';
  const supabase = createClient();
  
  const [currentStep, setCurrentStep] = useState(0); 
  const [eta, setEta] = useState('جاري حساب الوقت...');
  const [driver, setDriver] = useState({ name: 'كابتن التوصيل', phone: '', rating: 4.8 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .select('*, deliveries(*, users(full_name_ar, phone))')
          .eq('id', id)
          .single();

        if (orderErr || !order) {
          toast.error('الطلب غير موجود');
          return;
        }

        const delivery = order.deliveries?.[0];
        
        // Map status to steps
        const status = delivery?.status || order.status;
        let stepIdx = 0;
        if (['pending', 'preparing', 'confirmed'].includes(status)) stepIdx = 0;
        else if (['picked_up', 'assigned'].includes(status)) stepIdx = 1;
        else if (['in_transit', 'on_the_way'].includes(status)) stepIdx = 2;
        else if (['delivered', 'completed'].includes(status)) stepIdx = 3;
        
        setCurrentStep(stepIdx);

        if (stepIdx === 3) {
          setEta('تم التوصيل');
        } else if (delivery?.eta) {
          const diff = Math.max(0, new Date(delivery.eta).getTime() - new Date().getTime());
          const mins = Math.ceil(diff / 60000);
          setEta(`${mins} دقيقة تقريباً`);
        } else {
          setEta('15 دقيقة تقريباً');
        }

        if (delivery?.users) {
          setDriver({
            name: delivery.users.full_name_ar || 'كابتن التوصيل',
            phone: delivery.users.phone || '',
            rating: 4.8
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Realtime subscription
    const channel = supabase
      .channel('delivery-tracking')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deliveries', filter: `order_id=eq.${id}` }, (payload) => {
        fetchOrder();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        fetchOrder();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center text-emerald-500">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#111114]/90 backdrop-blur-3xl border-b border-white/[0.06] shadow-2xl h-16 px-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.1] transition-colors border border-white/[0.06]">
          <ArrowRight className="h-5 w-5 text-gray-300" />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-lg font-bold">تتبع الطلب</h1>
          <p className="text-xs text-gray-400 font-mono">{id}</p>
        </div>
        <div className="h-10 w-10"></div>
      </div>

      <div className="max-w-md mx-auto relative h-[calc(100vh-64px)] overflow-hidden flex flex-col">
        
        {/* Map Simulation Background */}
        <div className="absolute inset-0 bg-[#0F172A] opacity-50 z-0">
          <div className="absolute inset-0" style={{ 
            backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }} />
          
          {/* Animated Route Line */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none">
            <motion.path
              d="M 50,50 Q 200,200 150,400 T 300,600"
              fill="none"
              stroke={primaryColor}
              strokeWidth="4"
              strokeDasharray="10 10"
              initial={{ pathLength: 0, opacity: 0.2 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </svg>

          {/* Motorcycle Icon */}
          <motion.div
            className="absolute z-10 drop-shadow-2xl"
            initial={{ top: '10%', left: '10%' }}
            animate={{ 
              top: currentStep >= 2 ? '60%' : '20%', 
              left: currentStep >= 2 ? '70%' : '30%' 
            }}
            transition={{ duration: 5, ease: "easeInOut" }}
          >
            <div className="bg-[#111114] p-3 rounded-full border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <Bike className="h-6 w-6 text-emerald-400" />
            </div>
            {/* Pulse effect */}
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
          </motion.div>
        </div>

        {/* Tracking Details Card */}
        <div className="mt-auto z-20 w-full p-4 pb-8">
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-6 shadow-2xl shadow-emerald-500/10"
          >
            {/* ETA & Status */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-sm text-gray-400 mb-1 font-medium">الوقت المقدر للوصول</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-400" />
                  <span className="text-2xl font-black text-white">{eta}</span>
                </div>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                {currentStep === 3 ? (
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                ) : (
                  <Package className="h-7 w-7 text-emerald-400 animate-pulse" />
                )}
              </div>
            </div>

            {/* Stepper */}
            <div className="relative flex justify-between mb-8">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/[0.04] -translate-y-1/2 rounded-full" />
              <motion.div 
                className="absolute top-1/2 right-0 h-1 bg-emerald-500 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                initial={{ width: '0%' }}
                animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
              
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = idx <= currentStep;
                const isActive = idx === currentStep;
                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                        : 'bg-[#0A0A0C] border-2 border-white/[0.08]'
                    }`}>
                      <Icon className={`h-4 w-4 ${isCompleted ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <span className={`text-[10px] font-bold absolute -bottom-6 whitespace-nowrap ${
                      isActive ? 'text-emerald-400' : isCompleted ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Driver Info */}
            <div className="mt-12 bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/[0.1] flex items-center justify-center">
                  <span className="text-lg font-bold">{driver.name.charAt(0)}</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{driver.name}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                    <span>★</span>
                    <span>{driver.rating}</span>
                    <span className="text-gray-500 px-1">•</span>
                    <span className="text-gray-400">كابتن التوصيل</span>
                  </div>
                </div>
              </div>
              
              <a href={`tel:${driver.phone}`} className="h-12 w-12 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors">
                <Phone className="h-5 w-5" />
              </a>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-4 flex gap-3">
              <button className="flex-1 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-sm font-bold transition-colors">
                تفاصيل الفاتورة
              </button>
              <button className="flex-1 py-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-bold transition-colors">
                مساعدة عاجلة
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
