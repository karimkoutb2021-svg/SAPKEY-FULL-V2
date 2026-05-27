'use client';

import { motion } from 'framer-motion';
import { Lock, MessageCircle, Clock, AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';

interface SubscriptionLockScreenProps {
  tenantName?: string;
  daysRemaining?: number;
  onContactWhatsApp?: () => void;
}

export function SubscriptionLockScreen({ tenantName, daysRemaining = 0 }: SubscriptionLockScreenProps) {
  const { branding } = useBrandingStore();
  const whatsappNum = branding.whatsapp?.replace(/[^0-9]/g, '') || '2010XXXXXXX';

  const handleWhatsApp = () => {
    const msg = encodeURIComponent('مرحباً، انتهت باقة الاشتراك الخاصة بي وأريد تجديدها');
    window.open(`https://wa.me/${whatsappNum}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
        className="max-w-md w-full">
        
        <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
          
          <motion.div initial={{ rotate: -10 }} animate={{ rotate: 0 }} transition={{ duration: 0.5, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
            <Lock className="h-10 w-10 text-white" />
          </motion.div>

          <h1 className="text-2xl font-bold text-white mb-2">الباقة منتهية</h1>
          <p className="text-gray-400 text-sm mb-6">
            {tenantName ? `عذراً ${tenantName}، اشتراكك في الخدمة قد انتهى` : 'عذراً، اشتراكك في الخدمة قد انتهى'}
          </p>

          {daysRemaining > 0 && (
            <div className="flex items-center justify-center gap-2 mb-6 text-amber-400 text-sm">
              <Clock className="h-4 w-4" />
              <span>باقي {daysRemaining} أيام على الانتهاء</span>
            </div>
          )}

          <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-right">
                <p className="text-white text-sm font-medium mb-1">تم تعليق الخدمة بالكامل</p>
                <p className="text-gray-400 text-xs leading-relaxed">
                  تم إيقاف جميع ميزات النظام. لا يمكن الوصول لأي خدمة لحين تجديد الاشتراك.
                  يرجى التواصل مع المطور (فريق الدعم الفني) لتجديد الباقة واستعادة الخدمة كاملة.
                </p>
              </div>
            </div>
          </div>

          {/* Developer Contact Info */}
          <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
            <p className="text-gray-300 text-xs font-medium mb-2">معلومات المطور</p>
            <div className="flex items-center gap-2 text-gray-400 text-[10px] mb-1">
              <Mail className="h-3 w-3" />
              <span dir="ltr">admin@sapkey.com</span>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={handleWhatsApp}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all">
              <MessageCircle className="h-5 w-5" />
              تواصل مع المطور عبر واتساب
            </button>

            <button onClick={() => window.location.reload()}
              className="w-full h-12 rounded-2xl bg-white/5 text-gray-300 font-medium flex items-center justify-center gap-2 border border-white/10 hover:bg-white/10 transition-all">
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>
          </div>

          <p className="text-gray-600 text-xs mt-6">SAPKEY SOLUTIONS™ © {new Date().getFullYear()}</p>
        </div>
      </motion.div>
    </div>
  );
}
