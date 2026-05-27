'use client';

import { motion } from 'framer-motion';

export function PageLoader() {
  return (
    <div className="h-dvh w-full bg-gray-50 dark:bg-[#020617] flex flex-col items-center justify-center">
      <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center mb-6">
        <svg className="h-8 w-8 text-emerald-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
      </div>

      <div className="w-48 h-1 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden relative">
        <div className="absolute top-0 left-0 h-full w-1/2 bg-emerald-500 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 font-medium">
        جاري التحميل...
      </p>
    </div>
  );
}
