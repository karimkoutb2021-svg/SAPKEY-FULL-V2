'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionStore, ALL_FEATURES } from '@/lib/store/subscription-store';
import { ToggleLeft, Plus, Users, Search, Filter, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const categoryLabels: Record<string, string> = {
  pos: 'نقطة البيع',
  inventory: 'المخزون',
  accounting: 'المحاسبة',
  delivery: 'التوصيل',
  ai: 'الذكاء الاصطناعي',
  integrations: 'التكاملات',
  advanced: 'الميزات المتقدمة',
};

export default function FeatureFlagsPage() {
  const { plans, features, updatePlan } = useSubscriptionStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const categories = Array.from(new Set(features.map((f) => f.category)));

  const toggleFeatureForPlan = (planId: string, featureKey: string, enable: boolean) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const newFeatures = enable
      ? [...plan.features, featureKey]
      : plan.features.filter((f) => f !== featureKey);
    updatePlan(planId, { features: newFeatures });
    toast.success(enable ? 'تم تفعيل الميزة' : 'تم تعطيل الميزة');
  };

  const toggleFeatureGlobally = (featureKey: string, enable: boolean) => {
    plans.forEach((plan) => {
      const has = plan.features.includes(featureKey);
      if (enable && !has) updatePlan(plan.id, { features: [...plan.features, featureKey] });
      if (!enable && has) updatePlan(plan.id, { features: plan.features.filter((f) => f !== featureKey) });
    });
    toast.success(enable ? 'تم تفعيل الميزة لجميع الباقات' : 'تم تعطيل الميزة لجميع الباقات');
  };

  const filtered = features.filter((f) => {
    const matchesSearch = !search || f.labelAr.includes(search) || f.label.includes(search) || f.key.includes(search);
    const matchesCat = !selectedCategory || f.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
            <ToggleLeft className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">الميزات الديناميكية</h1>
            <p className="text-xs text-gray-500">ربط الميزات بالباقات — تفعيل وتعطيل الميزات لكل خطة اشتراك</p>
          </div>
        </div>
        <button className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg hover:shadow-xl transition-all">
          <Plus className="h-3.5 w-3.5" /> إضافة ميزة جديدة
        </button>
      </div>

      {/* Info Banner */}
      <Card className="border-0 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/20 dark:to-gray-950 shadow-lg">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md shrink-0">
            <Users className="h-4 w-4 text-white" />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            الميزات مرتبطة ديناميكياً بالباقات. عند تغيير حالة ميزة في باقة معينة، يتم تطبيق التغيير تلقائياً على جميع المستأجرين المشتركين في تلك الباقة.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input type="text" placeholder="بحث عن ميزة..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pr-9 pl-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setSelectedCategory(null)}
            className={`h-7 px-3 rounded-lg text-[10px] font-medium transition-all ${!selectedCategory ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
            الكل
          </button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`h-7 px-3 rounded-lg text-[10px] font-medium transition-all ${selectedCategory === cat ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Features Matrix */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-800 shadow-lg relative">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800">
              <th className="text-right px-4 py-3 text-[10px] font-medium text-gray-500 min-w-[180px] sticky right-0 bg-gray-50 dark:bg-slate-900 z-20 border-l border-gray-100 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-2">
                  <Filter className="h-3 w-3" /> الميزة
                </div>
              </th>
              {plans.map((plan) => (
                <th key={plan.id} className="text-center px-3 py-3 min-w-[100px]">
                  <span className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${plan.color} text-white text-[9px] font-bold`}>{plan.name}</span>
                </th>
              ))}
              <th className="text-center px-3 py-3 min-w-[80px]">
                <span className="text-[10px] font-medium text-gray-400">الكل</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {filtered.map((feature) => {
              const allEnabled = plans.every((p) => p.features.includes(feature.key));
              const anyEnabled = plans.some((p) => p.features.includes(feature.key));
              return (
                <motion.tr key={feature.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 sticky right-0 bg-white dark:bg-slate-900 z-10 border-l border-gray-100 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        feature.category === 'pos' ? 'bg-emerald-500' : feature.category === 'inventory' ? 'bg-blue-500' :
                        feature.category === 'accounting' ? 'bg-purple-500' : feature.category === 'delivery' ? 'bg-amber-500' :
                        feature.category === 'ai' ? 'bg-cyan-500' : feature.category === 'integrations' ? 'bg-rose-500' : 'bg-gray-500'
                      }`} />
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white max-w-[120px] whitespace-normal leading-tight">{feature.labelAr}</p>
                        <code className="text-[8px] text-gray-400 font-mono mt-1 block">{feature.key}</code>
                      </div>
                    </div>
                  </td>
                  {plans.map((plan) => {
                    const enabled = plan.features.includes(feature.key);
                    return (
                      <td key={plan.id} className="text-center px-3 py-3">
                        <button onClick={() => toggleFeatureForPlan(plan.id, feature.key, !enabled)}
                          className={`relative h-6 w-11 rounded-full transition-all mx-auto ${enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                          <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${enabled ? 'right-[22px]' : 'right-0.5'}`} />
                        </button>
                        {!enabled && feature.key === 'pos_offline' && plan.id === 'starter' && (
                          <p className="text-[8px] text-amber-500 mt-0.5">غير متاح</p>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center px-3 py-3">
                    <button onClick={() => toggleFeatureGlobally(feature.key, !allEnabled)}
                      className={`h-6 w-11 rounded-full transition-all mx-auto ${allEnabled ? 'bg-emerald-500' : anyEnabled ? 'bg-amber-400' : 'bg-gray-300 dark:bg-slate-600'}`}>
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${allEnabled ? 'right-[22px]' : 'right-0.5'}`} />
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <Card className="border-0 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-gray-950 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Check className="h-3.5 w-3.5 text-emerald-500" /> إجمالي الميزات: <span className="font-bold text-gray-900 dark:text-white">{features.length}</span>
            </div>
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${plan.color}`} />
                {plan.name}: <span className="font-bold text-gray-900 dark:text-white">{plan.features.length}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
