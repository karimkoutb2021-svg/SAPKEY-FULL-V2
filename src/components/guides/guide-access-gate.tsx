'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, Eye, EyeOff, Home, AlertCircle } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import toast from 'react-hot-toast';

interface GuideAccessGateProps {
  guideName: string;
  guideIcon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  storageKey: string;
  onAuthorized: () => void;
}

export function GuideAccessGate({ guideName, guideIcon, gradientFrom, gradientTo, storageKey, onAuthorized }: GuideAccessGateProps) {
  const { branding } = useBrandingStore();
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [wrongCode, setWrongCode] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved === '1') { setAuthorized(true); onAuthorized(); }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'branding-config') {
        setWrongCode(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey, onAuthorized]);

  const handleVerify = () => {
    const expectedCode = branding.guidesAccessCode || 'SAPKEY GUIDES';
    if (code === expectedCode) {
      sessionStorage.setItem(storageKey, '1');
      setAuthorized(true);
      toast.success('تم الدخول بنجاح');
      onAuthorized();
    } else {
      setWrongCode(true);
      toast.error('كود الدخول غير صحيح');
      setTimeout(() => setWrongCode(false), 2000);
    }
  };

  if (authorized) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center p-4 safe-area-inset" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              {guideIcon}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{guideName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">أدخل كود الدخول للمتابعة</p>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <input
                type={showCode ? 'text' : 'password'}
                value={code}
                onChange={(e) => { setCode(e.target.value); setWrongCode(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
                placeholder="••••••••"
                inputMode="text"
                autoComplete="off"
                className={`w-full h-14 rounded-xl border-2 text-center text-lg font-mono tracking-[0.25em] px-4 pr-12 transition-all outline-none
                  ${wrongCode
                    ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                    : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white'
                  }
                  focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10
                  placeholder:text-gray-300 dark:placeholder:text-slate-700`}
              />
              <button type="button" onClick={() => setShowCode(!showCode)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 p-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                {showCode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {wrongCode && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> كود الدخول غير صحيح
              </div>
            )}
            <button onClick={handleVerify} disabled={!code}
              className="w-full h-14 rounded-xl text-white font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${branding.primaryColor || '#22C55E'}, ${adjustColor(branding.primaryColor || '#22C55E', -40)})` }}>
              <ArrowRight className="h-5 w-5" /> دخول
            </button>
            <Link href="/" className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors py-2">
              <Home className="h-4 w-4" /> العودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
