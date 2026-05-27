'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlanFeature {
  key: string;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  category: 'pos' | 'inventory' | 'accounting' | 'delivery' | 'ai' | 'integrations' | 'advanced';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameAr: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxUsers: number;
  maxStorage: string;
  features: string[];
  popular: boolean;
  color: string;
  description: string;
  descriptionAr: string;
  yearlyDiscount: number;
}

export interface TenantPlan {
  tenantId: string;
  planId: string;
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  startDate: number;
  endDate: number;
  customFeatures: string[];
  disabledFeatures: string[];
  lastExpiryNotified?: number;
  expiryNotifiedAt?: number;
}

export const ALL_FEATURES: PlanFeature[] = [
  { key: 'pos_basic', label: 'Basic POS', labelAr: 'نقطة بيع أساسية', description: 'Cash sales and receipts', descriptionAr: 'مبيعات نقدية وفواتير', category: 'pos' },
  { key: 'pos_advanced', label: 'Advanced POS', labelAr: 'نقطة بيع متقدمة', description: 'Multi-payment, discounts, refunds', descriptionAr: 'دفعات متعددة، خصومات، مرتجعات', category: 'pos' },
  { key: 'pos_barcode', label: 'Barcode Scanning', labelAr: 'مسح الباركود', description: 'Camera and hardware barcode scanning', descriptionAr: 'مسح الباركود بالكاميرا والسكانر', category: 'pos' },
  { key: 'pos_offline', label: 'Offline Mode', labelAr: 'وضع عدم الاتصال', description: 'Work without internet', descriptionAr: 'العمل بدون إنترنت', category: 'pos' },
  { key: 'products_unlimited', label: 'Unlimited Products', labelAr: 'منتجات غير محدودة', description: 'Add unlimited products', descriptionAr: 'إضافة منتجات غير محدودة', category: 'inventory' },
  { key: 'inventory_basic', label: 'Basic Inventory', labelAr: 'مخزون أساسي', description: 'Stock tracking and alerts', descriptionAr: 'تتبع المخزون والتنبيهات', category: 'inventory' },
  { key: 'inventory_advanced', label: 'Advanced Inventory', labelAr: 'مخزون متقدم', description: 'Batches, expiry, transfers', descriptionAr: 'دفعات، صلاحية، تحويلات', category: 'inventory' },
  { key: 'inventory_multi_warehouse', label: 'Multi-Warehouse', labelAr: 'مستودعات متعددة', description: 'Manage multiple warehouses', descriptionAr: 'إدارة أكثر من مستودع', category: 'inventory' },
  { key: 'accounting_basic', label: 'Basic Accounting', labelAr: 'محاسبة أساسية', description: 'Expenses and basic reports', descriptionAr: 'مصروفات وتقارير أساسية', category: 'accounting' },
  { key: 'accounting_advanced', label: 'Full Accounting', labelAr: 'محاسبة متكاملة', description: 'Journal, P&L, balance sheet, payroll', descriptionAr: 'يومية، أرباح وخسائر، ميزانية، رواتب', category: 'accounting' },
  { key: 'delivery_basic', label: 'Basic Delivery', labelAr: 'توصيل أساسي', description: 'Order delivery tracking', descriptionAr: 'تتبع توصيل الطلبات', category: 'delivery' },
  { key: 'delivery_live', label: 'Live Tracking', labelAr: 'تتبع مباشر', description: 'Real-time driver GPS tracking', descriptionAr: 'تتبع GPS فوري للمندوبين', category: 'delivery' },
  { key: 'ai_assistant', label: 'AI Assistant', labelAr: 'المساعد الذكي', description: 'AI-powered sales assistance', descriptionAr: 'مساعد مبيعات بالذكاء الاصطناعي', category: 'ai' },
  { key: 'ai_voice', label: 'Voice Ordering', labelAr: 'الطلب الصوتي', description: 'Voice-controlled order placement', descriptionAr: 'طلب بالأوامر الصوتية', category: 'ai' },
  { key: 'whatsapp_integration', label: 'WhatsApp Integration', labelAr: 'ربط واتساب', description: 'WhatsApp messaging and notifications', descriptionAr: 'رسائل واتساب وإشعارات', category: 'integrations' },
  { key: 'analytics_basic', label: 'Basic Analytics', labelAr: 'تحليلات أساسية', description: 'Sales reports and charts', descriptionAr: 'تقارير مبيعات ورسوم بيانية', category: 'advanced' },
  { key: 'analytics_advanced', label: 'Advanced Analytics', labelAr: 'تحليلات متقدمة', description: 'Custom reports, exports, insights', descriptionAr: 'تقارير مخصصة، تصدير، رؤى', category: 'advanced' },
  { key: 'loyalty_program', label: 'Loyalty Program', labelAr: 'برنامج الولاء', description: 'Points, rewards, member tiers', descriptionAr: 'نقاط، مكافآت، مستويات أعضاء', category: 'advanced' },
  { key: 'multi_branch', label: 'Multi-Branch', labelAr: 'فروع متعددة', description: 'Manage multiple store branches', descriptionAr: 'إدارة عدة فروع للمتجر', category: 'advanced' },
  { key: 'api_access', label: 'API Access', labelAr: 'API مخصص', description: 'Custom API integration endpoints', descriptionAr: 'API للتكامل المخصص', category: 'integrations' },
  { key: 'offers_coupons', label: 'Offers & Coupons', labelAr: 'عروض وكوبونات', description: 'Discount offers and coupon codes', descriptionAr: 'عروض تخفيض ورموز كوبون', category: 'advanced' },
  { key: 'employees_management', label: 'Employee Management', labelAr: 'إدارة الموظفين', description: 'Staff accounts, roles, performance', descriptionAr: 'حسابات موظفين، صلاحيات، أداء', category: 'advanced' },
  { key: 'suppliers_portal', label: 'Supplier Portal', labelAr: 'بوابة الموردين', description: 'Supplier self-service portal', descriptionAr: 'بوابة الخدمة الذاتية للموردين', category: 'integrations' },
];

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter', name: 'Starter', nameAr: 'باقة Starter',
    priceMonthly: 99, priceYearly: 999, yearlyDiscount: 16,
    currency: 'EGP', maxUsers: 2, maxStorage: '5 GB',
    popular: false, color: 'from-slate-500 to-gray-600',
    description: 'For small grocery stores getting started', descriptionAr: 'للمتاجر الصغيرة البادئة',
    features: ['pos_basic', 'products_unlimited', 'inventory_basic', 'analytics_basic'],
  },
  {
    id: 'professional', name: 'Professional', nameAr: 'باقة Professional',
    priceMonthly: 249, priceYearly: 2499, yearlyDiscount: 17,
    currency: 'EGP', maxUsers: 10, maxStorage: '25 GB',
    popular: true, color: 'from-emerald-500 to-green-600',
    description: 'For growing supermarkets', descriptionAr: 'للمتاجر المتنامية',
    features: [
      'pos_basic', 'pos_advanced', 'pos_barcode',
      'products_unlimited', 'inventory_basic', 'inventory_advanced',
      'accounting_basic', 'accounting_advanced',
      'analytics_basic', 'analytics_advanced',
      'delivery_basic', 'employees_management', 'offers_coupons',
      'ai_assistant', 'whatsapp_integration', 'loyalty_program',
    ],
  },
  {
    id: 'enterprise', name: 'Enterprise', nameAr: 'باقة المؤسسات',
    priceMonthly: 599, priceYearly: 5999, yearlyDiscount: 17,
    currency: 'EGP', maxUsers: 999, maxStorage: '100 GB',
    popular: false, color: 'from-purple-500 to-violet-600',
    description: 'For large chains and enterprises', descriptionAr: 'للشركات الكبيرة والسلاسل التجارية',
    features: [
      'pos_basic', 'pos_advanced', 'pos_barcode', 'pos_offline',
      'products_unlimited', 'inventory_basic', 'inventory_advanced', 'inventory_multi_warehouse',
      'accounting_basic', 'accounting_advanced',
      'analytics_basic', 'analytics_advanced',
      'delivery_basic', 'delivery_live',
      'employees_management', 'offers_coupons', 'loyalty_program', 'multi_branch',
      'ai_assistant', 'ai_voice',
      'whatsapp_integration', 'suppliers_portal', 'api_access',
    ],
  },
];

