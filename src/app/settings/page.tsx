'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/lib/store/app-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import { Save, Store, Bell, Palette, Shield, CreditCard, Globe, Smartphone, Image, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const BASE_TABS = [
  { key: 'general', label: 'عام', icon: Store },
  { key: 'appearance', label: 'المظهر', icon: Palette },
  { key: 'branding', label: 'العلامة التجارية', icon: Image, adminOnly: true },
  { key: 'notifications', label: 'الإشعارات', icon: Bell },
  { key: 'payment', label: 'الدفع', icon: CreditCard },
  { key: 'whatsapp', label: 'واتساب', icon: Globe },
  { key: 'pwa', label: 'التطبيق', icon: Smartphone },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { branding, updateBranding } = useBrandingStore();
  const { user } = useAuthStore();
  const router = useRouter();

  const tabs = BASE_TABS.filter((t) => !t.adminOnly || user?.role === 'admin');

  // Reset tab if current one hidden
  useEffect(() => {
    const available = tabs.map((t) => t.key);
    if (!available.includes(activeTab)) setActiveTab(available[0] || 'general');
  }, [user?.role, activeTab, tabs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الإعدادات</h1>
          <p className="text-muted-foreground">إعدادات النظام والمتجر</p>
        </div>
        <Button onClick={() => toast.success('تم حفظ الإعدادات')}><Save className="h-4 w-4 ml-1" /> حفظ التغييرات</Button>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        <Card className="lg:w-64 w-full h-fit">
          <CardContent className="p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-right ${
                    activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                  {tab.key === 'branding' && <ChevronLeft className="h-3 w-3 mr-auto" />}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">
              {activeTab === 'general' && 'الإعدادات العامة'}
              {activeTab === 'notifications' && 'إعدادات الإشعارات'}
              {activeTab === 'appearance' && 'المظهر والواجهة'}
              {activeTab === 'branding' && 'العلامة التجارية'}
              {activeTab === 'payment' && 'طرق الدفع'}
              {activeTab === 'whatsapp' && 'إعدادات واتساب'}
              {activeTab === 'pwa' && 'إعدادات التطبيق'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTab === 'branding' && (
              <>
                <div className="space-y-4">
                  <Input label="اسم المتجر" value={branding.storeName} onChange={(e) => updateBranding({ storeName: e.target.value })} />
                  <Input label="الاسم بالإنجليزية" value={branding.storeNameEn} onChange={(e) => updateBranding({ storeNameEn: e.target.value })} />
                  <Input label="الشعار النصي" value={branding.slogan} onChange={(e) => updateBranding({ slogan: e.target.value })} />
                  <div>
                    <label className="block text-sm font-medium mb-1">اللون الرئيسي</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={branding.primaryColor} onChange={(e) => updateBranding({ primaryColor: e.target.value })} className="h-10 w-16 rounded-lg cursor-pointer border" />
                      <input type="text" value={branding.primaryColor} onChange={(e) => updateBranding({ primaryColor: e.target.value })} className="flex-1 h-10 px-3 rounded-lg border text-sm font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">اللون الثانوي</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={branding.secondaryColor} onChange={(e) => updateBranding({ secondaryColor: e.target.value })} className="h-10 w-16 rounded-lg cursor-pointer border" />
                      <input type="text" value={branding.secondaryColor} onChange={(e) => updateBranding({ secondaryColor: e.target.value })} className="flex-1 h-10 px-3 rounded-lg border text-sm font-mono" />
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <Button variant="outline" onClick={() => router.push('/settings/branding')}>
                    <Image className="h-4 w-4 ml-1" /> إعدادات العلامة التجارية المتقدمة
                  </Button>
                </div>
              </>
            )}

            {activeTab === 'appearance' && (
              <>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">المظهر الفاتح</p>
                    <p className="text-sm text-muted-foreground">النظام يعمل بالوضع الفاتح فقط (Apple Style)</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">مفعّل ✓</div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">اللغة</label>
                  <Select value="ar">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {activeTab === 'general' && (
              <>
                <Input label="اسم المتجر" placeholder="السوبر ماركت" defaultValue={branding.storeName} />
                <Input label="رقم الهاتف" placeholder="+20 5X XXX XXXX" defaultValue={branding.phone} />
                <Input label="البريد الإلكتروني" type="email" placeholder="info@supermarket.com" />
                <Input label="العنوان" placeholder="مصر، القاهرة" defaultValue={branding.address} />
              </>
            )}
            {activeTab === 'whatsapp' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">رقم واتساب المدير (صاحب السوبر ماركت)</label>
                  <input type="text" value={branding.whatsapp} onChange={(e) => updateBranding({ whatsapp: e.target.value.replace(/[^0-9+ ]/g, '') })}
                    className="w-full h-10 px-3 rounded-lg border text-sm font-mono" dir="ltr" placeholder="2010XXXXXXXX" />
                  <p className="text-[10px] text-muted-foreground mt-1">الرقم ده هيظهر في رسائل الإشعارات اللي بتروح للمطور</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">اسم المدير</label>
                  <input type="text" value={branding.managerName} onChange={(e) => updateBranding({ managerName: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border text-sm" placeholder="اسم صاحب السوبر ماركت" />
                </div>
                <Input label="رسالة الترحيب" placeholder="مرحباً بك في السوبر ماركت الذكي!" />
              </>
            )}
            {activeTab === 'notifications' && (
              <>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">إشعارات الطلبات الجديدة</p>
                    <p className="text-sm text-muted-foreground">تلقي إشعار عند وصول طلب جديد</p>
                  </div>
                  <Switch checked={true} />
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">إشعارات نقص المخزون</p>
                    <p className="text-sm text-muted-foreground">تلقي تنبيه عندما يقل مخزون منتج عن الحد الأدنى</p>
                  </div>
                  <Switch checked={true} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">تنبيهات النظام المحاسبي</p>
                    <p className="text-sm text-muted-foreground">تلقي تنبيهات عن المعاملات المالية والمصروفات</p>
                  </div>
                  <Switch checked={false} />
                </div>
              </>
            )}
            {activeTab === 'payment' && (
              <>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">الدفع عند الاستلام</p>
                    <p className="text-sm text-muted-foreground">تفعيل خيار الدفع نقداً عند استلام الطلب</p>
                  </div>
                  <Switch checked={true} />
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">البطاقات الائتمانية</p>
                    <p className="text-sm text-muted-foreground">تفعيل الدفع بالبطاقات البنكية</p>
                  </div>
                  <Switch checked={true} />
                </div>
                <Input label="مفتاح واجهة الدفع (API Key)" placeholder="sk_test_..." type="password" />
              </>
            )}
            {activeTab === 'pwa' && (
              <>
                <Input label="الاسم المختصر للتطبيق" placeholder="المتجر" defaultValue="سوبر ماركت" />
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">لون المظهر</label>
                  <Select value="#22C55E">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="#22C55E">أخضر (الافتراضي)</SelectItem>
                      <SelectItem value="#3B82F6">أزرق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-2 mt-2">
                  <div>
                    <p className="font-medium">تفعيل التثبيت</p>
                    <p className="text-sm text-muted-foreground">السماح للمستخدمين بتثبيت التطبيق على هواتفهم</p>
                  </div>
                  <Switch checked={true} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
