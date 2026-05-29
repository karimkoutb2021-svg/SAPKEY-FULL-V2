'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { useSubscriptionStore } from '@/lib/store/subscription-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/layout/footer';
import {
  ShoppingCart, Package, Boxes, Users, Truck, Calculator, BarChart3,
  Settings, Shield, Zap, Star, MessageCircle, Wallet, Percent,
  Headphones, FileText, TrendingUp, Database, Palette, Mic,
  Download, Check, Store, CreditCard, Clock, Globe, Smartphone,
  Monitor, Tablet, Printer, QrCode, Receipt, TruckIcon, MapPin, Bell,
  Layers, ShieldCheck, Sparkles, ChevronDown, ChevronUp, ArrowLeft,
  ArrowRight, X, Loader2, Home, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface ModuleFeature {
  titleAr: string;
  descAr: string;
  icon: any;
  plans: ('basic' | 'pro' | 'enterprise')[];
}

interface ModuleCategory {
  id: string;
  titleAr: string;
  icon: any;
  color: string;
  features: ModuleFeature[];
}

const modules: ModuleCategory[] = [
  {
    id: 'pos',
    titleAr: 'نقطة البيع (POS)',
    icon: ShoppingCart,
    color: 'from-emerald-500 to-green-600',
    features: [
      { titleAr: 'بيع سريع', descAr: 'واجهة بيع سريعة مع دعم الماسح الضوئي', icon: ShoppingCart, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'فاتورة فورية', descAr: 'إنشاء وطباعة الفواتير فوراً', icon: Printer, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'دعم QR والباركود', descAr: 'مسح المنتجات بالكاميرا', icon: QrCode, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'دفع متعدد', descAr: 'نقداً، بطاقة، محفظة، آجل', icon: CreditCard, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'تعليق واستئناف', descAr: 'تعليق الفاتورة والعودة لها لاحقاً', icon: Clock, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'ضريبة قابلة للتعديل', descAr: 'نسبة ضريبة لكل عملية', icon: Percent, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'المرتجعات', descAr: 'إدارة مرتجعات المنتجات', icon: ArrowLeft, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'تقسيم الفاتورة', descAr: 'تقسيم الفاتورة على عدة طرق دفع', icon: CreditCard, plans: ['pro', 'enterprise'] },
    ],
  },
  {
    id: 'inventory',
    titleAr: 'إدارة المخزون',
    icon: Boxes,
    color: 'from-blue-500 to-indigo-600',
    features: [
      { titleAr: 'تتبع المخزون', descAr: 'مراقبة الكميات والتنبيه عند النفاد', icon: Package, plans: ['pro', 'enterprise'] },
      { titleAr: 'تواريخ الصلاحية', descAr: 'تتبع الصلاحية والتنبيه قبل الانتهاء', icon: Clock, plans: ['pro', 'enterprise'] },
      { titleAr: 'تحويل بين المخازن', descAr: 'نقل المنتجات بين المستودعات', icon: TruckIcon, plans: ['enterprise'] },
      { titleAr: 'الدفعات', descAr: 'تتبع دفعات الشراء وتكاليفها', icon: Layers, plans: ['enterprise'] },
      { titleAr: 'حركات المخزون', descAr: 'سجل كامل لكل حركة دخول وخروج', icon: FileText, plans: ['pro', 'enterprise'] },
      { titleAr: 'تقارير المخزون', descAr: 'تقارير شاملة عن حالة المخزون', icon: BarChart3, plans: ['pro', 'enterprise'] },
      { titleAr: 'جرد دوري', descAr: 'جرد فعلي للمخزون', icon: CheckCircle, plans: ['enterprise'] },
      { titleAr: 'تتبع الباتشات', descAr: 'إدارة صلاحية المنتجات بالدفعات', icon: Layers, plans: ['enterprise'] },
    ],
  },
  {
    id: 'accounting',
    titleAr: 'المحاسبة المالية',
    icon: Calculator,
    color: 'from-purple-500 to-violet-600',
    features: [
      { titleAr: 'شجرة الحسابات', descAr: 'هيكل محاسبي كامل', icon: Database, plans: ['pro', 'enterprise'] },
      { titleAr: 'اليومية العامة', descAr: 'تسجيل جميع القيود اليومية', icon: FileText, plans: ['pro', 'enterprise'] },
      { titleAr: 'المصروفات', descAr: 'تتبع وإدارة المصروفات', icon: TrendingUp, plans: ['pro', 'enterprise'] },
      { titleAr: 'الخزينة', descAr: 'إدارة النقدية والصندوق', icon: Wallet, plans: ['pro', 'enterprise'] },
      { titleAr: 'البنوك', descAr: 'إدارة الحسابات البنكية', icon: Globe, plans: ['enterprise'] },
      { titleAr: 'الأرباح والخسائر', descAr: 'تقرير الأداء المالي', icon: BarChart3, plans: ['pro', 'enterprise'] },
      { titleAr: 'الضرائب', descAr: 'حساب وإدارة الضرائب', icon: Percent, plans: ['enterprise'] },
      { titleAr: 'الرواتب', descAr: 'إدارة رواتب الموظفين', icon: Users, plans: ['enterprise'] },
      { titleAr: 'التسويات', descAr: 'تسوية الخزينة والمخزون', icon: ShieldCheck, plans: ['enterprise'] },
    ],
  },
  {
    id: 'customers',
    titleAr: 'إدارة العملاء',
    icon: Users,
    color: 'from-pink-500 to-rose-600',
    features: [
      { titleAr: 'ملفات العملاء', descAr: 'بيانات كاملة لكل عميل', icon: Users, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'نظام الولاء', descAr: 'نقاط ومكافآت للعملاء', icon: Star, plans: ['pro', 'enterprise'] },
      { titleAr: 'المحفظة', descAr: 'رصيد افتراضي للعملاء', icon: Wallet, plans: ['pro', 'enterprise'] },
      { titleAr: 'الكوبونات', descAr: 'أكواد خصم قابلة للتخصيص', icon: Percent, plans: ['enterprise'] },
      { titleAr: 'الطلب المسبق', descAr: 'طلب منتجات قبل الوصول', icon: Bell, plans: ['enterprise'] },
    ],
  },
  {
    id: 'delivery',
    titleAr: 'نظام التوصيل',
    icon: Truck,
    color: 'from-amber-500 to-orange-600',
    features: [
      { titleAr: 'تتبع السائقين', descAr: 'موقع السائقين مباشرة على الخريطة', icon: MapPin, plans: ['enterprise'] },
      { titleAr: 'إثبات التوصيل', descAr: 'صورة وتوقيع عند التسليم', icon: Check, plans: ['enterprise'] },
      { titleAr: 'حالة الطلب', descAr: 'تحديث حالة الطلب لحظة بلحظة', icon: Bell, plans: ['enterprise'] },
      { titleAr: 'تسعير التوصيل', descAr: 'حساب تكلفة التوصيل تلقائياً', icon: Calculator, plans: ['enterprise'] },
    ],
  },
  {
    id: 'ai',
    titleAr: 'الذكاء الاصطناعي',
    icon: Star,
    color: 'from-cyan-500 to-teal-600',
    features: [
      { titleAr: 'مساعد صوتي', descAr: 'التحكم بالأوامر الصوتية', icon: Mic, plans: ['enterprise'] },
      { titleAr: 'تحليلات تنبؤية', descAr: 'توقعات المبيعات والطلب', icon: TrendingUp, plans: ['enterprise'] },
      { titleAr: 'OCR', descAr: 'قراءة الفواتير والمستندات تلقائياً', icon: FileText, plans: ['enterprise'] },
      { titleAr: 'تقارير BI', descAr: 'ذكاء أعمال متقدم', icon: BarChart3, plans: ['enterprise'] },
    ],
  },
  {
    id: 'integrations',
    titleAr: 'التكاملات',
    icon: Zap,
    color: 'from-slate-500 to-gray-600',
    features: [
      { titleAr: 'واتساب', descAr: 'إشعارات ورسائل عبر واتساب', icon: MessageCircle, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'PWA', descAr: 'تطبيق ويب بدون إنترنت', icon: Smartphone, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'تحديث تلقائي', descAr: 'تحديث التطبيق تلقائياً', icon: Settings, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'API مفتوح', descAr: 'ربط مع أنظمة خارجية', icon: Globe, plans: ['enterprise'] },
    ],
  },
  {
    id: 'security',
    titleAr: 'الأمان والصلاحيات',
    icon: Shield,
    color: 'from-red-500 to-rose-600',
    features: [
      { titleAr: 'صلاحيات متعددة', descAr: 'مطور، مدير، كاشير، عميل', icon: ShieldCheck, plans: ['basic', 'pro', 'enterprise'] },
      { titleAr: 'سجل المراجعة', descAr: 'تسجيل كل إجراء في النظام', icon: FileText, plans: ['pro', 'enterprise'] },
      { titleAr: 'نسخ احتياطي', descAr: 'تصدير واستيراد البيانات', icon: Database, plans: ['pro', 'enterprise'] },
      { titleAr: 'العلامة التجارية', descAr: 'تخصيص الهوية البصرية', icon: Palette, plans: ['pro', 'enterprise'] },
      { titleAr: 'مصادقة ثنائية', descAr: 'طبقة أمان إضافية', icon: Shield, plans: ['enterprise'] },
    ],
  },
];

const planModules = [
  { id: 'basic', label: 'الباقة الأساسية', desc: 'حل متكامل لنقطة البيع', icon: ShoppingCart, color: 'from-emerald-500 to-green-600', modules: ['pos', 'customers', 'integrations', 'security'] },
  { id: 'pro', label: 'الباقة المتقدمة', desc: 'نظام إدارة متكامل', icon: Star, color: 'from-blue-500 to-indigo-600', modules: ['pos', 'inventory', 'accounting', 'customers', 'integrations', 'security'] },
  { id: 'enterprise', label: 'الباقة الشاملة', desc: 'منصة كاملة بكل الميزات', icon: Zap, color: 'from-purple-500 to-violet-600', modules: ['pos', 'inventory', 'accounting', 'customers', 'delivery', 'ai', 'integrations', 'security'] },
];

const roleFeatures = [
  { role: 'مطور (Developer)', desc: 'وصول كامل لكل شيء', color: 'from-slate-700 to-slate-900', permissions: ['كل الصلاحيات', 'إدارة المستأجرين', 'إدارة الباقات', 'إدارة الميزات', 'النسخ الاحتياطي', 'مراقبة API', 'تحليلات المنصة'] },
  { role: 'مدير (Manager)', desc: 'إدارة السوبر ماركت بالكامل', color: 'from-blue-500 to-indigo-600', permissions: ['لوحة التحكم', 'المنتجات', 'المخزون', 'الطلبات', 'العملاء', 'المحاسبة', 'التوصيل', 'الموظفين', 'التقارير', 'الإعدادات'] },
  { role: 'كاشير (Cashier)', desc: 'نقطة البيع فقط', color: 'from-emerald-500 to-green-600', permissions: ['نقطة البيع (POS)', 'الفواتير', 'المرتجعات'] },
  { role: 'عميل (Customer)', desc: 'التسوق والطلبات', color: 'from-purple-500 to-violet-600', permissions: ['المتجر', 'السلة', 'الطلبات', 'المفضلة', 'المحفظة', 'الولاء', 'الكوبونات'] },
];

export default function PortfolioPage() {
  const { branding } = useBrandingStore();
  const { plans } = useSubscriptionStore();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [isYearly, setIsYearly] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAllModules, setShowAllModules] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const primaryColor = branding.primaryColor || '#22C55E';
  const storeName = branding.storeName || 'SuperMarket ERP';
  const whatsapp = branding.developerWhatsApp?.replace(/[^0-9]/g, '') || '201061935361';

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const unsub = useBrandingStore.getState().subscribeToChanges();
    return () => { unsub(); };
  }, []);

  const generatePDF = useCallback(async () => {
    if (!contentRef.current) return;
    setIsGenerating(true);
    toast.loading('جاري إنشاء ملف PDF...');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      await new Promise((r) => setTimeout(r, 500));
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#FFFFFF', windowWidth: 1200 });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${storeName}_Portfolio_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.dismiss();
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch (e) {
      console.error('PDF Error:', e);
      toast.dismiss();
      const msg = e instanceof Error ? e.message : 'حاول مرة أخرى';
      toast.error(`فشل إنشاء PDF: ${msg}`);
    } finally { setIsGenerating(false); }
  }, [storeName, contentRef]);

  const adjustColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const visibleModules = showAllModules ? modules : modules.slice(0, 4);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-black" style={{ fontFamily: 'Cairo, sans-serif' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -40)})` }}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 px-4 md:px-8 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            بورتفوليو النظام — SAPKEY ERP
          </div>
          {branding.logo && (
            <div className="mb-6">
              <img loading="lazy" src={branding.logo} alt={storeName} className="h-20 w-20 mx-auto rounded-2xl object-contain bg-white/20 backdrop-blur-sm p-2 shadow-xl" />
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">بورتفوليو {storeName}</h1>
          {branding.slogan && <p className="text-white/90 text-sm md:text-base mb-2">{branding.slogan}</p>}
          <p className="text-white/70 text-xs md:text-sm max-w-2xl mx-auto mb-8 leading-relaxed">
            استعرض جميع الوحدات النمطية، الباقات، والميزات المتاحة — اختر ما يناسب عملك
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/" className="h-11 px-5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-sm font-bold flex items-center gap-2 hover:bg-white/30 transition-all">
              <Home className="h-4 w-4" /> الرئيسية
            </Link>
            <button onClick={generatePDF} disabled={isGenerating} className="h-11 px-6 rounded-xl bg-white text-gray-900 text-sm font-bold flex items-center gap-2 shadow-xl hover:shadow-2xl transition-all disabled:opacity-50">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isGenerating ? 'جاري التحميل...' : 'تحميل PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Content for PDF */}
      <div ref={contentRef} className="bg-white dark:bg-black" dir="rtl">

        {/* Stats */}
        <div className="px-4 md:px-8 py-12 bg-gray-50 dark:bg-black">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { label: 'وحدة نمطية', value: '8', icon: Layers },
              { label: 'ميزة متكاملة', value: '45+', icon: Star },
              { label: 'نوع مستخدمين', value: '4', icon: Users },
              { label: 'وقت التشغيل', value: '99.9%', icon: ShieldCheck },
            ].map((s) => (
              <div key={s.label} className="text-center p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <s.icon className="h-6 w-6 mx-auto mb-2" style={{ color: primaryColor }} />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Module selection highlight */}
        <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">الوحدات النمطية</h2>
          <p className="text-sm text-gray-500 text-center mb-8">اختر باقة لترى الميزات المتاحة فيها</p>

          {/* Plan filter chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {planModules.map((p) => (
              <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                className={`h-10 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-2 ${
                  selectedPlan === p.id
                    ? 'text-white shadow-md scale-105' + ` bg-gradient-to-br ${p.color} border-transparent`
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                <p.icon className="h-4 w-4" />
                {p.label}
              </button>
            ))}
          </div>

          {/* Module cards - collapsible */}
          <div className="space-y-3">
            {visibleModules.map((mod) => {
              const isAvailable = mod.features.some(f => f.plans.includes(selectedPlan as any));
              const availableCount = mod.features.filter(f => f.plans.includes(selectedPlan as any)).length;
              return (
                <Card key={mod.id} className={`border-0 shadow-sm overflow-hidden bg-white dark:bg-slate-900 transition-all ${!isAvailable ? 'opacity-50' : ''}`}>
                  <button onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                    className="w-full p-4 md:p-5 text-right">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0`}>
                          <mod.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-right">
                          <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">{mod.titleAr}</h3>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            {isAvailable ? `${availableCount}/${mod.features.length} ميزة متاحة` : 'غير متضمن في هذه الباقة'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {mod.features.filter(f => f.plans.includes(selectedPlan as any)).length > 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-medium">
                            <Check className="h-2.5 w-2.5" /> متضمن
                          </span>
                        )}
                        {expandedModule === mod.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>

                    {expandedModule === mod.id && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mod.features.map((f) => {
                          const inPlan = f.plans.includes(selectedPlan as any);
                          return (
                            <div key={f.titleAr} className={`flex items-start gap-3 p-3 rounded-xl ${inPlan ? 'bg-gray-50 dark:bg-slate-800' : 'bg-gray-100/50 dark:bg-slate-800/30'}`}>
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${inPlan ? 'bg-white dark:bg-slate-700' : 'bg-gray-200 dark:bg-slate-700'}`}>
                                <f.icon className={`h-4 w-4 ${inPlan ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className={`text-xs md:text-sm font-bold truncate ${inPlan ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{f.titleAr}</p>
                                  {inPlan && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                                </div>
                                <p className={`text-[10px] ${inPlan ? 'text-gray-500' : 'text-gray-300 dark:text-gray-600'}`}>{f.descAr}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </button>
                </Card>
              );
            })}
          </div>

          {modules.length > 4 && (
            <div className="text-center mt-6">
              <button onClick={() => setShowAllModules(!showAllModules)}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                {showAllModules ? 'عرض أقل' : `عرض الكل (${modules.length})`}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllModules ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Plan comparison table */}
        <div className="px-4 md:px-8 py-12 bg-gray-50 dark:bg-black">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">مقارنة الباقات</h2>
            <p className="text-sm text-gray-500 text-center mb-10">قارن بين ما تقدمه كل باقة من وحدات وميزات</p>
            <div className="overflow-x-auto rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <table className="w-full text-sm bg-white dark:bg-slate-900">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <th className="text-right p-4 font-bold text-gray-900 dark:text-white">الوحدة النمطية</th>
                    {planModules.map((p) => (
                      <th key={p.id} className="p-4 text-center font-bold">
                        <span className={`text-xs px-3 py-1 rounded-full text-white bg-gradient-to-br ${p.color}`}>{p.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((mod, idx) => {
                    const basicCount = mod.features.filter(f => f.plans.includes('basic')).length;
                    const proCount = mod.features.filter(f => f.plans.includes('pro')).length;
                    const entCount = mod.features.filter(f => f.plans.includes('enterprise')).length;
                    return (
                      <tr key={mod.id} className={`border-b border-gray-100 dark:border-slate-800 ${idx % 2 === 0 ? 'bg-gray-50/50 dark:bg-slate-800/30' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center`}>
                              <mod.icon className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white text-xs">{mod.titleAr}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {basicCount > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">{basicCount} ميزات</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {proCount > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">{proCount} ميزات</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {entCount > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">{entCount} ميزات</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-slate-800">
                    <td className="p-4 font-bold text-gray-900 dark:text-white text-xs">إجمالي الميزات</td>
                    {planModules.map((p) => {
                      const total = modules.reduce((sum, mod) =>
                        sum + mod.features.filter(f => f.plans.includes(p.id as any)).length, 0);
                      return (
                        <td key={p.id} className="p-4 text-center font-bold text-gray-900 dark:text-white text-sm">{total}</td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="px-4 md:px-8 py-12 max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">خطط الأسعار</h2>
          <p className="text-sm text-gray-500 text-center mb-6">باقات مرنة تناسب جميع الأحجام</p>

          <div className="flex items-center justify-center mb-10">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-800">
              <button onClick={() => setIsYearly(false)} className={`h-9 px-5 rounded-lg text-sm font-semibold transition-all ${!isYearly ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-md' : 'text-gray-500'}`}>شهري</button>
              <button onClick={() => setIsYearly(true)} className={`h-9 px-5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${isYearly ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-md' : 'text-gray-500'}`}>سنوي <Badge className="bg-emerald-500 text-white border-0 text-[8px] h-4 px-1.5">وفّر 20%</Badge></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const monthlyPrice = plan.priceMonthly;
              const yearlyPrice = plan.priceYearly || Math.round(monthlyPrice * 12 * 0.8);
              const price = isYearly ? yearlyPrice : monthlyPrice;
              const priceLabel = isYearly ? 'ج.م/سنة' : 'ج.م/شهر';
              const monthlyEquivalent = isYearly ? Math.round(yearlyPrice / 12) : monthlyPrice;
              const savings = isYearly ? (monthlyPrice * 12) - yearlyPrice : 0;
              const planMod = planModules.find(p => p.label.includes('الباقة'));
              return (
                <Card key={plan.id} className={`border-0 shadow-sm overflow-hidden relative ${plan.popular ? 'ring-2 ring-emerald-500 scale-[1.02]' : ''}`}>
                  {plan.popular && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-green-500" />}
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.nameAr}</h3>
                      {plan.popular && <Badge className="bg-emerald-500 text-white border-0 text-[8px] h-5"><Star className="h-2.5 w-2.5 ml-0.5 fill-white" /> الأكثر طلباً</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mb-4">{plan.descriptionAr}</p>
                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{price.toLocaleString()}</span>
                        <span className="text-sm text-gray-500">{priceLabel}</span>
                      </div>
                      {isYearly && (
                        <div className="mt-1 space-y-0.5">
                          <span className="text-xs text-gray-400 line-through">{(monthlyPrice * 12).toLocaleString()} ج.م</span>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[9px]">وفّر {savings.toLocaleString()} ج.م</Badge>
                          <p className="text-[10px] text-gray-400">يعادل {monthlyEquivalent.toLocaleString()} ج.م/شهر</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"><Users className="h-3.5 w-3.5" /><span>{plan.maxUsers === 999 ? 'غير محدود' : plan.maxUsers} مستخدم</span></div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"><Database className="h-3.5 w-3.5" /><span>{plan.maxStorage}</span></div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-3 border-t border-gray-100 dark:border-slate-800">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{plan.features.length} ميزة متكاملة</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Roles */}
        <div className="px-4 md:px-8 py-12 bg-gray-50 dark:bg-black">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">الأدوار والصلاحيات</h2>
            <p className="text-sm text-gray-500 text-center mb-10">نظام صلاحيات متعدد المستويات</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {roleFeatures.map((r) => (
                <Card key={r.role} className="border-0 shadow-sm overflow-hidden">
                  <CardContent className="p-5">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-3`}><Shield className="h-5 w-5 text-white" /></div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{r.role}</h3>
                    <p className="text-xs text-gray-500 mb-4">{r.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.permissions.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-[10px] font-medium text-gray-600 dark:text-gray-400">{p}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Platforms */}
        <div className="px-4 md:px-8 py-12 max-w-5xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">يعمل على كل المنصات</h2>
            <p className="text-sm text-gray-500 mb-10">تطبيق ويب تقدمي (PWA) يعمل على أي جهاز</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {[{ icon: Monitor, label: 'كمبيوتر' }, { icon: Tablet, label: 'تابلت' }, { icon: Smartphone, label: 'موبايل' }].map((p) => (
                <div key={p.label} className="flex flex-col items-center gap-2">
                  <div className="h-16 w-16 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center"><p.icon className="h-8 w-8" style={{ color: primaryColor }} /></div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Footer />
      </div>

      {/* CTA */}
      <div className="px-4 md:px-8 py-16 text-center bg-white dark:bg-black">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">جاهز للبدء؟</h2>
        <p className="text-sm text-gray-500 mb-6">تواصل معنا للحصول على نسخة تجريبية مجانية</p>
        <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('أريد معرفة المزيد عن نظام SuperMarket ERP')}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:shadow-xl"
          style={{ backgroundColor: primaryColor }}>
          <MessageCircle className="h-4 w-4" /> تواصل عبر واتساب
        </a>
      </div>
    </div>
  );
}

