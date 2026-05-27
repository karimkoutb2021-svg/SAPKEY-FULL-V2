'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscriptionStore, type SubscriptionPlan, ALL_FEATURES } from '@/lib/store/subscription-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard, Check, X, Edit3, Plus, Users, HardDrive, Settings, Star, Zap, Shield,
  Trash2, Save, ChevronDown, ChevronUp, Sparkles, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const categoryLabels: Record<string, { labelAr: string; icon: any }> = {
  pos: { labelAr: 'نقطة البيع', icon: Zap },
  inventory: { labelAr: 'المخزون', icon: Shield },
  accounting: { labelAr: 'المحاسبة', icon: Settings },
  delivery: { labelAr: 'التوصيل', icon: Shield },
  ai: { labelAr: 'الذكاء الاصطناعي', icon: Star },
  integrations: { labelAr: 'التكاملات', icon: Zap },
  advanced: { labelAr: 'متقدم', icon: Settings },
};

const EMPTY_PLAN: Omit<SubscriptionPlan, 'id'> = {
  name: '', nameAr: '', priceMonthly: 0, priceYearly: 0, yearlyDiscount: 0,
  currency: 'EGP', maxUsers: 1, maxStorage: '1 GB', features: [],
  popular: false, color: 'from-slate-500 to-gray-600',
  description: '', descriptionAr: '',
};

