'use client';

import { useEffect, useState, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function PWAProvider({ children }: { children: ReactNode }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const deferredPrompt = useRef<any>(null);
  const [promptReady, setPromptReady] = useState(false);

  useEffect(() => {
    if (isStandalone()) { setIsInstalled(true); return; }

    if (typeof window !== 'undefined' && localStorage.getItem('pwa_dismissed')) {
      const dismissedAt = parseInt(localStorage.getItem('pwa_dismissed') || '0', 10);
      if (Date.now() - dismissedAt < 86400000) return; // 24 hours
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
        reg.update();
      }).catch(() => {});
    }

    const onInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setPromptReady(true);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      toast.success('تم التثبيت بنجاح');
    };

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const result = await deferredPrompt.current.userChoice;
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
        toast.success('تم تثبيت التطبيق');
      }
      deferredPrompt.current = null;
      setPromptReady(false);
      return;
    }

    if (isIOS()) {
      setShowIOSHelp(true);
      return;
    }

    if (isMobile() && 'onbeforeinstallprompt' in window) {
      toast('تأكد من استخدام Chrome أو Edge', { icon: 'ℹ️', duration: 4000 });
      return;
    }

    toast('افتح قائمة المتصفح (⋮) ← تثبيت التطبيق', { icon: 'ℹ️', duration: 5000 });
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_dismissed', Date.now().toString());
    setShowPrompt(false);
    setShowIOSHelp(false);
  };

  if (isInstalled) return <>{children}</>;

  return (
    <>
      {children}

      {!showPrompt && !isInstalled && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: 'spring' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowPrompt(true)}
          className="fixed bottom-24 left-4 z-40 h-11 w-11 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] text-white shadow-lg shadow-[#22C55E]/30 flex items-center justify-center"
        >
          <Download className="h-5 w-5" />
        </motion.button>
      )}

      <AnimatePresence>
        {showPrompt && !isInstalled && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 z-50" onClick={handleDismiss} />
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:25,stiffness:300}} className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#0F172A] rounded-t-3xl shadow-2xl max-w-lg mx-auto p-6" dir="rtl">
              <div className="flex justify-center mb-4"><div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-slate-600" /></div>
              <button onClick={handleDismiss} className="absolute top-4 left-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"><X className="h-5 w-5 text-gray-400" /></button>

              <div className="text-center mb-5">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center shadow-lg mb-3"><Download className="h-8 w-8 text-white" /></div>
                <h2 className="text-lg font-bold mb-1">تثبيت التطبيق</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">لتجربة أسرع ووصول مباشر</p>
              </div>

              <div className="space-y-2.5 mb-4">
                {deferredPrompt.current ? (
                  <button onClick={triggerInstall} className="w-full h-13 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold text-sm shadow-sm flex items-center gap-3 px-4 hover:shadow-md transition-all">
                    <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center"><Smartphone className="h-4 w-4" /></div>
                    <div className="text-right flex-1"><p className="font-medium">تثبيت على الجهاز</p><p className="text-[10px] text-white/70">يضاف إلى الشاشة الرئيسية</p></div>
                    <Download className="h-4 w-4 opacity-70" />
                  </button>
                ) : (
                  <button onClick={triggerInstall} className="w-full h-13 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold text-sm shadow-sm flex items-center gap-3 px-4 hover:shadow-md transition-all">
                    <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center"><Smartphone className="h-4 w-4" /></div>
                    <div className="text-right flex-1"><p className="font-medium">تثبيت التطبيق</p><p className="text-[10px] text-white/70">للوصول السريع من الجهاز</p></div>
                    <Download className="h-4 w-4 opacity-70" />
                  </button>
                )}
                <button onClick={() => { navigator.share ? navigator.share({ title: 'SuperMarket', url: '/' }) : toast('انسخ الرابط لمشاركته', { icon: '🔗' }); }} className="w-full h-13 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-medium text-sm flex items-center gap-3 px-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-all">
                  <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center"><Monitor className="h-4 w-4" /></div>
                  <div className="text-right flex-1"><p className="font-medium">مشاركة التطبيق</p><p className="text-[10px] text-gray-400">أرسل الرابط للأصدقاء</p></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={handleDismiss} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-white">ليس الآن</button>
                <div className="flex items-center gap-1 text-xs text-gray-400"><span>تطبيق مجاني</span><span>•</span><span>يعمل بدون إنترنت</span></div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* iOS Help Modal */}
      <AnimatePresence>
        {showIOSHelp && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowIOSHelp(false)} />
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()} dir="rtl">
                <h2 className="text-lg font-bold mb-4 text-center">تثبيت على iPhone / iPad</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0"><span className="text-sm font-bold text-blue-600">1</span></div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">اضغط على زر <strong>المشاركة</strong> 🔀 في شريط العنوان السفلي</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0"><span className="text-sm font-bold text-blue-600">2</span></div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong> ⬇️</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0"><span className="text-sm font-bold text-blue-600">3</span></div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">اضغط <strong>"إضافة"</strong> ✅ في الأعلى</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 text-xs mt-4">
                  بعد الإضافة، ستتمكن من فتح التطبيق من الشاشة الرئيسية كتطبيق مستقل
                </div>
                <button onClick={() => setShowIOSHelp(false)} className="w-full h-11 rounded-xl bg-[#22C55E] text-white font-medium mt-4">تم</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <OfflineDetector />
    </>
  );
}

function OfflineDetector() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(false);
    const off = () => setShow(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    if (typeof navigator !== 'undefined' && !navigator.onLine) setShow(true);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (!show) return null;
  return <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center py-2 text-sm font-medium">أنت غير متصل بالإنترنت</div>;
}
