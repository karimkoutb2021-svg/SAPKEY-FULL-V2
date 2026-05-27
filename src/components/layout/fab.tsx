'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useVersionCheck } from '@/hooks/use-version-check';
import {
  Download, Share2, Settings, X, Smartphone, Trash2, Database, LogIn,
  RefreshCw, Bell, BellRing, ChevronRight, AlertCircle, CheckCircle2,
  Zap, Cloud, Wifi, WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminCodeModal } from '@/components/auth/admin-code-modal';

export function FAB() {
  const { user, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const deferredPrompt = useRef<any>(null);
  const { updateAvailable, reload, checking } = useVersionCheck({ intervalMs: 15000 });

  const isCustomer = isAuthenticated && user?.role === 'customer';
  const isGuest = !isAuthenticated;
  const canBackup = isAuthenticated && !isCustomer;

  useEffect(() => {
    setMounted(true);
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setInstallable(true);
    });
    setTimeout(() => { if (!window.matchMedia('(display-mode: standalone)').matches && !installed) setInstallable(true); }, 2000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [installed]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated) {
        setIsSyncing(true);
        setTimeout(() => {
          setIsSyncing(false);
          setLastSync(new Date());
        }, 1500);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Auto-show install prompt toast
  useEffect(() => {
    if (installable && !installed) {
      toast((t) => (
        <div className="flex flex-col gap-2 p-1" dir="rtl">
          <p className="font-bold text-sm">تثبيت التطبيق</p>
          <p className="text-xs text-gray-500">قم بتثبيت التطبيق للوصول السريع بدون إنترنت</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { toast.dismiss(t.id); handleInstall(); }}
              className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold w-full"
            >
              تثبيت الآن
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium w-full"
            >
              لاحقاً
            </button>
          </div>
        </div>
      ), { duration: 15000, position: 'bottom-center' });
    }
  }, [installable, installed]);

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') { setInstalled(true); setInstallable(false); toast.success('تم تثبيت التطبيق بنجاح'); }
      deferredPrompt.current = null;
    } else { setShowShareToast(true); setTimeout(() => setShowShareToast(false), 3000); }
  };

  const handleShare = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'SAPKEY GROCERY', text: 'نظام إدارة السوبر ماركت', url: window.location.href }); } catch {} }
    else { try { await navigator.clipboard.writeText(window.location.href); toast.success('تم نسخ الرابط'); } catch {} }
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    toast.success('تم مسح الكاش بنجاح');
    setTimeout(() => window.location.reload(), 500);
  };

  const handleExportBackup = async () => {
    if (!isAuthenticated) { toast.error('سجل دخولك أول'); return; }
    if (isCustomer) { toast.error('النسخ الاحتياطي غير متاح للعملاء'); return; }
    toast.loading('جاري تجهيز النسخة الاحتياطية...');
    try {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) { try { data[key] = JSON.parse(localStorage.getItem(key) || ''); } catch { data[key] = localStorage.getItem(key); } }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success('تم تصدير النسخة الاحتياطية');
    } catch { toast.dismiss(); toast.error('فشل تصدير النسخة الاحتياطية'); }
  };

  const handleRefresh = useCallback(() => {
    setIsSyncing(true);
    if ('caches' in window) {
      caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))));
    }
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ALL_CACHES' });
    }
    localStorage.setItem('cache-bust', Date.now().toString());
    setTimeout(() => {
      setIsSyncing(false);
      window.location.reload();
    }, 500);
  }, []);

  const handleUpdate = () => {
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ALL_CACHES' });
    }
    sessionStorage.removeItem('app-build-id');
    sessionStorage.setItem('force-reload', 'true');
    window.location.reload();
  };

  if (!mounted) return null;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'لم تتم المزامنة';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    return `منذ ${Math.floor(diff / 3600)} ساعة`;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] lg:hidden"
            onClick={() => { setIsOpen(false); setExpandedSection(null); }}
          />
        )}
      </AnimatePresence>

      {/* Side Handle */}
      <button
        onClick={() => { setIsOpen(!isOpen); setExpandedSection(null); }}
        className="fixed z-[9999] top-1/2 -translate-y-1/2 left-0 h-14 w-10 flex items-center justify-center transition-all duration-300 shadow-lg rounded-r-xl"
        style={{
          background: isOpen ? 'rgba(239, 68, 68, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderColor: isOpen ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
          boxShadow: '4px 0 15px rgba(0, 0, 0, 0.1)',
        }}
        aria-label="قائمة سريعة"
      >
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
          {isOpen ? <X className="w-5 h-5 text-white" /> : <Settings className="w-5 h-5 text-gray-700" />}
        </motion.div>
      </button>

      {/* Update Indicator on Handle */}
      {updateAvailable && !isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed z-[99999] left-8 top-1/2 -translate-y-1/2 -mt-4"
        >
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse ring-2 ring-white shadow-md" />
        </motion.div>
      )}

      {/* Slide-out Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed z-[9998] left-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur-xl shadow-2xl border-r border-gray-200/50 flex flex-col"
          >
            <div className="px-4 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">القائمة السريعة</p>
                <p className="text-[10px] text-gray-400 mt-1">SAPKEY GROCERY</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-[10px] text-gray-400">{isOnline ? 'متصل' : 'غير متصل'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {updateAvailable && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-2"
                >
                  <button
                    onClick={handleUpdate}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md active:scale-[0.98] transition-transform"
                  >
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <div className="text-right flex-1">
                      <p className="text-sm font-bold">تحديث متاح</p>
                      <p className="text-xs opacity-90">اضغط للتحديث الآن</p>
                    </div>
                    <BellRing className="w-5 h-5" />
                  </button>
                </motion.div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isSyncing || checking}
                  className="flex-1 flex flex-col items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${isSyncing || checking ? 'animate-spin' : ''}`} />
                  <span className="text-[11px] font-medium text-gray-600">مزامنة البيانات</span>
                </button>
                <button
                  onClick={handleClearCache}
                  className="flex-1 flex flex-col items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <span className="text-[11px] font-medium text-gray-600">مسح الكاش</span>
                </button>
              </div>

              {isAuthenticated && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50/50 border border-green-100">
                  <Cloud className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">آخر مزامنة: {formatSyncTime(lastSync)}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => toggleSection('tools')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-700 flex-1 text-right">أدوات التطبيق</span>
                  <motion.div animate={{ rotate: expandedSection === 'tools' ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {expandedSection === 'tools' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 pr-11 mt-1"
                    >
                      {installable && !installed && (
                        <button onClick={handleInstall} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-blue-600">
                          <Download className="w-4 h-4" />
                          <span className="text-xs font-semibold">تثبيت التطبيق على الجهاز</span>
                        </button>
                      )}
                      {installed && (
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-semibold">التطبيق مثبت بالفعل</span>
                        </div>
                      )}
                      <button onClick={handleShare} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                        <Share2 className="w-4 h-4" />
                        <span className="text-xs font-medium">مشاركة التطبيق</span>
                      </button>
                      {canBackup && (
                        <button onClick={handleExportBackup} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                          <Database className="w-4 h-4" />
                          <span className="text-xs font-medium">نسخة احتياطية (Backup)</span>
                        </button>
                      )}
                      {isGuest && (
                        <button onClick={() => { setIsOpen(false); window.location.href = '/shop?login=true'; }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                          <LogIn className="w-4 h-4" />
                          <span className="text-xs font-medium">تسجيل الدخول للعملاء</span>
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => toggleSection('quick')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-700 flex-1 text-right">إجراءات سريعة</span>
                  <motion.div animate={{ rotate: expandedSection === 'quick' ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {expandedSection === 'quick' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 pr-11 mt-1"
                    >
                      <button onClick={() => { setIsOpen(false); window.location.href = '/'; }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">الذهاب للرئيسية</span>
                      </button>
                      {isAuthenticated && (
                        <button onClick={() => { setIsOpen(false); setShowAdminModal(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">
                          <Settings className="w-4 h-4" />
                          <span className="text-xs font-medium">لوحة تحكم الإدارة</span>
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200/50">
              <p className="text-xs font-medium text-gray-500 text-center">الإصدار {process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[99999] px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg"
            style={{ background: 'rgba(0, 122, 255, 0.95)', backdropFilter: 'blur(20px)' }}
          >
            تم نسخ الرابط
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Code Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <AdminCodeModal
            onClose={() => setShowAdminModal(false)}
            onSuccess={() => { setShowAdminModal(false); toast.success('تم التحقق بنجاح'); window.location.href = '/login'; }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