export default function SubscriptionsPage() {
  const { plans, features, updatePlan, addPlan } = useSubscriptionStore();
  const [isYearly, setIsYearly] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<SubscriptionPlan>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlan, setNewPlan] = useState<Omit<SubscriptionPlan, 'id'>>({ ...EMPTY_PLAN });
  const [editFeatures, setEditFeatures] = useState<Record<string, boolean>>({});

  const startEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan.id);
    setEditData({ ...plan });
    setEditFeatures(Object.fromEntries(ALL_FEATURES.map((f) => [f.key, plan.features.includes(f.key)])));
  };

  const saveEdit = () => {
    if (!editingPlan) return;
    const selectedFeatures = Object.entries(editFeatures).filter(([, v]) => v).map(([k]) => k);
    updatePlan(editingPlan, { ...editData, features: selectedFeatures });
    setEditingPlan(null);
    toast.success('تم تحديث الباقة');
  };

  const handleAddPlan = () => {
    if (!newPlan.name || !newPlan.nameAr || newPlan.priceMonthly <= 0) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const id = newPlan.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    addPlan({ ...newPlan, id });
    setShowAddModal(false);
    setNewPlan({ ...EMPTY_PLAN });
    toast.success('تم إضافة الباقة');
  };

  const handleDeletePlan = (planId: string) => {
    if (plans.length <= 1) {
      toast.error('لا يمكن حذف آخر باقة');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;
    const updated = plans.filter((p) => p.id !== planId);
    useSubscriptionStore.setState({ plans: updated });
    toast.success('تم حذف الباقة');
  };

  const toggleFeature = (key: string) => {
    setEditFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleNewFeature = (key: string) => {
    setNewPlan((prev) => ({
      ...prev,
      features: prev.features.includes(key)
        ? prev.features.filter((f) => f !== key)
        : [...prev.features, key],
    }));
  };

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      {/* Apple-style Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMS41Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <CreditCard className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">الباقات والاشتراكات</h1>
              <p className="text-slate-300/80 text-sm mt-1">إدارة خطط الأسعار والميزات — SAPKEY SOLUTIONS</p>
            </div>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="h-11 px-5 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-2 shadow-lg hover:bg-white/20 transition-all border border-white/10">
            <Plus className="h-4 w-4" /> إضافة باقة
          </button>
        </div>
      </motion.div>

      {/* Monthly/Yearly Toggle - Apple Style */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="flex items-center justify-center">
        <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-gray-100 dark:bg-slate-800 shadow-inner">
          <button onClick={() => setIsYearly(false)}
            className={`h-10 px-6 rounded-xl text-sm font-semibold transition-all ${
              !isYearly ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            شهري
          </button>
          <button onClick={() => setIsYearly(true)}
            className={`h-10 px-6 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              isYearly ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            سنوي
            <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 text-[9px] h-5 px-1.5">وفّر 17%</Badge>
          </button>
        </div>
      </motion.div>

      {/* Plan Cards - Apple Style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {plans.map((plan, i) => {
          const price = isYearly ? plan.priceYearly : plan.priceMonthly;
          const priceLabel = isYearly ? 'ج.م/سنة' : 'ج.م/شهر';
          const monthlyEquivalent = isYearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
          const catFeatures = features.filter((f) => plan.features.includes(f.key));
          const planCats = new Set(catFeatures.map((f) => f.category));

          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className={`relative rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl ${
                plan.popular
                  ? 'border-2 border-emerald-500/50 bg-white dark:bg-slate-900 shadow-xl shadow-emerald-500/10 scale-[1.02]'
                  : 'border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900'
              }`}>
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
              )}

              <div className="p-6">
                {/* Plan Name */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.nameAr}</h3>
                  {plan.popular && (
                    <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 text-[9px] h-5">
                      <Star className="h-2.5 w-2.5 ml-0.5 fill-white" /> الأكثر طلباً
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{plan.descriptionAr}</p>

                {/* Price - Animated */}
                <AnimatePresence mode="wait">
                  <motion.div key={`${plan.id}-${isYearly}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">{price.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">{priceLabel}</span>
                    </div>
                    {isYearly && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 line-through">{(plan.priceMonthly * 12).toLocaleString()} ج.م</span>
                        <Badge variant="success" className="text-[9px] border-0">وفّر {(plan.priceMonthly * 12 - plan.priceYearly).toLocaleString()} ج.م</Badge>
                      </div>
                    )}
                    {isYearly && (
                      <p className="text-[10px] text-gray-400 mt-0.5">يعادل {monthlyEquivalent.toLocaleString()} ج.م/شهر</p>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>{plan.maxUsers === 999 ? '∞' : plan.maxUsers} مستخدم</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <HardDrive className="h-3.5 w-3.5" />
                    <span>{plan.maxStorage}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2.5">
                  {Array.from(planCats).slice(0, 4).map((cat) => {
                    const catInfo = categoryLabels[cat] || { labelAr: cat, icon: Settings };
                    const CatIcon = catInfo.icon;
                    const catFeats = catFeatures.filter((f) => f.category === cat);
                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <CatIcon className="h-3 w-3 text-gray-400" />
                          <span className="text-[10px] font-medium text-gray-500">{catInfo.labelAr}</span>
                        </div>
                        <div className="space-y-1">
                          {catFeats.map((f) => (
                            <div key={f.key} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span>{f.labelAr}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Expand */}
                <button onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                  className="w-full flex items-center justify-center gap-1 mt-4 py-2 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  {expandedPlan === plan.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {expandedPlan === plan.id ? 'إخفاء' : `عرض كل الميزات (${plan.features.length})`}
                </button>

                <AnimatePresence>
                  {expandedPlan === plan.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-1">
                        {features.map((f) => {
                          const enabled = plan.features.includes(f.key);
                          return (
                            <div key={f.key} className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs ${enabled ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'opacity-40'}`}>
                              <div className="flex items-center gap-2">
                                {enabled ? <Check className="h-3 w-3 text-emerald-500" /> : <X className="h-3 w-3 text-red-400" />}
                                <span className={enabled ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}>{f.labelAr}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                  <button onClick={() => startEdit(plan)}
                    className="flex-1 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">
                    <Edit3 className="h-3.5 w-3.5" /> تعديل
                  </button>
                  <button onClick={() => handleDeletePlan(plan.id)}
                    className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/50 transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingPlan(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">تعديل الباقة</h3>
              <button onClick={() => setEditingPlan(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">اسم الباقة (عربي)</label>
                  <input value={editData.nameAr || ''} onChange={(e) => setEditData({ ...editData, nameAr: e.target.value })}
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">اسم الباقة (إنجليزي)</label>
                  <input value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">سعر شهري (ج.م)</label>
                  <input type="number" value={editData.priceMonthly ?? 0} onChange={(e) => setEditData({ ...editData, priceMonthly: Number(e.target.value) })}
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">سعر سنوي (ج.م)</label>
                  <input type="number" value={editData.priceYearly ?? 0} onChange={(e) => setEditData({ ...editData, priceYearly: Number(e.target.value) })}
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">خصم سنوي (%)</label>
                  <input type="number" value={editData.yearlyDiscount ?? 0} onChange={(e) => setEditData({ ...editData, yearlyDiscount: Number(e.target.value) })}
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">عدد المستخدمين</label>
                  <input type="number" value={editData.maxUsers ?? 1} onChange={(e) => setEditData({ ...editData, maxUsers: Number(e.target.value) })}
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">المساحة التخزينية</label>
                  <input value={editData.maxStorage || ''} onChange={(e) => setEditData({ ...editData, maxStorage: e.target.value })}
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">الوصف (عربي)</label>
                <input value={editData.descriptionAr || ''} onChange={(e) => setEditData({ ...editData, descriptionAr: e.target.value })}
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
              </div>

              {/* Features Toggle */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-2">الميزات</label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 rounded-xl border border-gray-100 dark:border-slate-800">
                  {ALL_FEATURES.map((f) => (
                    <button key={f.key} onClick={() => toggleFeature(f.key)}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-all ${
                        editFeatures[f.key] ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'
                      }`}>
                      {editFeatures[f.key] ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{f.labelAr}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">الأكثر طلباً</label>
                <button onClick={() => setEditData({ ...editData, popular: !editData.popular })}
                  className={`w-10 h-5 rounded-full transition-all ${editData.popular ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all ${editData.popular ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditingPlan(null)}
                  className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                  إلغاء
                </button>
                <button onClick={saveEdit}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-1.5">
                  <Save className="h-4 w-4" /> حفظ التغييرات
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Plan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" /> إضافة باقة جديدة
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">اسم الباقة (عربي) *</label>
                  <input value={newPlan.nameAr} onChange={(e) => setNewPlan({ ...newPlan, nameAr: e.target.value })} placeholder="باقة Premium"
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">اسم الباقة (إنجليزي) *</label>
                  <input value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} placeholder="Premium"
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">سعر شهري *</label>
                  <input type="number" value={newPlan.priceMonthly || ''} onChange={(e) => setNewPlan({ ...newPlan, priceMonthly: Number(e.target.value) })} placeholder="0"
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">سعر سنوي</label>
                  <input type="number" value={newPlan.priceYearly || ''} onChange={(e) => setNewPlan({ ...newPlan, priceYearly: Number(e.target.value) })} placeholder="0"
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">خصم سنوي %</label>
                  <input type="number" value={newPlan.yearlyDiscount || ''} onChange={(e) => setNewPlan({ ...newPlan, yearlyDiscount: Number(e.target.value) })} placeholder="0"
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">المستخدمين</label>
                  <input type="number" value={newPlan.maxUsers} onChange={(e) => setNewPlan({ ...newPlan, maxUsers: Number(e.target.value) })}
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">التخزين</label>
                  <input value={newPlan.maxStorage} onChange={(e) => setNewPlan({ ...newPlan, maxStorage: e.target.value })} placeholder="10 GB"
                    className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">الوصف (عربي)</label>
                <input value={newPlan.descriptionAr} onChange={(e) => setNewPlan({ ...newPlan, descriptionAr: e.target.value })} placeholder="وصف الباقة..."
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3" />
              </div>

              {/* Features */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-2">الميزات</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl border border-gray-100 dark:border-slate-800">
                  {ALL_FEATURES.map((f) => (
                    <button key={f.key} onClick={() => toggleNewFeature(f.key)}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-all ${
                        newPlan.features.includes(f.key) ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300' : 'bg-gray-50 dark:bg-slate-800 text-gray-400'
                      }`}>
                      {newPlan.features.includes(f.key) ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{f.labelAr}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">الأكثر طلباً</label>
                <button onClick={() => setNewPlan({ ...newPlan, popular: !newPlan.popular })}
                  className={`w-10 h-5 rounded-full transition-all ${newPlan.popular ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all ${newPlan.popular ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                  إلغاء
                </button>
                <button onClick={handleAddPlan}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-1.5">
                  <Plus className="h-4 w-4" /> إضافة الباقة
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Feature Comparison Matrix */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-0 shadow-lg dark:shadow-black/20 overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">جدول مقارنة الميزات</h3>
            <p className="text-[10px] text-gray-500">جميع الميزات المتاحة في كل باقة</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                  <th className="text-right px-4 py-3 text-[10px] font-medium text-gray-500 min-w-[180px]">الميزة</th>
                  {plans.map((p) => (
                    <th key={p.id} className="text-center px-4 py-3 text-[10px] font-medium min-w-[100px]">
                      <span className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${p.color} text-white text-[9px]`}>{p.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {features.map((f) => (
                  <tr key={f.key} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${
                          f.category === 'pos' ? 'bg-emerald-500' : f.category === 'inventory' ? 'bg-blue-500' :
                          f.category === 'accounting' ? 'bg-purple-500' : f.category === 'delivery' ? 'bg-amber-500' :
                          f.category === 'ai' ? 'bg-cyan-500' : f.category === 'integrations' ? 'bg-rose-500' : 'bg-gray-500'
                        }`} />
                        <span className="text-xs text-gray-700 dark:text-gray-300">{f.labelAr}</span>
                      </div>
                    </td>
                    {plans.map((p) => (
                      <td key={p.id} className="text-center px-4 py-2.5">
                        {p.features.includes(f.key) ? (
                          <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
