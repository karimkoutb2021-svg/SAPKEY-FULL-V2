'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';

const _supabase = typeof window !== 'undefined' ? createClient() : null;

export interface BrandingConfig {
  storeName: string;
  storeNameEn: string;
  slogan: string;
  logo: string;
  favicon: string;
  appIcon: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  headerBg: string;
  headerText: string;
  sidebarBg: string;
  sidebarText: string;
  sidebarActiveBg: string;
  footer: string;
  address: string;
  phone: string;
  whatsapp: string;
  taxNumber: string;
  developerWhatsApp: string;
  managerName: string;
  adminAccessCode: string;
  guidesAccessCode: string;
  taxRate: number;
  footerConfig: FooterConfig;
  footerLinks: FooterLink[];
  tickerActive: boolean;
  tickerText: string;
  tickerColor: string;
  heroBannerImages: string[];
  heroBannerTitle: string;
  heroBannerSubtitle: string;
  topBannerActive: boolean;
  topBannerText: string;
  ctaBannerImages: string[];
  coupons: any[];
  pushNotificationOffers: string[];
  lowStockThreshold: number;
  lowStockEnabled: boolean;
}

export interface FooterSection {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
}

export interface FooterLink {
  id: string;
  sectionId: string;
  label: string;
  href: string;
  description: string;
  content?: string; // Add support for dynamic page content
}

export interface FooterConfig {
  sections: FooterSection[];
  links: FooterLink[];
}

export interface SystemBranding {
  systemName: string;
  systemNameEn: string;
  systemSlogan: string;
  systemLogo: string;
  systemDescription: string;
  systemPrimaryColor: string;
  systemVersion: string;
  systemFeatures: string[];
  developerName: string;
  developerEmail: string;
  developerWebsite: string;
  developerGitHub: string;
}

export const DEFAULT_SYSTEM_BRANDING: SystemBranding = {
  systemName: 'SAPKEY SOLUTIONS',
  systemNameEn: 'SAPKEY ERP',
  systemSlogan: 'حلول ذكية للتجزئة الحديثة',
  systemLogo: '',
  systemDescription: 'منصة ERP متكاملة لإدارة السوبر ماركت تشمل نقطة البيع، المخزون، المحاسبة، التوصيل، والذكاء الاصطناعي',
  systemPrimaryColor: '#0071E3',
  systemVersion: '2.0.0',
  systemFeatures: [
    'نقطة بيع سريعة',
    'إدارة المخزون',
    'محاسبة مالية',
    'نظام توصيل',
    'ذكاء اصطناعي',
    'تطبيق PWA',
    'واتساب',
    'صلاحيات متعددة',
  ],
  developerName: 'SAPKEY SOLUTIONS',
  developerEmail: 'admin@sapkey.com',
  developerWebsite: 'https://sapkey.com',
  developerGitHub: 'https://github.com/sapkey',
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  sections: [
    { id: 'store', name: 'المتجر', nameEn: 'Store', icon: 'Truck', description: 'تصفح المنتجات والعروض' },
    { id: 'support', name: 'خدمة العملاء', nameEn: 'Support', icon: 'Headphones', description: 'نحن هنا لمساعدتك' },
    { id: 'account', name: 'حسابك', nameEn: 'Account', icon: 'Settings', description: 'إدارة حسابك وطلباتك' },
    { id: 'system', name: 'النظام', nameEn: 'System', icon: 'Store', description: 'معلومات عن المنصة' },
    { id: 'guides', name: 'الدليل المساعد', nameEn: 'Guides', icon: 'BookOpen', description: 'أدلة الاستخدام' },
  ],
  links: [],
};

