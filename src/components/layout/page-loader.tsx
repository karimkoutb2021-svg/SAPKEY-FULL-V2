'use client';

import { motion } from 'framer-motion';

export function PageLoader() {
  return (
    <div className="h-dvh w-full bg-[#020617] flex flex-col items-center justify-center">
      {/* Animated logo */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center shadow-2xl shadow-[#22C55E]/20 mb-8"
      >
        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
      </motion.div>

      {/* Premium loader bar */}
      <div className="w-48 h-1 rounded-full bg-gray-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#22C55E] via-[#16A34A] to-[#22C55E]"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-gray-600 mt-4"
      >
        جاري التحميل...
      </motion.p>
    </div>
  );
}