interface SubscriptionState {
  plans: SubscriptionPlan[];
  tenantPlans: TenantPlan[];
  features: PlanFeature[];
  _checkInterval: ReturnType<typeof setInterval> | null;
  setTenantPlan: (tenantId: string, planId: string) => void;
  renewTenantPlan: (tenantId: string, planId: string, durationDays?: number) => void;
  updateTenantFeatures: (tenantId: string, add: string[], remove: string[]) => void;
  cancelTenantPlan: (tenantId: string) => void;
  getTenantPlan: (tenantId: string) => { plan: SubscriptionPlan | undefined; assignment: TenantPlan | undefined };
  getPlanFeatures: (planId: string) => PlanFeature[];
  hasFeature: (tenantId: string, featureKey: string) => boolean;
  isExpired: (tenantId: string) => boolean;
  getDaysRemaining: (tenantId: string) => number;
  addPlan: (plan: SubscriptionPlan) => void;
  updatePlan: (planId: string, updates: Partial<SubscriptionPlan>) => void;
  checkExpiry: () => { expired: string[]; expiringSoon: string[]; justExpired: string[] };
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      plans: DEFAULT_PLANS,
      tenantPlans: [
        { tenantId: 'admin@sapkey.com', planId: 'enterprise', status: 'active', startDate: Date.now() - 86400000 * 30, endDate: Date.now() + 86400000 * 3650, customFeatures: [], disabledFeatures: [] },
        { tenantId: 'manager@sapkey.com', planId: 'enterprise', status: 'active', startDate: Date.now() - 86400000 * 30, endDate: Date.now() + 86400000 * 3650, customFeatures: [], disabledFeatures: [] },
        { tenantId: 'cashier@sapkey.com', planId: 'enterprise', status: 'active', startDate: Date.now() - 86400000 * 30, endDate: Date.now() + 86400000 * 3650, customFeatures: [], disabledFeatures: [] },
        { tenantId: 'customer@sapkey.com', planId: 'enterprise', status: 'active', startDate: Date.now() - 86400000 * 30, endDate: Date.now() + 86400000 * 3650, customFeatures: [], disabledFeatures: [] },
      ],
      features: ALL_FEATURES,
      _checkInterval: null,

