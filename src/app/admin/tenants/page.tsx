'use client';

import { useState } from 'react';
import { useSubscriptionStore, type SubscriptionPlan } from '@/lib/store/subscription-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Search, Check, X, Clock,
  AlertTriangle, RefreshCw, MessageCircle, Mail, Shield,
  CreditCard, Users, HardDrive, CalendarDays, ChevronDown, ChevronUp, Phone, Globe
} from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { triggerSubscriptionSync } from '@/lib/services/subscription-sync';
import toast from 'react-hot-toast';

const planColors: Record<string, string> = {
  starter: 'from-slate-500 to-gray-600',
  professional: 'from-emerald-500 to-green-600',
  enterprise: 'from-purple-500 to-violet-600',
};

export default function TenantsPage() {
  const { plans, tenantPlans, renewTenantPlan, cancelTenantPlan, getDaysRemaining, isExpired } = useSubscriptionStore();
  const { user } = useAuthStore();
  const { branding } = useBrandingStore();
  const developerWhatsApp = branding.developerWhatsApp?.replace(/[^0-9]/g, '') || '201061935361';
  const managerWhatsApp = branding.whatsapp?.replace(/[^0-9]/g, '') || '';
  const managerName = branding.managerName || 'مدير السوبر ماركت';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [renewModal, setRenewModal] = useState<string | null>(null);
  const [renewPeriod, setRenewPeriod] = useState<'month' | 'year'>('month');
  const [renewPlan, setRenewPlan] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const allTenants = tenantPlans.map((tp) => {
    const plan = plans.find((p) => p.id === tp.planId);
    const days = getDaysRemaining(tp.tenantId);
    const expired = isExpired(tp.tenantId);
    const status = expired ? 'expired' : tp.status;
    return {
      id: tp.tenantId,
      name: tp.tenantId === 'manager@sapkey.com' ? 'السوبر ماركت الذكي' : tp.tenantId === 'admin@sapkey.com' ? 'SAPKEY SOLUTIONS' : tp.tenantId,
      email: tp.tenantId === 'manager@sapkey.com' ? 'manager@sapkey.com' : tp.tenantId === 'admin@sapkey.com' ? 'admin@sapkey.com' : `${tp.tenantId}@tenant.com`,
      planId: tp.planId,
      planName: plan?.nameAr || tp.planId,
      status,
      daysRemaining: days,
      endDate: tp.endDate,
      users: plan?.maxUsers || 0,
      storage: plan?.maxStorage || '0 GB',
    };
  }).filter((t) => {
    const matchesSearch = !search || t.name.includes(search) || t.email.includes(search);
    const matchesStatus = !statusFilter || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRenew = async (tenantId: string) => {
    const planId = renewPlan || tenantPlans.find((tp) => tp.tenantId === tenantId)?.planId || 'professional';
    const days = renewPeriod === 'year' ? 365 : 30;
    renewTenantPlan(tenantId, planId, days);
    await triggerSubscriptionSync();
    setRenewModal(null);
    toast.success(`تم تجديد الباقة لمدة ${renewPeriod === 'year' ? 'سنة' : 'شهر'}`);
  };

  const handleSendWhatsApp = (tenant: any) => {
    const msg = encodeURIComponent(
      `📋 إشعار مستأجر — SAPKEY\n\n` +
      `📤 من: ${managerName} (${managerWhatsApp})\n` +
      `📥 إلى: رقم المطور (${developerWhatsApp})\n\n` +
      `المستأجر: ${tenant.id}\n` +
      `الباقة: ${tenant.planName}\n` +
      `الحالة: ${tenant.status === 'expired' ? 'منتهية' : tenant.status === 'active' ? 'نشطة' : 'ملغية'}\n` +
      `الأيام المتبقية: ${tenant.daysRemaining}\n` +
      `تاريخ الانتهاء: ${new Date(tenant.endDate).toLocaleDateString('ar-EG')}`
    );
    window.open(`https://wa.me/${developerWhatsApp}?text=${msg}`, '_blank');
  };

  const handleSendEmail = (tenant: any) => {
    const subject = encodeURIComponent('إشعار تجديد باقة الاشتراك — SAPKEY');
    const body = encodeURIComponent(
      `مرحباً،\n\n` +
      `📤 من: ${managerName} (${managerWhatsApp})\n\n` +
      `نود إشعارك بأن باقة الاشتراك الخاصة بك ${
        tenant.status === 'expired' ? 'قد انتهت' : 'ستنتهي قريباً'
      }.\n\n` +
      `رقم المستأجر: ${tenant.id}\n` +
      `الباقة: ${tenant.planName}\n` +
      `الأيام المتبقية: ${tenant.daysRemaining}\n` +
      `تاريخ الانتهاء: ${new Date(tenant.endDate).toLocaleDateString('ar-EG')}\n\n` +
      `يرجى التواصل مع فريق الدعم لتجديد الاشتراك.\n` +
      `شكراً،\n${managerName}\nفريق SAPKEY SOLUTIONS`
    );
    window.open(`mailto:admin@sapkey.com?subject=${subject}&body=${body}`, '_blank');
  };

  const statusLabel = (s: string) => s === 'active' ? 'نشط' : s === 'expired' ? 'منتهي' : 'ملغي';
  const statusColor = (s: string) => s === 'active' ? 'bg-emerald-500' : s === 'expired' ? 'bg-red-500' : 'bg-gray-400';

  return (
    <div dir="rtl" className="space-y-5 md:space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">إدارة المستأجرين</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">إدارة الباقات والتجديد — متاح للمطور فقط</p>
          </div>
        </div>
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-0 text-[10px]">
          {allTenants.length} مستأجر
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'نشط', count: allTenants.filter((t) => t.status === 'active').length, icon: Check, color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
          { label: 'قريب من الانتهاء', count: allTenants.filter((t) => t.daysRemaining > 0 && t.daysRemaining <= 3).length, icon: Clock, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
          { label: 'منتهي', count: allTenants.filter((t) => t.status === 'expired').length, icon: AlertTriangle, color: 'from-red-500 to-rose-600', bg: 'bg-red-50 dark:bg-red-950/20' },
          { label: 'إجمالي الباقات', count: plans.length, icon: CreditCard, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50 dark:bg-purple-950/20' },
        ].map((s) => (
          <Card key={s.label} className={`border-0 ${s.bg} shadow-lg`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <s.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="بحث عن مستأجر..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pr-10 pl-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:text-white" />
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { key: null, label: 'الكل' },
            { key: 'active', label: 'النشط' },
            { key: 'expired', label: 'المنتهي' },
            { key: 'cancelled', label: 'ملغي' },
          ].map((opt) => (
            <button key={opt.key || 'all'} onClick={() => setStatusFilter(opt.key)}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${statusFilter === opt.key ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Security Note */}
      <Card className="border-0 bg-amber-50 dark:bg-amber-950/20 shadow-lg">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            هذه الصفحة متاحة للمطور فقط. لا يمكن للمدير (صاحب السوبر ماركت) الوصول إلى هذه الصفحة أو إدارة الباقات.
            التجديد يتم حصراً من خلال حساب المطور.
          </p>
        </CardContent>
      </Card>

      {/* ═══════════ MOBILE: Card View ═══════════ */}
      <div className="md:hidden space-y-3">
        {allTenants.map((tenant) => {
          const isExpiring = tenant.daysRemaining > 0 && tenant.daysRemaining <= 3;
          return (
            <Card key={tenant.id} className={`border-0 shadow-lg overflow-hidden ${
              tenant.status === 'expired' ? 'bg-red-50/50 dark:bg-red-950/10' :
              isExpiring ? 'bg-amber-50/50 dark:bg-amber-950/10' :
              'bg-white dark:bg-slate-900'
            }`}>
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${planColors[tenant.planId] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{tenant.name}</p>
                      <p className="text-[10px] text-gray-400">{tenant.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${statusColor(tenant.status)}`} />
                    <span className="text-[10px] font-medium text-gray-500">{statusLabel(tenant.status)}</span>
                  </div>
                </div>

                {/* Plan Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-full bg-gradient-to-r ${planColors[tenant.planId] || 'from-gray-500 to-gray-600'} text-white text-[10px] font-bold`}>
                    {tenant.planName}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {tenant.users} مستخدم
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <HardDrive className="h-3 w-3" /> {tenant.storage}
                  </span>
                </div>

                {/* Days Remaining */}
                <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-white/50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-gray-500">الأيام المتبقية</span>
                  <span className={`text-sm font-bold ${
                    tenant.status === 'expired' ? 'text-red-500' :
                    isExpiring ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {tenant.status === 'expired' ? '—' : `${tenant.daysRemaining} يوم`}
                  </span>
                </div>

                {/* End Date */}
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-3">
                  <CalendarDays className="h-3 w-3" />
                  <span>ينتهي: {new Date(tenant.endDate).toLocaleDateString('ar-EG')}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button onClick={() => setRenewModal(tenant.id)}
                    className="flex-1 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> تجديد
                  </button>
                  <button onClick={() => handleSendWhatsApp(tenant)}
                    className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleSendEmail(tenant)}
                    className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center">
                    <Mail className="h-4 w-4" />
                  </button>
                </div>

                {/* Expand Details */}
                <button onClick={() => setExpandedCard(expandedCard === tenant.id ? null : tenant.id)}
                  className="w-full flex items-center justify-center gap-1 mt-3 py-1.5 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  {expandedCard === tenant.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {expandedCard === tenant.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                </button>

                {expandedCard === tenant.id && (
                  <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">المعرف</span>
                      <span className="text-gray-900 dark:text-white font-mono text-[10px]">{tenant.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">البريد</span>
                      <span className="text-gray-900 dark:text-white">{tenant.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">تاريخ الانتهاء</span>
                      <span className="text-gray-900 dark:text-white">{new Date(tenant.endDate).toLocaleDateString('ar-EG')}</span>
                    </div>
                    {tenant.status !== 'expired' && (
                      <button onClick={() => { cancelTenantPlan(tenant.id); triggerSubscriptionSync(); toast.success('تم إلغاء الباقة'); }}
                        className="w-full h-8 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 text-xs font-medium flex items-center justify-center gap-1.5">
                        <X className="h-3.5 w-3.5" /> إلغاء الباقة
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ═══════════ DESKTOP: Table View ═══════════ */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <th className="text-right px-4 py-3 text-[10px] font-medium text-gray-500">المستأجر</th>
              <th className="text-right px-4 py-3 text-[10px] font-medium text-gray-500">الباقة</th>
              <th className="text-center px-4 py-3 text-[10px] font-medium text-gray-500">الحالة</th>
              <th className="text-center px-4 py-3 text-[10px] font-medium text-gray-500">الأيام المتبقية</th>
              <th className="text-center px-4 py-3 text-[10px] font-medium text-gray-500">تاريخ الانتهاء</th>
              <th className="text-left px-4 py-3 text-[10px] font-medium text-gray-500">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {allTenants.map((tenant) => {
              const isExpiring = tenant.daysRemaining > 0 && tenant.daysRemaining <= 3;
              return (
                <tr key={tenant.id}
                  className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${
                    tenant.status === 'expired' ? 'bg-red-50/30 dark:bg-red-950/10' :
                    isExpiring ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                  }`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{tenant.name}</p>
                      <p className="text-[9px] text-gray-400">{tenant.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${planColors[tenant.planId] || 'from-gray-500 to-gray-600'} text-white text-[9px] font-bold`}>
                      {tenant.planName}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${statusColor(tenant.status)}`} />
                      <span className="text-[10px] font-medium">{statusLabel(tenant.status)}</span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className={`text-xs font-bold tabular-nums ${
                      tenant.status === 'expired' ? 'text-red-500' :
                      isExpiring ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {tenant.status === 'expired' ? '—' : `${tenant.daysRemaining} يوم`}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3 text-xs text-gray-500 tabular-nums">
                    {new Date(tenant.endDate).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setRenewModal(tenant.id)}
                        className="h-7 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-[10px] font-medium transition-all flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> تجديد
                      </button>
                      <button onClick={() => handleSendWhatsApp(tenant)}
                        className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center"
                        title="إرسال واتساب">
                        <MessageCircle className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleSendEmail(tenant)}
                        className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center"
                        title="إرسال بريد">
                        <Mail className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Renew Modal */}
      {renewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setRenewModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">تجديد الباقة</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">اختر الباقة</label>
                <select value={renewPlan} onChange={(e) => setRenewPlan(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-3 dark:text-white">
                  <option value="">نفس الباقة الحالية</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.nameAr} — {p.priceMonthly} ج.م/شهر</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">مدة التجديد</label>
                <div className="flex gap-2">
                  {[
                    { key: 'month' as const, label: 'شهر' },
                    { key: 'year' as const, label: 'سنة' },
                  ].map((opt) => (
                    <button key={opt.key} onClick={() => setRenewPeriod(opt.key)}
                      className={`flex-1 h-10 rounded-xl text-sm font-medium transition-all ${
                        renewPeriod === opt.key ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs">
                <RefreshCw className="h-4 w-4 shrink-0" />
                <span>سيتم تفعيل الباقة فوراً لمدة {renewPeriod === 'year' ? 'سنة' : 'شهر'}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRenewModal(null)}
                  className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                  إلغاء
                </button>
                <button onClick={() => handleRenew(renewModal)}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium shadow-lg hover:shadow-xl transition-all">
                  تجديد الباقة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
