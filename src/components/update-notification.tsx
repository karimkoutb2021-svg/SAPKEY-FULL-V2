'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, Sparkles } from 'lucide-react';

const VERSION_KEY = 'app-version';
const DISMISSED_KEY = 'update-dismissed-session';
const BUILD_VERSION = '2026.05.20.5';

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const savedVersion = localStorage.getItem(VERSION_KEY);
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);

    if (!savedVersion) {
      localStorage.setItem(VERSION_KEY, BUILD_VERSION);
      return;
    }

    if (savedVersion !== BUILD_VERSION && !dismissed) {
      setShowUpdate(true);
    }

    const checkInterval = setInterval(() => {
      const current = localStorage.getItem(VERSION_KEY);
      const dismissed2 = sessionStorage.getItem(DISMISSED_KEY);
      if (current && current !== BUILD_VERSION && !dismissed2) {
        setShowUpdate(true);
      }
    }, 15000);

    return () => clearInterval(checkInterval);
  }, []);

  const handleDismiss = () => {
    setShowUpdate(false);
    sessionStorage.setItem(DISMISSED_KEY, '1');
  };

  const handleUpdate = () => {
    setIsUpdating(true);
    localStorage.setItem(VERSION_KEY, BUILD_VERSION);
    sessionStorage.removeItem(DISMISSED_KEY);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <AnimatePresence>
      {showUpdate && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm"
          >
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/50 overflow-hidden border border-gray-200/70 dark:border-slate-700/50">
              <div className="p-5 pt-6 text-center relative">
                <button
                  onClick={handleDismiss}
                  className="absolute top-3 left-3 h-8 w-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
                <div className="h-14 w-14 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 ring-1 ring-gray-200 dark:ring-slate-700">
                  <Sparkles className="h-7 w-7 text-gray-700 dark:text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">تحديث جديد متاح</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">إصدار أحدث متاح الآن</p>
              </div>

              <div className="px-5 pb-5 space-y-4">
                <div className="space-y-2.5 bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3.5">
                  <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                    تحسينات في الأداء
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                    إصلاح أخطاء سابقة
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                    تحسين تجربة المستخدم
                  </div>
                </div>

                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isUpdating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </motion.div>
                      جاري التحديث...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5" />
                      تحديث الآن
                    </>
                  )}
                </button>

                <button
                  onClick={handleDismiss}
                  className="w-full h-10 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  لاحقاً
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
