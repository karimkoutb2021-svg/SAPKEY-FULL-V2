'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBrandingStore, DEFAULT_BRANDING, DEFAULT_SYSTEM_BRANDING, DEFAULT_FOOTER_CONFIG } from '@/lib/store/branding-store';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  Palette, Save, Trash2, Plus, RefreshCw, Monitor, Store, Phone, Shield,
  LinkIcon, ChevronDown, ChevronUp, Eye, EyeOff, Layout, Type, Image,
  Globe, Settings, Edit3, X, Check, GripVertical, Bell, AlertTriangle,
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'system', label: 'هوية النظام', icon: Monitor, color: 'from-blue-500 to-indigo-600' },
  { id: 'store', label: 'هوية المتجر', icon: Store, color: 'from-emerald-500 to-green-600' },
  { id: 'banners', label: 'البانرات (Banners)', icon: Image, color: 'from-pink-500 to-rose-600' },
  { id: 'footer', label: 'الفوتر والمحتوى', icon: Layout, color: 'from-purple-500 to-violet-600' },
  { id: 'contact', label: 'التواصل', icon: Phone, color: 'from-amber-500 to-orange-600' },
  { id: 'access', label: 'الوصول', icon: Shield, color: 'from-red-500 to-rose-600' },
];

const iconOptions = [
  { value: 'Truck', label: 'شاحنة' },
  { value: 'Headphones', label: 'سماعات' },
  { value: 'Settings', label: 'إعدادات' },
  { value: 'Store', label: 'متجر' },
  { value: 'BookOpen', label: 'كتاب' },
  { value: 'Phone', label: 'هاتف' },
  { value: 'Globe', label: 'عالم' },
  { value: 'Shield', label: 'درع' },
  { value: 'CreditCard', label: 'بطاقة' },
  { value: 'Gift', label: 'هدية' },
];