export const DEFAULT_BRANDING: BrandingConfig = {
  storeName: 'SAPKEY SMART GRO',
  storeNameEn: 'SAPKEY SMART GRO',
  slogan: 'السوبر ماركت الذكي',
  logo: '/logo.jpg',
  favicon: '/favicon.ico',
  appIcon: '/logo.jpg',
  primaryColor: '#22C55E',
  secondaryColor: '#16A34A',
  backgroundColor: '#FFFFFF',
  textColor: '#111827',
  headerBg: '#FFFFFF',
  headerText: '#111827',
  sidebarBg: '#FFFFFF',
  sidebarText: '#6B7280',
  sidebarActiveBg: '#22C55E15',
  footer: 'جميع الحقوق محفوظة © 2026 سوبر ماركت',
  address: 'القاهرة، مصر',
  phone: '0100XXXXXXX',
  whatsapp: '2010XXXXXXX',
  taxNumber: '300XXXXXXX',
  developerWhatsApp: '201061935361',
  managerName: 'كريم قطب',
  adminAccessCode: '202020',
  guidesAccessCode: '101010',
  taxRate: 14,
  footerConfig: DEFAULT_FOOTER_CONFIG,
  heroBannerImages: [
    '/premium_produce_banner_1779831574099.png',
    '/premium_bakery_banner_1779831591927.png'
  ],
  heroBannerTitle: 'مرحباً بك في SAPKEY SMART GRO',
  heroBannerSubtitle: 'اكتشف أحدث العروض والمنتجات المميزة',
  topBannerActive: true,
  topBannerText: 'شحن مجاني للطلبات فوق 500 جنيه! 🚀 | خصم 20% على الدواجن الطازجة 🔥 | عروض نهاية الأسبوع على المشروبات 🥤 | اشتر 2 واحصل على 1 مجاناً من الألبان 🥛 | تخفيضات كبرى على المعلبات 🎉',
  ctaBannerImages: [
    '/supermarket_hero_banner_1779831187973.png',
    '/smart_supermarket_hero_video_frame_1779867444638.png'
  ],
  coupons: [],
  pushNotificationOffers: [
    'عرض حصري 🌟 خصم 20% على قسم اللحوم!',
    'تخفيضات نهاية الأسبوع 🔥 شحن مجاني للطلبات فوق 500 جنيه',
    'اشتر 2 واحصل على 1 مجاناً من الألبان 🥛',
    'عرض اليوم ⚡ خصم 30% على الفواكه الطازجة',
    'سارع بالطلب 🏃 عروض المنظفات لفترة محدودة',
  ],
  lowStockThreshold: 5,
  lowStockEnabled: true,
  footerLinks: [
    { id: '1', sectionId: 'store', label: 'جميع المنتجات', href: '/shop', description: '' },
    { id: '2', sectionId: 'store', label: 'العروض والخصومات', href: '/offers', description: '' },
    { id: '3', sectionId: 'store', label: 'الأكثر مبيعاً', href: '/shop?sort=bestselling', description: '' },
    { id: '4', sectionId: 'store', label: 'وصل حديثاً', href: '/shop?sort=newest', description: '' },
    { id: '5', sectionId: 'support', label: 'تتبع الطلب', href: '/tracking', description: '' },
    { id: '6', sectionId: 'support', label: 'الأسئلة الشائعة', href: '/faq', description: '' },
    { id: '7', sectionId: 'support', label: 'سياسة الإرجاع', href: '/returns', description: '' },
    { id: '8', sectionId: 'support', label: 'اتصل بنا', href: '/contact', description: '' },
    { id: '9', sectionId: 'account', label: 'الملف الشخصي', href: '/customer', description: '' },
    { id: '10', sectionId: 'account', label: 'المحفظة', href: '/wallet', description: '' },
    { id: '11', sectionId: 'account', label: 'طلباتي', href: '/orders', description: '' },
    { id: '12', sectionId: 'account', label: 'نقاط الولاء', href: '/loyalty', description: '' },
    { id: '13', sectionId: 'system', label: 'بورتفوليو النظام', href: '/portfolio', description: '' },
    { id: '14', sectionId: 'system', label: 'الهوية البصرية', href: '/system-identity', description: '' },
    { id: '15', sectionId: 'system', label: 'سياسة الخصوصية', href: '/privacy', description: '' },
    { id: '16', sectionId: 'system', label: 'الشروط والأحكام', href: '/terms', description: '' },
    { id: '17', sectionId: 'system', label: 'من نحن', href: '/about', description: '' },
    { id: '18', sectionId: 'system', label: 'الوظائف', href: '/careers', description: '' },
    { id: '19', sectionId: 'guides', label: 'دليل الكاشير', href: '/guides/cashier', description: '' },
    { id: '20', sectionId: 'guides', label: 'دليل العميل', href: '/guides/customer', description: '' },
    { id: '21', sectionId: 'guides', label: 'دليل المدير', href: '/guides/manager', description: '' },
  ],
  tickerActive: true,
  tickerText: 'شحن مجاني للطلبات فوق 500 جنيه! 🚀 | خصم 20% على الدواجن الطازجة 🔥 | عروض نهاية الأسبوع على المشروبات 🥤 | اشتر 2 واحصل على 1 مجاناً من الألبان 🥛 | تخفيضات كبرى على المعلبات 🎉',
  tickerColor: '#ef4444',
};

