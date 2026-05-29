'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/layout/footer';
import {
  Store, Shield, Zap, Star, MessageCircle, Wallet, Percent,
  Download, Check, Layers, ShieldCheck, Sparkles, ChevronDown, ChevronUp,
  Monitor, Tablet, Smartphone, Globe, Code, Palette, Database,
  BarChart3, Settings, Users, Truck, Calculator, Boxes, Clock,
  Printer, QrCode, CreditCard, FileText, TrendingUp, MapPin, Bell,
  Mic, Headphones, Package, Loader2, Copy, ExternalLink, Home,
  BookOpen, Eye, Hash, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const brandColors = [
  { name: 'اللون الأساسي', variable: 'primaryColor', hex: '#0071E3', desc: 'لون العلامة التجارية الرئيسي' },
  { name: 'لون النجاح', variable: 'successColor', hex: '#22C55E', desc: 'التأكيدات والعمليات الناجحة' },
  { name: 'أساسي غامق', variable: 'primaryDark', hex: '#0051A2', desc: 'Hover والتباين العالي' },
  { name: 'لون التنبيه', variable: 'warningColor', hex: '#F59E0B', desc: 'التحذيرات والتنبيهات' },
  { name: 'لون الخطأ', variable: 'errorColor', hex: '#EF4444', desc: 'الأخطاء والإلغاءات' },
  { name: 'خلفية غامقة', variable: 'bgDark', hex: '#0F172A', desc: 'الوضع الليلي' },
];

const brandFonts = [
  { name: 'Cairo', type: 'العربية (UI)', weight: '300 - 900', usage: 'العناوين الرئيسية والنصوص' },
  { name: 'Inter', type: 'English (UI)', weight: '400 - 700', usage: 'التسميات الإنجليزية' },
  { name: 'IBM Plex Mono', type: 'Monospace', weight: '400 - 600', usage: 'الأكواد والمخرجات التقنية' },
];

const architectureLayers = [
  { title: 'Frontend', titleAr: 'الواجهة الأمامية', icon: Monitor, color: 'from-blue-500 to-cyan-500', tech: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS', 'Framer Motion'], desc: 'واجهة مستخدم حديثة مع أداء عالي ودعم كامل للغة العربية' },
  { title: 'Backend', titleAr: 'الخادم الخلفي', icon: Database, color: 'from-purple-500 to-violet-500', tech: ['Next.js API Routes', 'Supabase', 'PostgreSQL', 'Row Level Security'], desc: 'بنية API آمنة مع صلاحيات على مستوى الصفوف' },
  { title: 'Realtime', titleAr: 'الوقت الفعلي', icon: Zap, color: 'from-amber-500 to-orange-500', tech: ['Supabase Realtime', 'WebSocket', 'Broadcast', 'Presence'], desc: 'مزامنة فورية بين جميع الأجهزة والمستخدمين' },
  { title: 'Storage', titleAr: 'التخزين', icon: Package, color: 'from-emerald-500 to-green-500', tech: ['Supabase Storage', 'Local Cache', 'IndexedDB', 'Offline Sync'], desc: 'تخزين سحابي مع دعم عدم الاتصال بالإنترنت' },
  { title: 'Deployment', titleAr: 'النشر', icon: Globe, color: 'from-red-500 to-rose-500', tech: ['Docker', 'CI/CD', 'Auto Scaling', 'SSL/TLS'], desc: 'نشر آلي مع تحديثات مستمرة بدون توقف' },
];

const versionHistory = [
  { version: '2.0.0', date: '2026-05-01', label: 'الإصدار الحالي', type: 'latest', changes: ['إعادة تصميم كاملة للواجهة', 'نظام محاسبة متكامل', 'مركز ذكاء الأعمال (BI)', 'دعم الباقات والاشتراكات', 'تحسين الأداء بنسبة 60%'] },
  { version: '1.5.0', date: '2026-02-15', label: 'تحديث رئيسي', type: 'major', changes: ['إضافة نظام التوصيل', 'نظام الولاء للعملاء', 'تحسينات الأمان', 'دعم QR Code'] },
  { version: '1.3.0', date: '2025-11-01', label: 'تحديث', type: 'minor', changes: ['نظام الخزينة', 'تقارير المخزون', 'واجهة جديد لإدارة العملاء'] },
  { version: '1.0.0', date: '2025-08-15', label: 'الإطلاق الأول', type: 'launch', changes: ['نقطة بيع متكاملة', 'إدارة المخزون الأساسية', 'دعم PWA', 'لوحة تحكم المدير'] },
];

export default function SystemIdentityPage() {
  const { branding, systemBranding } = useBrandingStore();
  const [expandedVersion, setExpandedVersion] = useState<string | null>('2.0.0');
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedHex, setCopiedHex] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const primaryColor = systemBranding.systemPrimaryColor || '#0071E3';
  const systemName = systemBranding.systemName || 'SAPKEY SOLUTIONS';
  const storePrimaryColor = branding.primaryColor || '#22C55E';
  const whatsapp = branding.developerWhatsApp?.replace(/[^0-9]/g, '') || '201061935361';

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
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
      await new Promise((r) => setTimeout(r, 800));
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
      pdf.save(`${systemName}_Identity_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.dismiss();
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch (e) {
      console.error('PDF Error:', e);
      toast.dismiss();
      const msg = e instanceof Error ? e.message : 'حاول مرة أخرى';
      toast.error(`فشل إنشاء PDF: ${msg}`);
    } finally { setIsGenerating(false); }
  }, [systemName, contentRef]);

  const adjustColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-black" style={{ fontFamily: 'Cairo, sans-serif' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -50)})` }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="relative z-10 px-4 md:px-8 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium mb-6">
            <Palette className="h-3.5 w-3.5" />
            الهوية البصرية — دليل العلامة التجارية
          </div>
          {systemBranding.systemLogo && (
            <div className="mb-6">
              <img loading="lazy" src={systemBranding.systemLogo} alt={systemName} className="h-20 w-20 mx-auto rounded-2xl object-contain bg-white/20 backdrop-blur-sm p-2 shadow-xl" />
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">{systemName}</h1>
          <p className="text-white/80 text-sm md:text-lg max-w-2xl mx-auto mb-2 leading-relaxed">{systemBranding.systemDescription}</p>
          <div className="flex items-center justify-center gap-2 text-white/60 text-xs mb-8">
            <Hash className="h-3 w-3" /> الإصدار {systemBranding.systemVersion}
            <span className="w-1 h-1 rounded-full bg-white/30 mx-1" />
            <span>آخر تحديث: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/" className="h-11 px-5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-sm font-bold flex items-center gap-2 hover:bg-white/30 transition-all">
              <Home className="h-4 w-4" /> زيارة الرئيسية
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

        {/* System Stats */}
        <div className="px-4 md:px-8 py-12 bg-gray-50 dark:bg-black">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { label: 'طبقات معمارية', value: '5', icon: Layers },
              { label: 'إصدارات', value: '4', icon: BookOpen },
              { label: 'لون أساسي', value: '6', icon: Palette },
              { label: 'مطورين', value: '1', icon: Code },
            ].map((s) => (
              <div key={s.label} className="text-center p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <s.icon className="h-6 w-6 mx-auto mb-2" style={{ color: primaryColor }} />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ───── Visual Identity ───── */}
        <div className="px-4 md:px-8 py-12 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium mb-4">
              <Eye className="h-3 w-3" /> الهوية البصرية
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">دليل الهوية البصرية</h2>
            <p className="text-sm text-gray-500 max-w-xl mx-auto">الألوان، الخطوط، والمبادئ التوجيهية للعلامة التجارية</p>
          </div>

          {/* Logo Area */}
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 mb-6 overflow-hidden">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Store className="h-4 w-4" style={{ color: primaryColor }} /> الشعار (Logo)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center min-h-[140px]">
                  {systemBranding.systemLogo ? (
                    <img loading="lazy" src={systemBranding.systemLogo} alt={systemName} className="h-16 object-contain" />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: primaryColor }}>
                      <Store className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-6 rounded-2xl bg-gray-900 dark:bg-black flex items-center justify-center min-h-[140px]">
                  {systemBranding.systemLogo ? (
                    <img loading="lazy" src={systemBranding.systemLogo} alt={systemName} className="h-16 object-contain brightness-0 invert" />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-white/10">
                      <Store className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-gray-400">
                <span>شعار ملون</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span>شعار أبيض (خلفية داكنة)</span>
              </div>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 mb-6 overflow-hidden">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Palette className="h-4 w-4" style={{ color: primaryColor }} /> لوحة الألوان
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {brandColors.map((c) => (
                  <div key={c.name} className="text-center">
                    <button onClick={() => { navigator.clipboard.writeText(c.hex); setCopiedHex(c.hex); setTimeout(() => setCopiedHex(''), 1500); }}
                      className="w-full aspect-square rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-2 transition-transform hover:scale-105 active:scale-95 relative group"
                      style={{ backgroundColor: c.hex }}>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-2xl">
                        <Copy className="h-4 w-4 text-white drop-shadow" />
                      </div>
                    </button>
                    <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-[9px] text-gray-400 font-mono">{copiedHex === c.hex ? 'تم النسخ ✓' : c.hex}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Hash className="h-4 w-4" style={{ color: primaryColor }} /> الخطوط (Typography)
              </h3>
              <div className="space-y-4">
                {brandFonts.map((f) => (
                  <div key={f.name} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{f.name}</span>
                        <Badge className="mr-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-[8px]">{f.type}</Badge>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">{f.weight}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">{f.usage}</p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xl font-black text-gray-900 dark:text-white" style={{ fontFamily: f.name === 'Cairo' ? 'Cairo, sans-serif' : f.name === 'Inter' ? 'Inter, sans-serif' : 'IBM Plex Mono, monospace' }}>
                        {f.name === 'Cairo' ? 'نظام SAPKEY — هوية رقمية متكاملة' : f.name === 'Inter' ? 'SAPKEY ERP — Digital Identity' : 'system-identity v2.0.0'}
                      </p>
                      <p className="text-xs text-gray-400" style={{ fontFamily: f.name === 'Cairo' ? 'Cairo, sans-serif' : f.name === 'Inter' ? 'Inter, sans-serif' : 'IBM Plex Mono, monospace' }}>
                        {f.name === 'Cairo' ? 'عرض الخط العربي بتصميم عصري — 300 400 500 600 700 800' : f.name === 'Inter' ? 'The quick brown fox jumps over the lazy dog — Regular Medium SemiBold Bold' : 'const identity = new BrandSystem(); // Monospace for code'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ───── Version History / Auto Updates ───── */}
        <div className="px-4 md:px-8 py-12 bg-gray-50 dark:bg-black">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-4">
                <Zap className="h-3 w-3" /> التحديثات التلقائية
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">سجل الإصدارات</h2>
              <p className="text-sm text-gray-500 max-w-xl mx-auto">يتزامن تلقائياً مع آخر تحديثات النظام — كل الإصدارات السابقة مسجلة</p>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700 hidden sm:block" />

              <div className="space-y-4">
                {versionHistory.map((v) => (
                  <Card key={v.version} className={`border-0 shadow-sm overflow-hidden bg-white dark:bg-slate-900 relative ${v.type === 'latest' ? 'ring-1 ring-emerald-500/30' : ''}`}>
                    <button onClick={() => setExpandedVersion(expandedVersion === v.version ? null : v.version)} className="w-full p-5 text-right">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:pr-10">
                          {/* Timeline dot (desktop) */}
                          <div className={`hidden sm:flex absolute right-2.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${
                            v.type === 'latest' ? 'bg-emerald-500' : v.type === 'major' ? 'bg-blue-500' : v.type === 'launch' ? 'bg-purple-500' : 'bg-gray-400'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black text-gray-900 dark:text-white">{v.version}</span>
                              <Badge className={`border-0 text-[8px] h-5 ${
                                v.type === 'latest' ? 'bg-emerald-500 text-white' : v.type === 'major' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : v.type === 'launch' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                              }`}>{v.label}</Badge>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">{new Date(v.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                        </div>
                        {expandedVersion === v.version ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>

                      {expandedVersion === v.version && (
                        <div className="mt-4 sm:pr-10">
                          <ul className="space-y-2">
                            {v.changes.map((c, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </button>
                  </Card>
                ))}
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1.5">
                <Zap className="h-3 w-3 text-amber-500" />
                يتم تحديث هذه القائمة تلقائياً مع كل إصدار جديد — الإصدار الحالي: {systemBranding.systemVersion}
              </p>
            </div>
          </div>
        </div>

        {/* ───── Architecture / Tech Stack ───── */}
        <div className="px-4 md:px-8 py-12 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs font-medium mb-4">
              <Code className="h-3 w-3" /> البنية التقنية
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">الطبقات المعمارية</h2>
            <p className="text-sm text-gray-500 max-w-xl mx-auto">هيكل النظام التقني — كل طبقة مسؤولة عن وظائف محددة</p>
          </div>

          <div className="space-y-3">
            {architectureLayers.map((layer, idx) => (
              <Card key={layer.title} className="border-0 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                <button onClick={() => setExpandedLayer(expandedLayer === idx ? null : idx)} className="w-full p-5 text-right">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center`}>
                        <layer.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{layer.titleAr}</h3>
                        <p className="text-[10px] text-gray-400">{layer.title}</p>
                      </div>
                    </div>
                    {expandedLayer === idx ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>

                  {expandedLayer === idx && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-3">{layer.desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {layer.tech.map((t) => (
                          <span key={t} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-[10px] font-medium text-gray-600 dark:text-gray-400 font-mono">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              </Card>
            ))}
          </div>
        </div>

        {/* ───── Brand Guidelines ───── */}
        <div className="px-4 md:px-8 py-12 bg-gray-50 dark:bg-black">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-medium mb-4">
                <BookOpen className="h-3 w-3" /> المبادئ التوجيهية
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">إرشادات الاستخدام</h2>
              <p className="text-sm text-gray-500 max-w-xl mx-auto">قواعد استخدام الهوية البصرية للحفاظ على تناسق العلامة التجارية</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                    <Check className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">مسموح</h3>
                  <ul className="space-y-1.5">
                    {['استخدام الألوان الأساسية من اللوحة', 'الحفاظ على التباعد الآمن حول الشعار', 'استخدام الخطوط المعتمدة', 'التدرج اللوني المسموح به'].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                        <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" /> {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
                    <X className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">غير مسموح</h3>
                  <ul className="space-y-1.5">
                    {['تشويه أو تغيير أبعاد الشعار', 'استخدام ألوان غير معتمدة', 'إضافة تأثيرات غير مصرح بها', 'تغيير الخطوط المعتمدة'].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                        <X className="h-3 w-3 text-red-500 shrink-0 mt-0.5" /> {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* ───── Developer Profile ───── */}
        <div className="px-4 md:px-8 py-12 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium mb-4">
              <Code className="h-3 w-3" /> المطور
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">فريق التطوير</h2>
            <p className="text-sm text-gray-500 max-w-xl mx-auto">مطور مستقل — دعم فني وصيانة مستمرة</p>
          </div>

          <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
                <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-sm" style={{ backgroundColor: primaryColor }}>
                  {systemName.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{systemName}</h3>
                  <p className="text-xs text-gray-500">حلول ذكية لإدارة السوبر ماركت</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[9px] font-medium">Next.js 16</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] font-medium">Supabase</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[9px] font-medium">TypeScript</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-medium">PWA</span>
                  </div>
                </div>
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
                  className="h-10 px-5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shrink-0 shadow-md hover:shadow-lg transition-all"
                  style={{ backgroundColor: storePrimaryColor }}>
                  <MessageCircle className="h-4 w-4" /> تواصل
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="px-4 md:px-8 py-8 border-t border-gray-100 dark:border-slate-800">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {systemBranding.systemLogo ? (
                <img loading="lazy" src={systemBranding.systemLogo} alt={systemName} className="h-8 w-8 rounded-lg object-contain" />
              ) : (
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}><Store className="h-4 w-4 text-white" /></div>
              )}
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{systemName}</p>
                <p className="text-[10px] text-gray-400">{systemBranding.systemSlogan}</p>
              </div>
            </div>
            <div className="text-center md:text-left">
              <p className="text-xs text-gray-400">{systemName}™ © {new Date().getFullYear()} — جميع الحقوق محفوظة</p>
              <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">الإصدار {systemBranding.systemVersion} — آخر تحديث: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

