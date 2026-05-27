'use client';

/**
 * ═══════════════════════════════════════════════════════════
 *  Global Navigation Bar - Back + Home + Forward
 *  Works on every page - Apple-style navigation
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronRight, ChevronLeft, Home } from 'lucide-react';

export function GlobalNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  useEffect(() => {
    setHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === pathname) return prev;
      return [...prev, pathname].slice(-50);
    });
    setFuture([]);
  }, [pathname]);

  const goBack = () => {
    if (history.length > 1) {
      const prev = history[history.length - 2];
      setFuture([pathname, ...future]);
      setHistory(history.slice(0, -1));
      router.push(prev);
    }
  };

  const goForward = () => {
    if (future.length > 0) {
      const next = future[0];
      setHistory([...history, pathname]);
      setFuture(future.slice(1));
      router.push(next);
    }
  };

  const goHome = () => {
    router.push('/');
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={goBack}
        disabled={history.length <= 1}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        title="رجوع"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        onClick={goForward}
        disabled={future.length === 0}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        title="تقدم"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={goHome}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
        title="الرئيسية"
      >
        <Home className="h-4 w-4" />
      </button>
    </div>
  );
}