export default function AdminBrandingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { branding, systemBranding, updateBranding, updateSystemBranding, resetBranding, resetSystemBranding,
    addFooterLink, updateFooterLink, removeFooterLink, updateFooterSection, addFooterSection, removeFooterSection } = useBrandingStore();

  const [activeTab, setActiveTab] = useState('system');
  const [saving, setSaving] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedLink, setExpandedLink] = useState<string | null>(null);

  // System state
  const [sysName, setSysName] = useState(systemBranding.systemName);
  const [sysNameEn, setSysNameEn] = useState(systemBranding.systemNameEn);
  const [sysSlogan, setSysSlogan] = useState(systemBranding.systemSlogan);
  const [sysDesc, setSysDesc] = useState(systemBranding.systemDescription);
  const [sysLogo, setSysLogo] = useState(systemBranding.systemLogo);
  const [sysColor, setSysColor] = useState(systemBranding.systemPrimaryColor);
  const [sysVersion, setSysVersion] = useState(systemBranding.systemVersion);

  // Store state
  const [storeName, setStoreName] = useState(branding.storeName);
  const [storeNameEn, setStoreNameEn] = useState(branding.storeNameEn);
  const [slogan, setSlogan] = useState(branding.slogan);
  const [logo, setLogo] = useState(branding.logo);
  const [favicon, setFavicon] = useState(branding.favicon);
  const [appIcon, setAppIcon] = useState(branding.appIcon);
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(branding.secondaryColor);
  const [footer, setFooter] = useState(branding.footer);
  const [tickerActive, setTickerActive] = useState(branding.tickerActive ?? true);
  const [tickerText, setTickerText] = useState(branding.tickerText ?? '');
  const [tickerColor, setTickerColor] = useState(branding.tickerColor ?? '#EF4444');

  // Banner state
  const [heroBannerImages, setHeroBannerImages] = useState<string[]>(branding.heroBannerImages || []);
  const [heroBannerTitle, setHeroBannerTitle] = useState(branding.heroBannerTitle || '');
  const [heroBannerSubtitle, setHeroBannerSubtitle] = useState(branding.heroBannerSubtitle || '');
  const [ctaBannerImages, setCtaBannerImages] = useState<string[]>(branding.ctaBannerImages || []);
  const [topBannerActive, setTopBannerActive] = useState(branding.topBannerActive ?? true);
  const [topBannerText, setTopBannerText] = useState(branding.topBannerText || '');

  // Push Notifications & Low Stock
  const [pushOffers, setPushOffers] = useState<string[]>(branding.pushNotificationOffers || []);
  const [lowStockThreshold, setLowStockThreshold] = useState(branding.lowStockThreshold || 5);
  const [lowStockEnabled, setLowStockEnabled] = useState(branding.lowStockEnabled ?? true);
  const [newPushOffer, setNewPushOffer] = useState('');

  // Contact state
  const [address, setAddress] = useState(branding.address);
  const [phone, setPhone] = useState(branding.phone);
  const [whatsapp, setWhatsapp] = useState(branding.whatsapp);
  const [developerWhatsApp, setDeveloperWhatsApp] = useState(branding.developerWhatsApp);
  const [managerName, setManagerName] = useState(branding.managerName);
  const [taxNumber, setTaxNumber] = useState(branding.taxNumber);
  const [taxRate, setTaxRate] = useState(branding.taxRate);

  // Access state
  const [adminAccessCode, setAdminAccessCode] = useState(branding.adminAccessCode);
  const [guidesAccessCode, setGuidesAccessCode] = useState(branding.guidesAccessCode);
  const [showGuidesCode, setShowGuidesCode] = useState(false);

  // Footer section editing
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [editSectionNameEn, setEditSectionNameEn] = useState('');
  const [editSectionDesc, setEditSectionDesc] = useState('');
  const [editSectionIcon, setEditSectionIcon] = useState('');

  // New section
  const [showNewSection, setShowNewSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionNameEn, setNewSectionNameEn] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');
  const [newSectionIcon, setNewSectionIcon] = useState('Store');

  // New link
  const [showNewLink, setShowNewLink] = useState<string | null>(null);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkHref, setNewLinkHref] = useState('');
  const [newLinkDesc, setNewLinkDesc] = useState('');
  const [newLinkContent, setNewLinkContent] = useState('');

  // Edit link
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkLabel, setEditLinkLabel] = useState('');
  const [editLinkHref, setEditLinkHref] = useState('');
  const [editLinkDesc, setEditLinkDesc] = useState('');
  const [editLinkContent, setEditLinkContent] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role !== 'admin') { toast.error('هذه الصفحة متاحة للمطور فقط'); router.replace('/dashboard'); }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    setSysName(systemBranding.systemName);
    setSysNameEn(systemBranding.systemNameEn);
    setSysSlogan(systemBranding.systemSlogan);
    setSysDesc(systemBranding.systemDescription);
    setSysLogo(systemBranding.systemLogo);
    setSysColor(systemBranding.systemPrimaryColor);
    setSysVersion(systemBranding.systemVersion);
    setStoreName(branding.storeName);
    setStoreNameEn(branding.storeNameEn);
    setSlogan(branding.slogan);
    setLogo(branding.logo);
    setFavicon(branding.favicon);
    setAppIcon(branding.appIcon);
    setPrimaryColor(branding.primaryColor);
    setSecondaryColor(branding.secondaryColor);
    setFooter(branding.footer);
    setTickerActive(branding.tickerActive ?? true);
    setTickerText(branding.tickerText ?? '');
    setTickerColor(branding.tickerColor ?? '#EF4444');
    setHeroBannerImages(branding.heroBannerImages || []);
    setHeroBannerTitle(branding.heroBannerTitle || '');
    setHeroBannerSubtitle(branding.heroBannerSubtitle || '');
    setCtaBannerImages(branding.ctaBannerImages || []);
    setTopBannerActive(branding.topBannerActive ?? true);
    setTopBannerText(branding.topBannerText || '');
    setAddress(branding.address);
    setPhone(branding.phone);
    setWhatsapp(branding.whatsapp);
    setDeveloperWhatsApp(branding.developerWhatsApp);
    setManagerName(branding.managerName);
    setTaxNumber(branding.taxNumber);
    setAdminAccessCode(branding.adminAccessCode);
    setGuidesAccessCode(branding.guidesAccessCode);
  }, [branding, systemBranding]);

  const handleSaveSystem = async () => {
    setSaving(true);
    updateSystemBranding({
      systemName: sysName, systemNameEn: sysNameEn, systemSlogan: sysSlogan,
      systemDescription: sysDesc, systemLogo: sysLogo, systemPrimaryColor: sysColor, systemVersion: sysVersion,
    });
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success('تم حفظ هوية النظام');
  };

  const handleSaveStore = async () => {
    setSaving(true);
    // Sync logo to favicon and appIcon automatically as requested by user
    updateBranding({ storeName, storeNameEn, slogan, logo, favicon: logo, appIcon: logo, primaryColor, secondaryColor, footer, tickerActive, tickerText, tickerColor });
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success('تم حفظ هوية المتجر');
  };

  const handleSaveBanners = async () => {
    setSaving(true);
    updateBranding({ heroBannerImages, heroBannerTitle, heroBannerSubtitle, ctaBannerImages, topBannerActive, topBannerText, pushNotificationOffers: pushOffers, lowStockThreshold, lowStockEnabled });
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success('تم حفظ البانرات');
  };

  const handleSaveContact = async () => {
    setSaving(true);
    updateBranding({ address, phone, whatsapp, developerWhatsApp, managerName, taxNumber, taxRate });
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success('تم حفظ بيانات التواصل');
  };

  const handleSaveAccess = async () => {
    setSaving(true);
    updateBranding({ adminAccessCode, guidesAccessCode });
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success('تم حفظ إعدادات الوصول');
  };

  // Section handlers
  const startEditSection = (section: any) => {
    setEditingSection(section.id);
    setEditSectionName(section.name);
    setEditSectionNameEn(section.nameEn);
    setEditSectionDesc(section.description);
    setEditSectionIcon(section.icon);
  };

  const saveEditSection = () => {
    if (!editingSection || !editSectionName) return;
    updateFooterSection(editingSection, {
      name: editSectionName, nameEn: editSectionNameEn, description: editSectionDesc, icon: editSectionIcon,
    });
    setEditingSection(null);
    toast.success('تم تحديث القسم');
  };

  const handleAddSection = () => {
    if (!newSectionName) { toast.error('أدخل اسم القسم'); return; }
    addFooterSection({
      id: Date.now().toString(),
      name: newSectionName, nameEn: newSectionNameEn, description: newSectionDesc, icon: newSectionIcon,
    });
    setNewSectionName(''); setNewSectionNameEn(''); setNewSectionDesc(''); setNewSectionIcon('Store');
    setShowNewSection(false);
    toast.success('تم إضافة القسم');
  };

  const handleRemoveSection = (id: string) => {
    removeFooterSection(id);
    toast.success('تم حذف القسم');
  };

  // Link handlers
  const startAddLink = (sectionId: string) => {
    setShowNewLink(sectionId);
    setNewLinkLabel(''); setNewLinkHref(''); setNewLinkDesc(''); setNewLinkContent('');
  };

  const handleAddLink = (sectionId: string) => {
    if (!newLinkLabel) { toast.error('أدخل اسم الرابط'); return; }
    
    // Automatically generate href if content is provided but no href
    const finalHref = (!newLinkHref && newLinkContent) 
      ? `/pages/${Date.now().toString()}` 
      : newLinkHref;
      
    if (!finalHref) { toast.error('أدخل الرابط أو محتوى الصفحة'); return; }

    addFooterLink({
      id: Date.now().toString(), sectionId, label: newLinkLabel, href: finalHref, description: newLinkDesc, content: newLinkContent,
    });
    setShowNewLink(null);
    setNewLinkLabel(''); setNewLinkHref(''); setNewLinkDesc(''); setNewLinkContent('');
    toast.success('تم إضافة الرابط');
  };

  const startEditLink = (link: any) => {
    setEditingLinkId(link.id);
    setEditLinkLabel(link.label);
    setEditLinkHref(link.href);
    setEditLinkDesc(link.description || '');
    setEditLinkContent(link.content || '');
  };

  const saveEditLink = () => {
    if (!editingLinkId || !editLinkLabel) return;
    updateFooterLink(editingLinkId, { label: editLinkLabel, href: editLinkHref, description: editLinkDesc, content: editLinkContent });
    setEditingLinkId(null);
    toast.success('تم تحديث الرابط');
  };

  const sections = branding.footerConfig?.sections || DEFAULT_FOOTER_CONFIG.sections;
  const links = branding.footerLinks || [];

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
            <Palette className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">العلامة التجارية والهوية البصرية</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">إدارة هوية النظام والمتجر والفوتر</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* SYSTEM */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${sysColor}, ${adjustColor(sysColor, -40)})` }}>
            <div className="p-8 text-center text-white">
              {sysLogo && <img src={sysLogo} alt={sysName} className="h-16 w-16 mx-auto rounded-2xl object-contain bg-white/20 p-2 mb-4" />}
              <h2 className="text-2xl font-bold mb-1">{sysName}</h2>
              <p className="text-white/80 text-sm">{sysSlogan}</p>
              <p className="text-white/60 text-xs mt-2">الإصدار {sysVersion}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">اسم النظام (عربي)</label>
              <input value={sysName} onChange={(e) => setSysName(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">اسم النظام (إنجليزي)</label>
              <input value={sysNameEn} onChange={(e) => setSysNameEn(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">الشعار</label>
              <input value={sysSlogan} onChange={(e) => setSysSlogan(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">الإصدار</label>
              <input value={sysVersion} onChange={(e) => setSysVersion(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div className="md:col-span-2"><label className="text-xs font-medium text-gray-500 block mb-1.5">الوصف</label>
              <textarea value={sysDesc} onChange={(e) => setSysDesc(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 py-2 dark:text-white resize-none" /></div>
            <div className="md:col-span-2"><ImageUpload value={sysLogo} onChange={setSysLogo} label="لوجو النظام" width={200} height={64} maxSizeMB={2} previewSize="h-16 w-32" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">اللون الأساسي</label>
              <div className="flex items-center gap-2">
                <input type="color" value={sysColor} onChange={(e) => setSysColor(e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer" />
                <input value={sysColor} onChange={(e) => setSysColor(e.target.value)} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white font-mono" />
              </div></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveSystem} disabled={saving} className="flex-1 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? 'جاري الحفظ...' : 'حفظ هوية النظام'}
            </button>
            <button onClick={resetSystemBranding} className="h-10 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> إعادة تعيين
            </button>
          </div>
        </div>
      )}

      {/* STORE */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -40)})` }}>
            <div className="p-8 text-center text-white">
              {logo && <img src={logo} alt={storeName} className="h-16 w-16 mx-auto rounded-2xl object-contain bg-white/20 p-2 mb-4" />}
              <h2 className="text-2xl font-bold mb-1">{storeName}</h2>
              <p className="text-white/80 text-sm">{slogan}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">اسم المتجر (عربي)</label>
              <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">اسم المتجر (إنجليزي)</label>
              <input value={storeNameEn} onChange={(e) => setStoreNameEn(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">العنوان الفرعي</label>
              <input value={slogan} onChange={(e) => setSlogan(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div className="md:col-span-2"><ImageUpload value={logo} onChange={setLogo} label="لوجو المتجر" width={120} height={120} maxSizeMB={2} previewSize="h-16 w-16" /></div>
            <div><ImageUpload value={favicon} onChange={setFavicon} label="أيقونة المتصفح (Favicon)" width={32} height={32} maxSizeMB={1} previewSize="h-8 w-8" /></div>
            <div><ImageUpload value={appIcon} onChange={setAppIcon} label="أيقونة التطبيق (PWA)" width={512} height={512} maxSizeMB={2} previewSize="h-16 w-16" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">اللون الأساسي</label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer" />
                <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white font-mono" />
              </div></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">اللون الثانوي</label>
              <div className="flex items-center gap-2">
                <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer" />
                <input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white font-mono" />
              </div></div>
            <div className="md:col-span-2"><label className="text-xs font-medium text-gray-500 block mb-1.5">نص الفوتر</label>
              <input value={footer} onChange={(e) => setFooter(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>

            {/* Ticker Settings */}
            <div className="md:col-span-2 border-t border-gray-100 dark:border-slate-800 pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-900 dark:text-white">الشريط الإخباري (العروض)</label>
                <button onClick={() => setTickerActive(!tickerActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${tickerActive ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-700'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${tickerActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {tickerActive && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">نص الشريط المتحرك</label>
                    <textarea value={tickerText} onChange={(e) => setTickerText(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 py-2 dark:text-white resize-y" placeholder="مثال: عروض وخصومات حصرية..." />
                    <p className="text-[10px] text-gray-400 mt-1">افصل بين العروض بعلامة | (مثال: عرض 1 | عرض 2 | عرض 3)</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">لون خلفية الشريط</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={tickerColor} onChange={(e) => setTickerColor(e.target.value)} className="h-10 w-10 rounded-lg border-0 cursor-pointer" />
                      <input value={tickerColor} onChange={(e) => setTickerColor(e.target.value)} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white font-mono" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSaveStore} disabled={saving} className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? 'جاري الحفظ...' : 'حفظ هوية المتجر'}
            </button>
            <button onClick={resetBranding} className="h-10 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> إعادة تعيين
            </button>
          </div>
        </div>
      )}

      {/* BANNERS SECTION */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-pink-50/50 dark:bg-pink-900/10 flex items-center gap-2">
              <Image className="h-4 w-4 text-pink-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">البانر الرئيسي المتحرك (السلايدر)</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">عنوان البانر الرئيسي</label>
                <input value={heroBannerTitle} onChange={(e) => setHeroBannerTitle(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">نص فرعي للبانر</label>
                <input value={heroBannerSubtitle} onChange={(e) => setHeroBannerSubtitle(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                <p className="text-xs text-gray-500 mb-3 font-medium">صور السلايدر العلوي (يفضل مقاس 1920x600 بجودة عالية)</p>
                <div className="space-y-2 mb-3">
                  {heroBannerImages.map((img, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input value={img} onChange={(e) => {
                        const newArr = [...heroBannerImages];
                        newArr[idx] = e.target.value;
                        setHeroBannerImages(newArr);
                      }} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3 dark:text-white font-mono text-left" dir="ltr" />
                      <button onClick={() => setHeroBannerImages(heroBannerImages.filter((_, i) => i !== idx))} className="h-10 w-10 flex-shrink-0 rounded-xl border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setHeroBannerImages([...heroBannerImages, ''])} className="w-full h-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 text-gray-500 text-xs font-bold hover:border-pink-500 hover:text-pink-500 transition-colors">
                  + إضافة صورة جديدة للسلايدر العلوي
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10 flex items-center gap-2">
              <Image className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">البانر الذكي السفلي (صور الفتاة أو غيره)</h3>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-3">أضف روابط الصور التي ستظهر في القسم السفلي (يفضل مقاس 1920x1080 وبجودة عالية).</p>
              <div className="space-y-2 mb-3">
                {ctaBannerImages.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input value={img} onChange={(e) => {
                      const newArr = [...ctaBannerImages];
                      newArr[idx] = e.target.value;
                      setCtaBannerImages(newArr);
                    }} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3 dark:text-white font-mono text-left" dir="ltr" />
                    <button onClick={() => setCtaBannerImages(ctaBannerImages.filter((_, i) => i !== idx))} className="h-10 w-10 flex-shrink-0 rounded-xl border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => setCtaBannerImages([...ctaBannerImages, ''])} className="w-full h-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 text-gray-500 text-xs font-bold hover:border-blue-500 hover:text-blue-500 transition-colors">
                + إضافة صورة جديدة للسلايدر السفلي
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-orange-50/50 dark:bg-orange-900/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layout className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">الشريط العلوي المتحرك (Ticker)</h3>
              </div>
              <button onClick={() => setTopBannerActive(!topBannerActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${topBannerActive ? 'bg-orange-500' : 'bg-gray-200 dark:bg-slate-700'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${topBannerActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {topBannerActive && (
              <div className="p-4">
                <label className="text-xs font-medium text-gray-500 block mb-1.5">نص الشريط العلوي</label>
                <textarea value={topBannerText} onChange={(e) => setTopBannerText(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3 py-2 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-y" />
                <p className="text-[10px] text-gray-400 mt-1">افصل بين العروض بعلامة | (مثال: عرض 1 | عرض 2 | عرض 3)</p>
              </div>
            )}
          </div>

          {/* Push Notification Offers */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10 flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">إشعارات العروض المنبثقة (Push Notifications)</h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">هذه الإشعارات تظهر للعملاء أثناء التسوق كل 10 ثواني بعروض تشويقية</p>
              <div className="space-y-2">
                {pushOffers.map((offer, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input value={offer} onChange={(e) => {
                      const newArr = [...pushOffers];
                      newArr[idx] = e.target.value;
                      setPushOffers(newArr);
                    }} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3 dark:text-white" />
                    <button onClick={() => setPushOffers(pushOffers.filter((_, i) => i !== idx))} className="h-10 w-10 flex-shrink-0 rounded-xl border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newPushOffer} onChange={(e) => setNewPushOffer(e.target.value)} placeholder="أضف عرض جديد (مثال: خصم 25% على الدواجن 🔥)" className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3 dark:text-white" />
                <button onClick={() => { if (newPushOffer.trim()) { setPushOffers([...pushOffers, newPushOffer.trim()]); setNewPushOffer(''); } }} className="h-10 px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors">+ إضافة</button>
              </div>
            </div>
          </div>

          {/* Low Stock Settings */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-900/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">تنبيه المخزون المنخفض (متبقي X فقط)</h3>
              </div>
              <button onClick={() => setLowStockEnabled(!lowStockEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${lowStockEnabled ? 'bg-amber-500' : 'bg-gray-200 dark:bg-slate-700'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${lowStockEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {lowStockEnabled && (
              <div className="p-4 space-y-3">
                <p className="text-xs text-gray-500">عند انخفاض المخزون لأقل من هذا الرقم، يظهر تنبيه تشويقي للعميل (مثل: متبقي 3 فقط! أسرع بالطلب)</p>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">الحد الأقصى للتنبيه (عدد القطع)</label>
                  <input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(Number(e.target.value))} min={1} max={50} className="w-32 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm px-3 dark:text-white text-center" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={handleSaveBanners} disabled={saving} className="flex-1 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? 'جاري الحفظ...' : 'حفظ البانرات'}
            </button>
          </div>
        </div>
      )}

      {/* FOOTER SECTIONS & CONTENT */}
      {activeTab === 'footer' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layout className="h-4 w-4" /> أقسام ومحتوى الفوتر
            </h2>
            <button onClick={() => setShowNewSection(!showNewSection)} className="h-8 px-3 rounded-lg bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5">
              <Plus className="h-3 w-3" /> قسم جديد
            </button>
          </div>

          {/* New Section Form */}
          {showNewSection && (
            <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-4 space-y-3">
              <h3 className="text-xs font-bold text-purple-700 dark:text-purple-300">إضافة قسم جديد</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="اسم القسم (عربي)" className="h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white" />
                <input value={newSectionNameEn} onChange={(e) => setNewSectionNameEn(e.target.value)} placeholder="Section Name (EN)" className="h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white" />
                <input value={newSectionDesc} onChange={(e) => setNewSectionDesc(e.target.value)} placeholder="وصف القسم" className="h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white" />
                <select value={newSectionIcon} onChange={(e) => setNewSectionIcon(e.target.value)} className="h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white">
                  {iconOptions.map((ic) => <option key={ic.value} value={ic.value}>{ic.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddSection} className="h-8 px-4 rounded-lg bg-purple-500 text-white text-xs font-medium flex items-center gap-1"><Check className="h-3 w-3" /> إضافة</button>
                <button onClick={() => setShowNewSection(false)} className="h-8 px-4 rounded-lg border border-gray-200 dark:border-slate-700 text-xs"><X className="h-3 w-3" /></button>
              </div>
            </div>
          )}

          {/* Sections List */}
          {sections.map((section) => {
            const sectionLinks = links.filter((l) => l.sectionId === section.id);
            const isEditing = editingSection === section.id;
            const isExpanded = expandedSection === section.id;
            const showAddLink = showNewLink === section.id;

            return (
              <div key={section.id} className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                {/* Section Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-slate-800">
                  <button onClick={() => setExpandedSection(isExpanded ? null : section.id)} className="flex items-center gap-3 flex-1 text-right">
                    <GripVertical className="h-4 w-4 text-gray-300" />
                    <div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{section.name}</span>
                      <span className="text-[10px] text-gray-400 mr-2">{section.nameEn}</span>
                      {section.description && <span className="block text-[10px] text-gray-400">{section.description}</span>}
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEditSection(section)} className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Edit3 className="h-3 w-3" /></button>
                    <button onClick={() => handleRemoveSection(section.id)} className="h-7 w-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
                    <button onClick={() => setExpandedSection(isExpanded ? null : section.id)} className="h-7 w-7 rounded-lg text-gray-400 flex items-center justify-center">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Section Edit Form */}
                {isEditing && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-800/50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={editSectionName} onChange={(e) => setEditSectionName(e.target.value)} placeholder="اسم القسم" className="h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white" />
                      <input value={editSectionNameEn} onChange={(e) => setEditSectionNameEn(e.target.value)} placeholder="Section Name" className="h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white" />
                      <input value={editSectionDesc} onChange={(e) => setEditSectionDesc(e.target.value)} placeholder="الوصف" className="h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white" />
                      <select value={editSectionIcon} onChange={(e) => setEditSectionIcon(e.target.value)} className="h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white">
                        {iconOptions.map((ic) => <option key={ic.value} value={ic.value}>{ic.label}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveEditSection} className="h-8 px-4 rounded-lg bg-emerald-500 text-white text-xs font-medium flex items-center gap-1"><Check className="h-3 w-3" /> حفظ</button>
                      <button onClick={() => setEditingSection(null)} className="h-8 px-4 rounded-lg border border-gray-200 dark:border-slate-700 text-xs">إلغاء</button>
                    </div>
                  </div>
                )}

                {/* Links */}
                {isExpanded && (
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">الروابط ({sectionLinks.length})</span>
                      <button onClick={() => startAddLink(section.id)} className="h-7 px-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-[10px] font-medium flex items-center gap-1">
                        <Plus className="h-3 w-3" /> رابط
                      </button>
                    </div>

                    {/* Add Link Form */}
                    {showAddLink && (
                      <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} placeholder="اسم الرابط" className="h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white" />
                          <input value={newLinkHref} onChange={(e) => setNewLinkHref(e.target.value)} placeholder="الرابط (اختياري إذا كان هناك محتوى)" className="h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white font-mono" />
                        </div>
                        <input value={newLinkDesc} onChange={(e) => setNewLinkDesc(e.target.value)} placeholder="وصف الرابط (اختياري)" className="w-full h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white" />
                        
                        <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                          <label className="text-[10px] font-bold text-gray-500 mb-1 block">محتوى الصفحة الديناميكي (HTML / نص) - يحل محل الرابط الخارجي</label>
                          <textarea 
                            value={newLinkContent} 
                            onChange={(e) => setNewLinkContent(e.target.value)} 
                            placeholder="اكتب محتوى الصفحة هنا ليتم إنشاؤها كقالب (مثال: الشروط والأحكام، من نحن...)" 
                            className="w-full h-24 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 py-2 dark:text-white resize-y" 
                            dir="auto"
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button onClick={() => handleAddLink(section.id)} className="h-7 px-3 rounded-lg bg-emerald-500 text-white text-[10px] font-medium">إضافة</button>
                          <button onClick={() => setShowNewLink(null)} className="h-7 px-3 rounded-lg border border-gray-200 dark:border-slate-700 text-[10px]">إلغاء</button>
                        </div>
                      </div>
                    )}

                    {/* Links List */}
                    {sectionLinks.map((link) => {
                      const isEditLink = editingLinkId === link.id;
                      const isExpandedLink = expandedLink === link.id;
                      return (
                        <div key={link.id} className="rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30">
                          <div className="flex items-center justify-between p-2">
                            <button onClick={() => setExpandedLink(isExpandedLink ? null : link.id)} className="flex-1 text-right">
                              <span className="text-xs text-gray-900 dark:text-white font-medium">{link.label}</span>
                              <span className="text-[10px] text-gray-400 font-mono mr-2">{link.href}</span>
                            </button>
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEditLink(link)} className="h-6 w-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center"><Edit3 className="h-2.5 w-2.5" /></button>
                              <button onClick={() => { removeFooterLink(link.id); toast.success('تم حذف الرابط'); }} className="h-6 w-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center"><X className="h-2.5 w-2.5" /></button>
                              <button onClick={() => setExpandedLink(isExpandedLink ? null : link.id)} className="h-6 w-6 rounded-md text-gray-400 flex items-center justify-center">
                                {isExpandedLink ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                            </div>
                          </div>
                          {isExpandedLink && !isEditLink && link.description && (
                            <div className="px-2 pb-2 text-[10px] text-gray-400">{link.description}</div>
                          )}
                          {isEditLink && (
                            <div className="p-2 border-t border-gray-100 dark:border-slate-800 space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input value={editLinkLabel} onChange={(e) => setEditLinkLabel(e.target.value)} className="h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white" />
                                <input value={editLinkHref} onChange={(e) => setEditLinkHref(e.target.value)} className="h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white font-mono" />
                              </div>
                              <input value={editLinkDesc} onChange={(e) => setEditLinkDesc(e.target.value)} placeholder="الوصف" className="w-full h-8 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 dark:text-white" />
                              
                              <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                                <label className="text-[10px] font-bold text-gray-500 mb-1 block">محتوى الصفحة الديناميكي (قالب مخصص)</label>
                                <textarea 
                                  value={editLinkContent} 
                                  onChange={(e) => setEditLinkContent(e.target.value)} 
                                  placeholder="محتوى الصفحة..." 
                                  className="w-full h-32 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 py-2 dark:text-white resize-y font-mono" 
                                  dir="ltr"
                                />
                              </div>

                              <div className="flex gap-2 pt-1">
                                <button onClick={saveEditLink} className="h-7 px-3 rounded-lg bg-emerald-500 text-white text-[10px] font-medium">حفظ</button>
                                <button onClick={() => setEditingLinkId(null)} className="h-7 px-3 rounded-lg border border-gray-200 dark:border-slate-700 text-[10px]">إلغاء</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CONTACT */}
      {activeTab === 'contact' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">العنوان</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">رقم الهاتف</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">واتساب المتجر</label>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">واتساب المطور</label>
              <input value={developerWhatsApp} onChange={(e) => setDeveloperWhatsApp(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">اسم المدير</label>
              <input value={managerName} onChange={(e) => setManagerName(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">الرقم الضريبي</label>
              <input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1.5">نسبة الضريبة (%)</label>
              <input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" /></div>
          </div>
          <button onClick={handleSaveContact} disabled={saving} className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? 'جاري الحفظ...' : 'حفظ بيانات التواصل'}
          </button>
        </div>
      )}

      {/* ACCESS */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">كود وصول الأدمن</label>
            <div className="flex items-center gap-2">
              <input type={showCode ? 'text' : 'password'} value={adminAccessCode} onChange={(e) => setAdminAccessCode(e.target.value)} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white font-mono" />
              <button onClick={() => setShowCode(!showCode)} className="h-10 w-10 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500">
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">كود دخول الأدلة (الكاشير / المدير / المطور)</label>
            <div className="flex items-center gap-2">
              <input type={showGuidesCode ? 'text' : 'password'} value={guidesAccessCode} onChange={(e) => setGuidesAccessCode(e.target.value)} placeholder="SAPKEY GUIDES" className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white font-mono" />
              <button onClick={() => setShowGuidesCode(!showGuidesCode)} className="h-10 w-10 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500">
                {showGuidesCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">هذا الكود مطلوب لدخول دليل الكاشير، المدير، والمطور. دليل العميل مفتوح بدون كود.</p>
          </div>
          <button onClick={handleSaveAccess} disabled={saving} className="w-full h-10 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? 'جاري الحفظ...' : 'حفظ إعدادات الوصول'}
          </button>
        </div>
      )}
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
