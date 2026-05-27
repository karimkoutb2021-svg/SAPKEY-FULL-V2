'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';

export function AdminCodeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { branding } = useBrandingStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError('أدخل الكود'); return; }
    setLoading(true);
    setTimeout(() => {
      if (code.trim() === (branding.adminAccessCode || '12345678')) {
        onSuccess();
      } else {
        setError('الكود غير صحيح');
        setCode('');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-elevated overflow-hidden" onClick={(e) => e.stopPropagation()} dir="rtl">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center">
          <button onClick={onClose} className="absolute top-4 left-4 h-8 w-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-900 to-black dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">دخول الإدارة</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">أدخل كود الدخول للمتابعة</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div>
            <input
              type="password"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              placeholder="••••••••"
              dir="ltr"
              autoComplete="off"
              className={`w-full h-14 px-5 rounded-xl border-2 text-center text-lg font-mono tracking-[0.25em] transition-all outline-none
                ${error
                  ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                  : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white'
                }
                focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10
                placeholder:text-gray-300 dark:placeholder:text-slate-700`}
              autoFocus
            />
            {error && (
              <div className="mt-3 flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl p-3">
                <X className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-xl text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 to-black dark:from-slate-700 dark:to-slate-800 hover:from-gray-800 hover:to-gray-900 dark:hover:from-slate-600 dark:hover:to-slate-700 disabled:opacity-50"
          >
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Lock className="h-4 w-4" />
                دخول
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
