'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { notificationRuleService, productThresholdService, cashThresholdService, type RuleSetting } from '@/lib/notification-engine/notification-engine';
import type { NotificationType } from '@/types/erp';
import Link from 'next/link';

const supabase = createClient();

const RULE_LABELS: Record<string, { labelAr: string; desc: string; icon: string }> = {
  low_stock: { labelAr: 'تنبيهات المخزون', desc: 'إشعار عند وصول المخزون للحد الأدنى لكل منتج', icon: '📦' },
  expiry_alert: { labelAr: 'تنبيهات الصلاحية', desc: 'إشعار مجدول قبل انتهاء صلاحية المنتجات', icon: '⏰' },
  return_request: { labelAr: 'طلبات الإرجاع', desc: 'إشعار فوري عند طلب كاشير إرجاع منتج', icon: '↩️' },
  invoice_cancelled: { labelAr: 'الفواتير الملغاة', desc: 'تنبيه عند إلغاء فاتورة مبيعات', icon: '🗑️' },
  invoice_modified: { labelAr: 'الفواتير المعدلة', desc: 'تنبيه عند تعديل فاتورة مبيعات', icon: '✏️' },
  cash_threshold: { labelAr: 'حد الكاش الآمن', desc: 'تنبيه عند تجاوز النقدية في الصندوق للسقف الآمن', icon: '🏦' },
  due_date: { labelAr: 'مواعيد الاستحقاق', desc: 'تذكير بفاتورات المشتريات المستحقة', icon: '📅' },
  overdue: { labelAr: 'الفواتير المتأخرة', desc: 'تنبيه عند تأخر فاتورة عن موعد استحقاقها', icon: '⚠️' },
  approval: { labelAr: 'المعاملات المالية', desc: 'تأكيد المعاملات المالية الكبيرة', icon: '✅' },
  payment_reminder: { labelAr: 'تذكير الدفع', desc: 'تذكير بمواعيد الدفع المستحقة', icon: '💳' },
  balance_alert: { labelAr: 'تنبيهات الرصيد', desc: 'تنبيه عند انخفاض رصيد الخزينة', icon: '💰' },
  transfer_alert: { labelAr: 'تنبيهات التحويل', desc: 'إشعار عند إتمام تحويل مخزني', icon: '🔄' },
  system_alert: { labelAr: 'تنبيهات النظام', desc: 'إشعارات فنية وإدارية من النظام', icon: '🛡️' },
};