      setTenantPlan: (tenantId, planId) => {
        const existing = get().tenantPlans.find((tp) => tp.tenantId === tenantId);
        const plan = get().plans.find((p) => p.id === planId);
        if (!plan) return;
        if (existing) {
          set({ tenantPlans: get().tenantPlans.map((tp) => tp.tenantId === tenantId ? { ...tp, planId, status: 'active', startDate: Date.now(), endDate: Date.now() + 86400000 * 30 } : tp) });
        } else {
          set({ tenantPlans: [...get().tenantPlans, { tenantId, planId, status: 'active', startDate: Date.now(), endDate: Date.now() + 86400000 * 30, customFeatures: [], disabledFeatures: [] }] });
        }
      },

      renewTenantPlan: (tenantId, planId, durationDays = 30) => {
        set({ tenantPlans: get().tenantPlans.map((tp) => tp.tenantId === tenantId ? { ...tp, planId, status: 'active', startDate: Date.now(), endDate: Date.now() + 86400000 * durationDays } : tp) });
      },

      updateTenantFeatures: (tenantId, add, remove) => {
        set({ tenantPlans: get().tenantPlans.map((tp) => tp.tenantId === tenantId ? { ...tp, customFeatures: [...tp.customFeatures.filter((f) => !remove.includes(f)), ...add], disabledFeatures: [...tp.disabledFeatures.filter((f) => !add.includes(f)), ...remove] } : tp) });
      },

      cancelTenantPlan: (tenantId) => {
        set({ tenantPlans: get().tenantPlans.map((tp) => tp.tenantId === tenantId ? { ...tp, status: 'cancelled' } : tp) });
      },

      getTenantPlan: (tenantId) => {
        const assignment = get().tenantPlans.find((tp) => tp.tenantId === tenantId);
        const plan = assignment ? get().plans.find((p) => p.id === assignment.planId) : undefined;
        return { plan, assignment };
      },

      getPlanFeatures: (planId) => {
        const plan = get().plans.find((p) => p.id === planId);
        if (!plan) return [];
        return get().features.filter((f) => plan.features.includes(f.key));
      },

      hasFeature: (tenantId, featureKey) => {
        const tp = get().tenantPlans.find((tp) => tp.tenantId === tenantId);
        if (!tp || tp.status === 'cancelled' || tp.status === 'expired') return false;
        if (Date.now() > tp.endDate) return false;
        if (tp.disabledFeatures.includes(featureKey)) return false;
        if (tp.customFeatures.includes(featureKey)) return true;
        const plan = get().plans.find((p) => p.id === tp.planId);
        return plan?.features.includes(featureKey) ?? false;
      },

      isExpired: (tenantId) => {
        const tp = get().tenantPlans.find((tp) => tp.tenantId === tenantId);
        if (!tp) return true;
        if (tp.status === 'expired' || tp.status === 'cancelled') return true;
        if (Date.now() > tp.endDate) return true;
        return false;
      },

      getDaysRemaining: (tenantId) => {
        const tp = get().tenantPlans.find((tp) => tp.tenantId === tenantId);
        if (!tp) return 0;
        return Math.max(0, Math.floor((tp.endDate - Date.now()) / 86400000));
      },

      addPlan: (plan) => set({ plans: [...get().plans, plan] }),
      updatePlan: (planId, updates) => set({ plans: get().plans.map((p) => p.id === planId ? { ...p, ...updates } : p) }),

      checkExpiry: () => {
        const now = Date.now();
        const expired: string[] = [];
        const expiringSoon: string[] = [];
        const justExpired: string[] = [];
        const threeDaysFromNow = now + 86400000 * 3;
        const updatedPlans = get().tenantPlans.map((tp) => {
          if (tp.status === 'active' && now > tp.endDate) {
            justExpired.push(tp.tenantId);
            return { ...tp, status: 'expired' as const };
          }
          if (tp.status === 'active' && tp.endDate <= threeDaysFromNow && tp.endDate > now) {
            expiringSoon.push(tp.tenantId);
          }
          if (tp.status === 'expired') {
            expired.push(tp.tenantId);
          }
          return tp;
        });
        if (justExpired.length > 0) {
          set({ tenantPlans: updatedPlans });
        }
        return { expired, expiringSoon, justExpired };
      },
    }),
    {
      name: 'subscription-store',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2 && persistedState?.plans) {
          persistedState.plans = persistedState.plans.map((p: any) => {
            if (p.priceMonthly !== undefined) return p;
            const monthly = p.price || 0;
            return {
              ...p,
              priceMonthly: monthly,
              priceYearly: Math.round(monthly * 12 * 0.83),
              yearlyDiscount: 17,
            };
          });
        }
        return persistedState;
      },
    }
  )
);