async function saveToSupabase(key: string, value: any) {
  try {
    const res = await fetch('/api/branding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error('Failed to save');
  } catch {
    try {
      const queue = JSON.parse(localStorage.getItem('branding_sync_queue') || '[]');
      queue.push({ key, value, ts: Date.now() });
      localStorage.setItem('branding_sync_queue', JSON.stringify(queue));
    } catch {}
  }
}

async function loadFromSupabase(): Promise<Partial<BrandingConfig>> {
  try {
    const res = await fetch('/api/branding');
    if (!res.ok) return {};
    const data = await res.json();
    return data || {};
  } catch {
    return {};
  }
}

export async function syncBrandingQueue() {
  try {
    const queue = JSON.parse(localStorage.getItem('branding_sync_queue') || '[]');
    if (queue.length === 0) return;
    for (const item of queue) {
      await saveToSupabase(item.key, item.value);
    }
    localStorage.removeItem('branding_sync_queue');
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { syncBrandingQueue(); });
}

interface BrandingState {
  branding: BrandingConfig;
  systemBranding: SystemBranding;
  updateBranding: (partial: Partial<BrandingConfig>) => void;
  updateSystemBranding: (partial: Partial<SystemBranding>) => void;
  resetBranding: () => void;
  resetSystemBranding: () => void;
  getCSSVariables: () => Record<string, string>;
  loadFromSupabase: () => Promise<void>;
  subscribeToChanges: () => () => void;
  addFooterLink: (link: FooterLink) => void;
  updateFooterLink: (id: string, partial: Partial<FooterLink>) => void;
  removeFooterLink: (id: string) => void;
  updateFooterSection: (id: string, partial: Partial<FooterSection>) => void;
  addFooterSection: (section: FooterSection) => void;
  removeFooterSection: (id: string) => void;
  addCoupon: (coupon: any) => void;
  removeCoupon: (id: string) => void;
  updateCoupon: (id: string, updates: any) => void;
}

export const useBrandingStore = create<BrandingState>()(
  persist(
    (set, get) => ({
      branding: DEFAULT_BRANDING,
      systemBranding: DEFAULT_SYSTEM_BRANDING,

      updateBranding: (partial) => {
        set((state) => ({
          branding: { ...state.branding, ...partial },
        }));
        for (const [key, value] of Object.entries(partial)) {
          saveToSupabase(key, value);
        }
      },

      updateSystemBranding: (partial) => {
        set((state) => ({
          systemBranding: { ...state.systemBranding, ...partial },
        }));
        for (const [key, value] of Object.entries(partial)) {
          saveToSupabase(`system_${key}`, value);
        }
      },

      resetBranding: () => set({ branding: DEFAULT_BRANDING }),
      resetSystemBranding: () => set({ systemBranding: DEFAULT_SYSTEM_BRANDING }),

      getCSSVariables: () => {
        const b = get().branding;
        return {
          '--brand-primary': b.primaryColor,
          '--brand-secondary': b.secondaryColor,
          '--brand-bg': b.backgroundColor,
          '--brand-text': b.textColor,
          '--brand-header-bg': b.headerBg,
          '--brand-header-text': b.headerText,
          '--brand-sidebar-bg': b.sidebarBg,
          '--brand-sidebar-text': b.sidebarText,
          '--brand-sidebar-active': b.sidebarActiveBg,
        };
      },

      loadFromSupabase: async () => {
        const remote = await loadFromSupabase();
        if (Object.keys(remote).length > 0) {
          set((state) => ({
            branding: { ...state.branding, ...remote },
          }));
        }
        await syncBrandingQueue();
      },

      subscribeToChanges: () => {
        let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
        try {
          if (!_supabase) return () => {};
          channel = _supabase.channel('branding-store-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'branding_settings' }, async () => {
              const remote = await loadFromSupabase();
              if (Object.keys(remote).length > 0) {
                set((state) => ({ branding: { ...state.branding, ...remote } }));
              }
            })
            .subscribe();
        } catch {}
        return () => {
          if (channel && _supabase) {
            try {
              _supabase.removeChannel(channel);
            } catch {}
          }
        };
      },

      addFooterLink: (link) => {
        set((state) => ({
          branding: {
            ...state.branding,
            footerLinks: [...state.branding.footerLinks, link],
          },
        }));
      },

      updateFooterLink: (id, partial) => {
        set((state) => ({
          branding: {
            ...state.branding,
            footerLinks: state.branding.footerLinks.map((l) =>
              l.id === id ? { ...l, ...partial } : l
            ),
          },
        }));
      },

      removeFooterLink: (id) => {
        set((state) => ({
          branding: {
            ...state.branding,
            footerLinks: state.branding.footerLinks.filter((l) => l.id !== id),
          },
        }));
      },

      updateFooterSection: (id, partial) => {
        set((state) => ({
          branding: {
            ...state.branding,
            footerConfig: {
              ...state.branding.footerConfig,
              sections: state.branding.footerConfig.sections.map((s) =>
                s.id === id ? { ...s, ...partial } : s
              ),
            },
          },
        }));
      },

      addFooterSection: (section) => {
        set((state) => ({
          branding: {
            ...state.branding,
            footerConfig: {
              ...state.branding.footerConfig,
              sections: [...state.branding.footerConfig.sections, section],
            },
          },
        }));
      },

      removeFooterSection: (id) => {
        set((state) => ({
          branding: {
            ...state.branding,
            footerConfig: {
              ...state.branding.footerConfig,
              sections: state.branding.footerConfig.sections.filter((s) => s.id !== id),
              links: state.branding.footerConfig.links.filter((l) => l.sectionId !== id),
            },
            footerLinks: state.branding.footerLinks.filter((l) => l.sectionId !== id),
          },
        }));
      },

      addCoupon: (coupon) => {
        set((state) => ({
          branding: {
            ...state.branding,
            coupons: [...state.branding.coupons, coupon],
          },
        }));
        saveToSupabase('coupons', [...get().branding.coupons]);
      },

      removeCoupon: (id) => {
        set((state) => ({
          branding: {
            ...state.branding,
            coupons: state.branding.coupons.filter((c: any) => c.id !== id),
          },
        }));
        saveToSupabase('coupons', [...get().branding.coupons]);
      },

      updateCoupon: (id, updates) => {
        set((state) => ({
          branding: {
            ...state.branding,
            coupons: state.branding.coupons.map((c: any) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          },
        }));
        saveToSupabase('coupons', [...get().branding.coupons]);
      },
    }),
    { name: 'branding-config' }
  )
);
