'use client';

import { useRouter } from 'next/navigation';
import { Home, ArrowRight } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';

export function PageHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon: React.ReactNode }) {
  const router = useRouter();
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';

  return (
    <div className="bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>الرئيسية</span>
          </button>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>رجوع</span>
          </button>
        </div>
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
            <span style={{ color: primaryColor }}>{icon}</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{title}</h1>
          {subtitle && <p className="text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
