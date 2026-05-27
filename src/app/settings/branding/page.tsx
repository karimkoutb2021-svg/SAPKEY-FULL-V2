'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTransition } from '@/components/ui/page-transition';
import { BackButton } from '@/components/layout/back-button';
import { useBrandingStore, DEFAULT_BRANDING } from '@/lib/store/branding-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { Save, Image, Palette, Type, Smartphone, MapPin, Phone, CreditCard, Store, Eye, RotateCcw, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BrandingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { branding, updateBranding, resetBranding } = useBrandingStore();
  const [logoPreview, setLogoPreview] = useState(branding.logo || '');
  const [faviconPreview, setFaviconPreview] = useState(branding.favicon || '');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user?.role !== 'admin') {
      toast.error('هذه الصفحة متاحة للمطور فقط');
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">صلاحية محدودة</h2>
          <p className="text-sm text-gray-500">هذه الصفحة متاحة للمطور فقط</p>
        </div>
      </div>
    );
  }

  const update = (key: string, value: string) => {
    updateBranding({ [key]: value });
    if (key === 'logo') setLogoPreview(value);
    if (key === 'favicon') setFaviconPreview(value);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setLogoPreview(dataUrl);
        updateBranding({ logo: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setFaviconPreview(dataUrl);
        updateBranding({ favicon: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    toast.success('تم حفظ العلامة التجارية');
  };

  const handleReset = () => {
    resetBranding();
    setLogoPreview('');
    setFaviconPreview('');
    toast.success('تم إعادة تعيين العلامة التجارية');
  };

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl">
        <BackButton label="الإعدادات" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">العلامة التجارية</h1>
            <p className="text-muted-foreground">تخصيص مظهر النظام بالكامل</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}><RotateCcw className="h-4 w-4 ml-1" /> إعادة تعيين</Button>
            <Button onClick={handleSave}><Save className="h-4 w-4 ml-1" /> حفظ</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Image className="h-4 w-4" /> الشعار</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="h-24 w-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden mx-auto" style={{ borderColor: branding.primaryColor + '40' }}>
                {logoPreview ? <img src={logoPreview} className="h-full w-full object-contain" /> : <Store className="h-8 w-8 text-gray-300" />}
              </div>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs text-gray-400 w-full" />
              <Input label="اسم المتجر" value={branding.storeName} onChange={(e) => update('storeName', e.target.value)} />
              <Input label="الاسم بالإنجليزية" value={branding.storeNameEn} onChange={(e) => update('storeNameEn', e.target.value)} />
              <Input label="الشعار النصي" value={branding.slogan} onChange={(e) => update('slogan', e.target.value)} />
            </CardContent>
          </Card>

          {/* Favicon */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Image className="h-4 w-4" /> أيقونة المتصفح</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="h-16 w-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden mx-auto">
                {faviconPreview ? <img src={faviconPreview} className="h-full w-full object-contain" /> : <Store className="h-6 w-6 text-gray-300" />}
              </div>
              <input type="file" accept="image/*" onChange={handleFaviconUpload} className="text-xs text-gray-400 w-full" />
              <p className="text-xs text-gray-400">يظهر في علامة تبويب المتصفح (يفضل 32x32 أو 64x64)</p>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Palette className="h-4 w-4" /> الألوان</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">اللون الرئيسي</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={branding.primaryColor} onChange={(e) => update('primaryColor', e.target.value)} className="h-10 w-16 rounded-lg cursor-pointer border" />
                  <input type="text" value={branding.primaryColor} onChange={(e) => update('primaryColor', e.target.value)} className="flex-1 h-10 px-3 rounded-lg border text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">اللون الثانوي</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={branding.secondaryColor} onChange={(e) => update('secondaryColor', e.target.value)} className="h-10 w-16 rounded-lg cursor-pointer border" />
                  <input type="text" value={branding.secondaryColor} onChange={(e) => update('secondaryColor', e.target.value)} className="flex-1 h-10 px-3 rounded-lg border text-sm font-mono" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">لون الخلفية</label>
                <input type="color" value={branding.backgroundColor} onChange={(e) => update('backgroundColor', e.target.value)} className="h-10 w-16 rounded-lg cursor-pointer border" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">لون النص</label>
                <input type="color" value={branding.textColor} onChange={(e) => update('textColor', e.target.value)} className="h-10 w-16 rounded-lg cursor-pointer border" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">لون خلفية الهيدر</label>
                <input type="color" value={branding.headerBg} onChange={(e) => update('headerBg', e.target.value)} className="h-10 w-16 rounded-lg cursor-pointer border" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">لون خلفية القائمة الجانبية</label>
                <input type="color" value={branding.sidebarBg} onChange={(e) => update('sidebarBg', e.target.value)} className="h-10 w-16 rounded-lg cursor-pointer border" />
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> معلومات المتجر</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input label="العنوان" value={branding.address} onChange={(e) => update('address', e.target.value)} icon={<MapPin className="h-4 w-4" />} />
              <Input label="رقم الهاتف" value={branding.phone} onChange={(e) => update('phone', e.target.value)} icon={<Phone className="h-4 w-4" />} />
              <Input label="رقم واتساب" value={branding.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} icon={<Smartphone className="h-4 w-4" />} />
              <Input label="الرقم الضريبي" value={branding.taxNumber} onChange={(e) => update('taxNumber', e.target.value)} icon={<CreditCard className="h-4 w-4" />} />
            </CardContent>
          </Card>

          {/* Footer */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Type className="h-4 w-4" /> التذييل</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input label="نص التذييل" value={branding.footer} onChange={(e) => update('footer', e.target.value)} />
              <p className="text-xs text-gray-400">يظهر في أسفل الفواتير وصفحات النظام</p>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4" /> معاينة حية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-6 rounded-2xl border" style={{ borderColor: branding.primaryColor + '30', backgroundColor: branding.backgroundColor }}>
              <div className="text-center">
                {logoPreview && <img src={logoPreview} className="h-16 mx-auto mb-2" />}
                <h2 className="text-xl font-bold" style={{ color: branding.primaryColor }}>{branding.storeName}</h2>
                <p className="text-sm" style={{ color: branding.textColor + '99' }}>{branding.slogan}</p>
                <p className="text-xs mt-2" style={{ color: branding.textColor + '80' }}>{branding.address} | {branding.phone}</p>
                <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: branding.primaryColor + '15' }}>
                  <p className="text-xs" style={{ color: branding.textColor + '80' }}>معاينة الهيدر</p>
                  <div className="flex items-center justify-between mt-2 p-2 rounded-lg" style={{ backgroundColor: branding.headerBg, border: '1px solid ' + branding.primaryColor + '20' }}>
                    <span className="text-sm font-bold" style={{ color: branding.headerText }}>{branding.storeName}</span>
                    <span className="text-xs" style={{ color: branding.sidebarText }}>{branding.slogan}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <div className="w-1/3 p-2 rounded-lg text-xs" style={{ backgroundColor: branding.sidebarBg, color: branding.sidebarText, border: '1px solid ' + branding.primaryColor + '20' }}>
                      القائمة
                    </div>
                    <div className="flex-1 p-2 rounded-lg text-xs text-center" style={{ color: branding.textColor }}>
                      محتوى الصفحة
                    </div>
                  </div>
                </div>
                <p className="text-xs mt-4" style={{ color: branding.textColor + '60' }}>{branding.footer}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              يتم تطبيق التغييرات تلقائياً على جميع صفحات النظام. يمكنك معاينة التغييرات مباشرة.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
