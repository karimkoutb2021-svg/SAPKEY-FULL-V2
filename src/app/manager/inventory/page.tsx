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
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <p className="text-sm text-gray-400">إجمالي الأصناف</p>
          <p className="text-2xl font-bold mt-1">{items.length}</p>
        </div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5">
          <p className="text-sm text-amber-400/70">منخفض المخزون</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{lowStockCount}</p>
        </div>
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5">
          <p className="text-sm text-red-400/70">نفذ من المخزون</p>
          <p className="text-2xl font-bold mt-1 text-red-400">{outOfStockCount}</p>
        </div>
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5">
          <p className="text-sm text-emerald-400/70">قيمة المخزون</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{totalValue.toLocaleString('ar-EG')} <span className="text-sm">ج.م</span></p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو SKU أو الباركود..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setScannerMode('barcode'); setScannerOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm"
            >
              <ScanLine size={16} />
              باركود
            </button>
            <button
              onClick={() => { setScannerMode('qr'); setScannerOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-sm"
            >
              <QrCode size={16} />
              QR
            </button>
            <button
              onClick={() => setQrGeneratorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors text-sm"
            >
              <QrCode size={16} />
              توليد QR
            </button>
            {([['all', 'الكل'], ['ok', 'متوفر'], ['low', 'منخفض'], ['out', 'نفذ']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)} className={cn('px-4 py-2 rounded-xl text-sm transition-colors',
                filter === key ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
              )}>{label}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">لا توجد نتائج</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-gray-400">
                  <th className="text-right py-3 px-2 font-medium">المنتج</th>
                  <th className="text-right py-3 px-2 font-medium">SKU</th>
                  <th className="text-center py-3 px-2 font-medium">الكمية</th>
                  <th className="text-center py-3 px-2 font-medium">الحد الأدنى</th>
                  <th className="text-right py-3 px-2 font-medium">التكلفة</th>
                  <th className="text-right py-3 px-2 font-medium">البيع</th>
                  <th className="text-center py-3 px-2 font-medium">الحالة</th>
                  <th className="text-center py-3 px-2 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const status = item.current_qty === 0 ? 'out' : item.current_qty <= item.min_qty ? 'low' : 'ok';
                  return (
                    <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-2 font-medium">{item.product_name}</td>
                      <td className="py-3 px-2 text-gray-400 font-mono text-xs">{item.sku}</td>
                      <td className="py-3 px-2 text-center font-semibold">{item.current_qty} {item.unit}</td>
                      <td className="py-3 px-2 text-center text-gray-400">{item.min_qty}</td>
                      <td className="py-3 px-2 text-right">{item.cost_price.toLocaleString('ar-EG')}</td>
                      <td className="py-3 px-2 text-right">{item.selling_price.toLocaleString('ar-EG')}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1',
                          status === 'out' ? 'bg-red-500/20 text-red-400' :
                          status === 'low' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        )}>
                          {status === 'out' ? <AlertTriangle size={10} /> : status === 'low' ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                          {status === 'out' ? 'نفذ' : status === 'low' ? 'منخفض' : 'متوفر'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setSelectedItem(item.id); setShowModal(true); }} className="px-3 py-1 rounded-lg bg-white/[0.06] text-xs hover:bg-white/[0.1] transition-colors">
                            تعديل
                          </button>
                          <button onClick={() => { setThresholdProductId(item.product_id); setThresholdProductName(item.product_name); setThresholdModalOpen(true); }} className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/30 transition-colors flex items-center gap-1" title="تعيين حد التنبيه">
                            <Bell size={10} /> حد
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">تعديل المخزون</h3>

            <div className="flex gap-2">
              {([['add', 'إضافة'], ['remove', 'سحب'], ['correction', 'تصحيح']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setAdjustType(key)} className={cn('flex-1 py-2 rounded-lg text-sm transition-colors',
                  adjustType === key ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
                )}>{label}</button>
              ))}
            </div>

            <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50">
              <option value="">اختر المنتج</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.product_name} ({i.current_qty} {i.unit})</option>)}
            </select>

            <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder={adjustType === 'correction' ? 'الكمية الصحيحة' : 'الكمية'} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="السبب (اختياري)" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />

            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={handleAdjustment} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium">تأكيد</button>
            </div>
          </div>
        </div>
      )}

      {/* Threshold Config Modal */}
      {thresholdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">تعيين حد التنبيه - {thresholdProductName}</h3>
            <p className="text-xs text-white/50">يمكنك تخصيص حد المخزون المنخفض وأيام تنبيه الصلاحية لهذا المنتج</p>

            <div>
              <label className="text-xs text-white/50 mb-1 block">الحد الأدنى المخصص للمخزون</label>
              <input type="number" value={customMinStock} onChange={e => setCustomMinStock(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">أيام التنبيه قبل انتهاء الصلاحية</label>
              <input type="number" value={expiryAlertDays} onChange={e => setExpiryAlertDays(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setThresholdModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={async () => {
                try {
                  await productThresholdService.upsert({ product_id: thresholdProductId, custom_min_stock: customMinStock, expiry_alert_days: expiryAlertDays });
                  toast.success('تم حفظ حد التنبيه');
                  setThresholdModalOpen(false);
                } catch { toast.error('فشل الحفظ'); }
              }} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium">حفظ</button>
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