export default function NotificationSettingsPage() {
  const [rules, setRules] = useState<RuleSetting[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name_ar: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'products' | 'cash'>('rules');
  const [searchProduct, setSearchProduct] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [productThresholds, setProductThresholds] = useState<any[]>([]);
  const [cashConfigs, setCashConfigs] = useState<any[]>([]);
  const [showAddProductThreshold, setShowAddProductThreshold] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesData, empsData, thresholdsData, cashData] = await Promise.all([
        notificationRuleService.getAll().catch(() => []),
        supabase.from('users').select('id, full_name_ar').eq('is_active', true),
        productThresholdService.getAll().catch(() => []),
        cashThresholdService.getAll().catch(() => []),
      ]);
      setRules(rulesData.length > 0 ? rulesData : await notificationRuleService.getDefaults());
      setEmployees((empsData.data as any) || []);
      setProductThresholds(thresholdsData);
      setCashConfigs(cashData);
    } catch (e) {
      console.error(e);
      setRules(await notificationRuleService.getDefaults());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel('sync-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleToggle = async (index: number, field: keyof RuleSetting, value: any) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);

    const rule = updated[index];
    if (rule.id) {
      setSaving(rule.type);
      await notificationRuleService.update(rule.id, { [field]: value });
      setSaving(null);
    }
  };

  const handleDelegation = async (index: number, delegated_to: string | null) => {
    await handleToggle(index, 'delegated_to', delegated_to);
  };

  const handleSaveAll = async () => {
    setLoading(true);
    for (const rule of rules) {
      if (rule.id) {
        await notificationRuleService.update(rule.id, {
          enabled: rule.enabled,
          delegated_to: rule.delegated_to,
          requires_biometric: rule.requires_biometric,
          threshold_value: rule.threshold_value,
          advance_days: rule.advance_days,
        });
      }
    }
    setLoading(false);
  };

  const handleAddProductThreshold = async (data: {
    product_id: string;
    custom_min_stock: number;
    expiry_alert_days: number;
  }) => {
    await productThresholdService.upsert(data);
    setShowAddProductThreshold(false);
    fetchData();
  };

  const handleDeleteThreshold = async (id: string) => {
    await productThresholdService.delete(id);
    fetchData();
  };

  const saveCashConfig = async (config: any) => {
    await cashThresholdService.upsert(config);
    fetchData();
  };

  const handleSearchProduct = async (q: string) => {
    setSearchProduct(q);
    if (q.length < 2) { setProducts([]); return; }
    const { data } = await supabase
      .from('products')
      .select('id, name_ar, sku')
      .or(`name_ar.ilike.%${q}%,sku.ilike.%${q}%`)
      .limit(10);
    setProducts((data as any) || []);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">إعدادات الإشعارات</h1>
          <p className="text-sm text-white/50 mt-1">تحكم كامل في أنواع التنبيهات وصلاحياتها</p>
        </div>
        <Link href="/manager/notifications" className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] transition-colors">
          العودة للإشعارات
        </Link>
      </div>

      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
        {[
          { key: 'rules', label: 'قواعد الإشعارات', icon: '⚙️' },
          { key: 'products', label: 'حدود المنتجات', icon: '📦' },
          { key: 'cash', label: 'حد الكاش', icon: '🏦' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-sm transition-colors ${
              activeTab === tab.key ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/60 hover:bg-white/[0.04]'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
        <button onClick={handleSaveAll} className="mr-auto px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30">
          حفظ الكل
        </button>
      </div>

      {loading && (
        <div className="text-center py-12 text-white/40">جاري التحميل...</div>
      )}

      {!loading && activeTab === 'rules' && (
        <div className="space-y-3">
          {rules.map((rule, idx) => {
            const info = RULE_LABELS[rule.type] || { labelAr: rule.type, desc: '', icon: '🔔' };
            return (
              <div key={rule.type} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{info.labelAr}</p>
                      <p className="text-xs text-white/50">{info.desc}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={rule.enabled} onChange={() => handleToggle(idx, 'enabled', !rule.enabled)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/[0.08] rounded-full peer peer-checked:bg-emerald-500/50 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
                {rule.enabled && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
                    {rule.delegable && (
                      <div>
                        <label className="text-xs text-white/50 mb-1 block">تفويض إلى</label>
                        <select value={rule.delegated_to || ''} onChange={e => handleDelegation(idx, e.target.value || null)}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70">
                          <option value="">بدون تفويض</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.full_name_ar}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">قفل ببصمة الوجه</label>
                      <label className="relative inline-flex items-center cursor-pointer mt-2">
                        <input type="checkbox" checked={rule.requires_biometric} onChange={() => handleToggle(idx, 'requires_biometric', !rule.requires_biometric)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-white/[0.08] rounded-full peer peer-checked:bg-emerald-500/50 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                      </label>
                    </div>
                    {rule.type === 'cash_threshold' && (
                      <div>
                        <label className="text-xs text-white/50 mb-1 block">الحد الآمن (ج.م)</label>
                        <input type="number" value={rule.threshold_value || 50000} onChange={e => handleToggle(idx, 'threshold_value', parseInt(e.target.value) || 50000)}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70" />
                      </div>
                    )}
                    {rule.type === 'expiry_alert' && (
                      <div>
                        <label className="text-xs text-white/50 mb-1 block">أيام التنبيه المسبق</label>
                        <input type="number" value={rule.advance_days || 30} onChange={e => handleToggle(idx, 'advance_days', parseInt(e.target.value) || 30)}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70" />
                      </div>
                    )}
                    {saving === rule.type && <span className="text-xs text-emerald-400">جاري الحفظ...</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input value={searchProduct} onChange={e => handleSearchProduct(e.target.value)} placeholder="ابحث عن منتج..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 placeholder-white/30" />
            <button onClick={() => setShowAddProductThreshold(true)} className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30">
              + إضافة حد
            </button>
          </div>

          {showAddProductThreshold && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <p className="text-sm text-white font-medium">إضافة حد مخزون مخصص</p>
              <AddProductThresholdForm products={products} searchProduct={searchProduct} handleSearchProduct={handleSearchProduct} onSubmit={handleAddProductThreshold} onCancel={() => setShowAddProductThreshold(false)} />
            </div>
          )}

          <div className="space-y-2">
            {productThresholds.map((pt: any) => (
              <div key={pt.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{pt.products?.name_ar || pt.product_id}</p>
                  <p className="text-xs text-white/50 mt-0.5">الحد: {pt.custom_min_stock} | أيام الصلاحية: {pt.expiry_alert_days || '-'}</p>
                  {pt.warehouses?.name_ar && <p className="text-[10px] text-white/30">المخزن: {pt.warehouses.name_ar}</p>}
                </div>
                <button onClick={() => handleDeleteThreshold(pt.id)} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30">
                  حذف
                </button>
              </div>
            ))}
            {productThresholds.length === 0 && (
              <p className="text-center text-white/30 py-8">لم يتم تعيين حدود مخصصة لأي منتج بعد</p>
            )}
          </div>
        </div>
      )}

      {!loading && activeTab === 'cash' && (
        <div className="space-y-4">
          <p className="text-sm text-white/60">تحديد السقف الآمن للنقدية في نقاط البيع - عند تجاوزه يتم إرسال تنبيه للمدير</p>
          {cashConfigs.map((cfg: any) => (
            <div key={cfg.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">الحد الآمن (ج.م)</label>
                  <input type="number" defaultValue={cfg.safe_limit} onBlur={e => saveCashConfig({ ...cfg, safe_limit: parseInt(e.target.value) || cfg.safe_limit })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">الفرع</label>
                  <input value={cfg.branch_id || 'جميع الفروع'} disabled className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/50" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">مفعل</label>
                  <label className="relative inline-flex items-center cursor-pointer mt-2">
                    <input type="checkbox" defaultChecked={cfg.enabled} onChange={e => saveCashConfig({ ...cfg, enabled: e.target.checked })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/[0.08] rounded-full peer peer-checked:bg-emerald-500/50 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">إخطار المدير</label>
                  <label className="relative inline-flex items-center cursor-pointer mt-2">
                    <input type="checkbox" defaultChecked={cfg.notify_manager} onChange={e => saveCashConfig({ ...cfg, notify_manager: e.target.checked })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/[0.08] rounded-full peer peer-checked:bg-emerald-500/50 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
              </div>
            </div>
          ))}
          {cashConfigs.length === 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">الحد الآمن (ج.م)</label>
                  <input type="number" defaultValue={50000} id="new-safe-limit"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70" />
                </div>
              </div>
              <button onClick={() => {
                const val = (document.getElementById('new-safe-limit') as HTMLInputElement)?.value;
                saveCashConfig({ safe_limit: parseInt(val) || 50000, enabled: true, notify_manager: true });
              }} className="mt-3 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30">
                إنشاء الإعداد
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddProductThresholdForm({ products, searchProduct, handleSearchProduct, onSubmit, onCancel }: {
  products: any[];
  searchProduct: string;
  handleSearchProduct: (q: string) => void;
  onSubmit: (data: { product_id: string; custom_min_stock: number; expiry_alert_days: number }) => void;
  onCancel: () => void;
}) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [customMin, setCustomMin] = useState(10);
  const [expiryDays, setExpiryDays] = useState(30);

  return (
    <div className="space-y-3">
      <div>
        <input value={searchProduct} onChange={e => handleSearchProduct(e.target.value)} placeholder="ابحث عن منتج..."
          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 placeholder-white/30" />
        {products.length > 0 && !selectedProduct && (
          <div className="mt-1 bg-[#111114] border border-white/[0.06] rounded-xl max-h-32 overflow-y-auto">
            {products.map(p => (
              <button key={p.id} onClick={() => { setSelectedProduct(p); handleSearchProduct(''); }}
                className="w-full text-right px-3 py-2 text-sm text-white/70 hover:bg-white/[0.04] transition-colors">
                {p.name_ar} ({p.sku})
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedProduct && (
        <>
          <p className="text-sm text-emerald-400">المنتج المختار: {selectedProduct.name_ar} ({selectedProduct.sku})</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">الحد الأدنى المخصص</label>
              <input type="number" value={customMin} onChange={e => setCustomMin(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">أيام التنبيه للصلاحية</label>
              <input type="number" value={expiryDays} onChange={e => setExpiryDays(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onSubmit({ product_id: selectedProduct.id, custom_min_stock: customMin, expiry_alert_days: expiryDays })}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30">
              حفظ
            </button>
            <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/[0.04] text-white/60 text-sm hover:bg-white/[0.08]">
              إلغاء
            </button>
          </div>
        </>
      )}
    </div>
  );
}
