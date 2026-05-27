'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Package, Search, ArrowRight } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { PageHeader } from '@/components/layout/page-header';

export default function TrackingPage() {
  const router = useRouter();
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';
  const [orderId, setOrderId] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    router.push(`/tracking/${orderId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">
      <PageHeader title="تتبع طلبك" subtitle="ادخل رقم الطلب عشان تتابعه" icon={<Truck className="h-8 w-8" />} />

      <div className="max-w-md mx-auto px-4 py-8">
        <form onSubmit={handleTrack} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="h-5 w-5 text-gray-400" />
            <h3 className="font-bold text-gray-900 dark:text-white">رقم الطلب</h3>
          </div>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="مثال: ORD-2026-001"
            className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 mb-4"
          />
          <button type="submit" className="w-full h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2" style={{ backgroundColor: primaryColor }}>
            <Search className="h-4 w-4" /> تتبع
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-3">أو اتبع من طلباتك</p>
          <button onClick={() => router.push('/customer/orders')} className="h-10 px-6 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 flex items-center gap-2 mx-auto">
            <ArrowRight className="h-4 w-4" /> طلباتي
          </button>
        </div>
      </div>
    </div>
  );
}
