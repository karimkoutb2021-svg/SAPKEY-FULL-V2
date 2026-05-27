'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function PremiumLoader() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hide loader after minimum duration to ensure smooth entry
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="premium-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.6, 0.05, -0.01, 0.9] } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0B0E11] overflow-hidden"
        >
          {/* Subtle exchange-like background grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#22C55E 1px, transparent 1px), linear-gradient(90deg, #22C55E 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
          <div className="relative flex flex-col items-center gap-8">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
              {/* Outer pulsing ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute inset-0 rounded-full border-t-2 border-r-2 border-emerald-500 opacity-80"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="absolute inset-2 rounded-full border-b-2 border-l-2 border-emerald-400 opacity-60"
              />
              
              {/* Inner geometric core (Binance-inspired diamond) */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-500 rounded-sm rotate-45 shadow-[0_0_20px_rgba(34,197,94,0.6)]"
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center flex flex-col items-center"
            >
              <h1 className="text-emerald-500 text-lg sm:text-xl font-bold tracking-[0.2em] uppercase mb-3">
                SAPKEY
              </h1>
              
              {/* High-tech loading bar */}
              <div className="h-1 w-32 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="h-full w-1/2 bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] rounded-full"
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
