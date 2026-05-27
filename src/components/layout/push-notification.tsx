'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Percent, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBrandingStore } from '@/lib/store/branding-store';

export function PushNotification() {
  const [show, setShow] = useState(false);
  const [offer, setOffer] = useState<{ title: string; desc: string } | null>(null);
  const router = useRouter();
  const { branding } = useBrandingStore();

  useEffect(() => {
    const rawText = branding.topBannerText || branding.tickerText || 'خصم 20% على الطازج | اشتري 2 واحصل على 1 مجاناً';
    const offers = rawText.split(' | ').map(s => s.trim()).filter(Boolean);
    if (offers.length === 0) return;

    let currentIndex = 0;

    // Show a push notification every 30 seconds
    const interval = setInterval(() => {
      setOffer({
        title: '🔥 عرض جديد حصري!',
        desc: offers[currentIndex],
      });
      setShow(true);
      currentIndex = (currentIndex + 1) % offers.length;

      // Auto hide after 8 seconds
      setTimeout(() => setShow(false), 8000);
    }, 30000);

    return () => clearInterval(interval);
  }, [branding.tickerText, branding.topBannerText]);

  return (
    <AnimatePresence>
      {show && offer && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[90] w-[calc(100vw-32px)] sm:w-80"
          dir="rtl"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-black/20 border border-gray-100 dark:border-slate-800 p-4 relative overflow-hidden group cursor-pointer"
               onClick={() => { setShow(false); router.push('/offers'); }}>
            
            {/* Close button */}
            <button 
              onClick={(e) => { e.stopPropagation(); setShow(false); }}
              className="absolute top-2 left-2 p-1.5 rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 text-gray-500 transition-colors z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex gap-4 items-start">
              {/* Icon */}
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-red-500 animate-[ring_2s_ease-in-out_infinite]" />
              </div>
              
              {/* Content */}
              <div className="flex-1 pt-1">
                <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1 leading-tight">{offer.title}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">{offer.desc}</p>
                
                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 group-hover:gap-2 transition-all">
                  تصفح العروض الآن
                  <ArrowLeft className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <motion.div 
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 8, ease: 'linear' }}
              className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
