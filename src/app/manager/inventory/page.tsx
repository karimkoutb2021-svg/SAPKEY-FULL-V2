'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { UnifiedScanner } from '@/components/scanner/unified-scanner';
import { ProductCardModal } from '@/components/scanner/product-card-modal';
import { QRCodeGenerator } from '@/components/scanner/qr-generator';
import { useTableSync, useAutoSync } from '@/hooks/use-realtime-sync';
import { QrCode, ScanLine, Plus, Search, Filter, AlertTriangle, Package, TrendingDown, TrendingUp, Bell } from 'lucide-react';
import { normalizeArabic } from '@/lib/arabic-normalize';
import { productThresholdService } from '@/lib/notification-engine/notification-engine';
import toast from 'react-hot-toast';

const supabase = createClient();

interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  barcode?: string;
  current_qty: number;
  min_qty: number;
  max_qty: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  location?: string;
  last_audit_date?: string;
  created_at: string;
}

export default function InventoryPage() {
  const { data: items, loading, setData: setItems } = useTableSync<StockItem>('stock_items');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'correction'>('add');
  const [adjustReason, setAdjustReason] = useState('');

  // Notification threshold config
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [thresholdProductId, setThresholdProductId] = useState('');
  const [thresholdProductName, setThresholdProductName] = useState('');
  const [customMinStock, setCustomMinStock] = useState(10);
  const [expiryAlertDays, setExpiryAlertDays] = useState(30);

  // QR Scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'qr' | 'barcode'>('barcode');
  const [scannedCode, setScannedCode] = useState('');
  const [productCardOpen, setProductCardOpen] = useState(false);
  const [qrGeneratorOpen, setQrGeneratorOpen] = useState(false);
  const [qrGeneratorValue, setQrGeneratorValue] = useState('');

  // Auto-sync
  useAutoSync();

  async function handleScan(result: { rawValue: string; decodedValue: string; format: string }) {
    const { handleQRAction } = await import('@/components/scanner/unified-scanner');
    const handled = handleQRAction(result.decodedValue);
    if (handled) {
      setScannerOpen(false);
      return;
    }
    setScannedCode(result.decodedValue || result.rawValue);
    setProductCardOpen(true);
    setScannerOpen(false);
  }

  async function handleAdjustment() {
    if (!selectedItem || !adjustQty) return;

    const item = items.find(i => i.id === selectedItem);
    if (!item) return;

    const numQty = parseFloat(adjustQty);
    const balanceBefore = item.current_qty;
    let balanceAfter = balanceBefore;

    if (adjustType === 'add') balanceAfter = balanceBefore + numQty;
    else if (adjustType === 'remove') balanceAfter = balanceBefore - numQty;
    else balanceAfter = numQty;

    await supabase.from('stock_adjustments').insert({
      stock_id: selectedItem,
      type: adjustType,
      quantity: numQty,
      reason: adjustReason,
      performed_at: new Date().toISOString(),
      balance_before: balanceBefore,
      balance_after: balanceAfter,
    });

    await supabase.from('stock_items').update({
      current_qty: balanceAfter,
      updated_at: new Date().toISOString(),
    }).eq('id', selectedItem);

    setShowModal(false);
    setAdjustQty('');
    setAdjustReason('');
  }

  const filtered = items.filter(item => {
    const matchesSearch = normalizeArabic(item.product_name).includes(normalizeArabic(search)) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      (item.barcode && item.barcode.includes(search));
    const matchesFilter = filter === 'all' ||
      (filter === 'low' && item.current_qty <= item.min_qty && item.current_qty > 0) ||
      (filter === 'out' && item.current_qty === 0) ||
      (filter === 'ok' && item.current_qty > item.min_qty);
    return matchesSearch && matchesFilter;
  });

  const lowStockCount = items.filter(i => i.current_qty <= i.min_qty && i.current_qty > 0).length;
  const outOfStockCount = items.filter(i => i.current_qty === 0).length;
  const totalValue = items.reduce((sum, i) => sum + (i.current_qty * i.cost_price), 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 font-medium">إجمالي الأصناف</p>
              <p className="text-3xl font-black text-white mt-1 tracking-tight">{items.length}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Package className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-400/80 font-medium">منخفض المخزون</p>
              <p className="text-3xl font-black text-amber-400 mt-1 tracking-tight">{lowStockCount}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <TrendingDown className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-sm text-red-400/80 font-medium">نفذ من المخزون</p>
              <p className="text-3xl font-black text-red-400 mt-1 tracking-tight">{outOfStockCount}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-400/80 font-medium">قيمة المخزون</p>
              <p className="text-2xl font-black text-emerald-400 mt-1 tracking-tight">{totalValue.toLocaleString('ar-EG')} <span className="text-sm font-medium">ج.م</span></p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-6">
        <div className="flex flex-col xl:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو SKU أو الباركود..."
              className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setScannerMode('barcode'); setScannerOpen(true); }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-500/10 border border-blue-500/20 text-blue-400 hover:from-blue-600/30 hover:to-blue-500/20 transition-all font-medium text-sm shadow-lg shadow-blue-500/5"
            >
              <ScanLine size={18} />
              <span className="hidden sm:inline">باركود</span>
            </button>
            <button
              onClick={() => { setScannerMode('qr'); setScannerOpen(true); }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-500/10 border border-purple-500/20 text-purple-400 hover:from-purple-600/30 hover:to-purple-500/20 transition-all font-medium text-sm shadow-lg shadow-purple-500/5"
            >
              <QrCode size={18} />
              <span className="hidden sm:inline">QR</span>
            </button>
            <button
              onClick={() => setQrGeneratorOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-br from-violet-600/20 to-violet-500/10 border border-violet-500/20 text-violet-400 hover:from-violet-600/30 hover:to-violet-500/20 transition-all font-medium text-sm shadow-lg shadow-violet-500/5"
            >
              <QrCode size={18} />
              <span className="hidden sm:inline">توليد QR</span>
            </button>
            <div className="flex bg-white/[0.02] border border-white/[0.06] rounded-2xl p-1 gap-1">
              {([['all', 'الكل'], ['ok', 'متوفر'], ['low', 'منخفض'], ['out', 'نفذ']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)} className={cn('px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300',
                  filter === key ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                )}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-emerald-500/50">
            <span className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400 font-medium">جاري تحميل البيانات...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Package className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">لا توجد نتائج مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-[#0A0A0C]/50 border border-white/[0.04]">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02]">
                <tr className="border-b border-white/[0.06] text-gray-400">
                  <th className="text-right py-4 px-4 font-semibold">المنتج</th>
                  <th className="text-right py-4 px-4 font-semibold">SKU</th>
                  <th className="text-center py-4 px-4 font-semibold">الكمية</th>
                  <th className="text-center py-4 px-4 font-semibold">الحد الأدنى</th>
                  <th className="text-right py-4 px-4 font-semibold">التكلفة</th>
                  <th className="text-right py-4 px-4 font-semibold">البيع</th>
                  <th className="text-center py-4 px-4 font-semibold">الحالة</th>
                  <th className="text-center py-4 px-4 font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const status = item.current_qty === 0 ? 'out' : item.current_qty <= item.min_qty ? 'low' : 'ok';
                  return (
                    <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors group">
                      <td className="py-4 px-4 font-bold text-white">{item.product_name}</td>
                      <td className="py-4 px-4 text-gray-400 font-mono text-xs">{item.sku}</td>
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.04]">
                          <span className="font-black text-white">{item.current_qty}</span>
                          <span className="text-xs text-gray-500">{item.unit}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-400">{item.min_qty}</td>
                      <td className="py-4 px-4 text-right text-emerald-400/80">{item.cost_price.toLocaleString('ar-EG')}</td>
                      <td className="py-4 px-4 text-right text-emerald-400 font-medium">{item.selling_price.toLocaleString('ar-EG')}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={cn('text-xs px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 border',
                          status === 'out' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          status === 'low' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        )}>
                          {status === 'out' ? <AlertTriangle size={12} /> : status === 'low' ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                          {status === 'out' ? 'نفذ' : status === 'low' ? 'منخفض' : 'متوفر'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setSelectedItem(item.id); setShowModal(true); }} className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-sm text-gray-300 hover:text-white hover:bg-white/[0.1] transition-all border border-white/[0.04]">
                            تعديل
                          </button>
                          <button onClick={() => { setThresholdProductId(item.product_id); setThresholdProductName(item.product_name); setThresholdModalOpen(true); }} className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-sm hover:bg-amber-500/20 transition-all border border-amber-500/20 flex items-center gap-1.5" title="تعيين حد التنبيه">
                            <Bell size={14} /> <span>حد</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0C]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] p-8 shadow-2xl shadow-emerald-500/10 space-y-6" dir="rtl">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">تعديل المخزون</h3>
              <p className="text-sm text-gray-400">أدخل البيانات لتعديل رصيد المخزون الفعلي.</p>
            </div>

            <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              {([['add', 'إضافة'], ['remove', 'سحب'], ['correction', 'تصحيح']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setAdjustType(key)} className={cn('flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300',
                  adjustType === key ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                )}>{label}</button>
              ))}
            </div>

            <div className="space-y-4">
              <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all [&>option]:bg-[#111114]">
                <option value="">اختر المنتج</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.product_name} ({i.current_qty} {i.unit})</option>)}
              </select>

              <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder={adjustType === 'correction' ? 'الكمية الصحيحة' : 'الكمية'} className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />

              <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="السبب (اختياري)" className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold">إلغاء</button>
              <button onClick={handleAdjustment} className="flex-1 py-3.5 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all">تأكيد التعديل</button>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Config Modal */}
      {thresholdModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0C]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] p-8 shadow-2xl shadow-emerald-500/10 space-y-6" dir="rtl">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">حد التنبيه - <span className="text-emerald-400">{thresholdProductName}</span></h3>
              <p className="text-sm text-gray-400">يمكنك تخصيص حد المخزون المنخفض وأيام تنبيه الصلاحية لهذا المنتج</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400">الحد الأدنى المخصص للمخزون</label>
                <input type="number" value={customMinStock} onChange={e => setCustomMinStock(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all font-mono" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400">أيام التنبيه قبل انتهاء الصلاحية</label>
                <input type="number" value={expiryAlertDays} onChange={e => setExpiryAlertDays(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all font-mono" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setThresholdModalOpen(false)} className="flex-1 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold">إلغاء</button>
              <button onClick={async () => {
                try {
                  await productThresholdService.upsert({ product_id: thresholdProductId, custom_min_stock: customMinStock, expiry_alert_days: expiryAlertDays });
                  toast.success('تم حفظ حد التنبيه');
                  setThresholdModalOpen(false);
                } catch { toast.error('فشل الحفظ'); }
              }} className="flex-1 py-3.5 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all">حفظ الإعدادات</button>
            </div>
          </div>
        </div>
      )}

      {/* QR/Barcode Scanner */}
      <UnifiedScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        mode={scannerMode}
      />

      {/* Product Card */}
      <ProductCardModal
        isOpen={productCardOpen}
        onClose={() => setProductCardOpen(false)}
        scannedCode={scannedCode}
        mode={scannerMode}
      />

      {/* QR Code Generator */}
      <QRCodeGenerator
        isOpen={qrGeneratorOpen}
        onClose={() => setQrGeneratorOpen(false)}
        initialValue={qrGeneratorValue}
      />
    </div>
  );
}
