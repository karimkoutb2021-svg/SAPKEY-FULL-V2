'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, ArrowUpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ForceUpdateModalProps {
  show: boolean;
  onReload: () => void;
}

export function ForceUpdateModal({ show, onReload }: ForceUpdateModalProps) {
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (!show) return;
    setCountdown(15);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [show, onReload]);

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[99998]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/50 overflow-hidden border border-gray-200/70 dark:border-slate-700/50 pointer-events-auto">
              <div className="p-5 pt-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', damping: 18 }}
                  className="h-14 w-14 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 ring-1 ring-gray-200 dark:ring-slate-700"
                >
                  <ArrowUpCircle className="h-7 w-7 text-gray-700 dark:text-gray-300" />
                </motion.div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">تحديث النظام</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">يوجد تحديث جديد يرجى التحديث</p>
              </div>

              <div className="px-5 pb-5 space-y-4">
                <div className="flex items-center justify-center gap-2.5 bg-gray-50 dark:bg-slate-800/50 rounded-xl py-3">
                  <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{countdown}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">ثانية للتحديث التلقائي</span>
                </div>

                <button
                  onClick={onReload}
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <RefreshCw className="h-4 w-4" />
                  تحديث الآن
                </button>

                <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                  سيتم التحديث تلقائياً عند انتهاء العد التنازلي
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
