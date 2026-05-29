'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { productHistoryService, warehouseService } from '@/lib/supabase/services/procurement';
import { inventoryService } from '@/lib/supabase/services/inventory';
import { Package, MapPin, Calendar, TrendingUp, TrendingDown, Wallet, Clock, BarChart3, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react';

const supabase = createClient();

interface StockItem {
  id: string;
  product_name: string;
  sku: string;
  barcode?: string;
  current_qty: number;
  min_qty: number;
  max_qty?: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  location?: string;
  category?: string;
  warehouse_id?: string;
  main_warehouse_qty?: number;
  branch_warehouse_qty?: number;
  turnover_ratio?: number;
  expiry_date?: string;
  batch_number?: string;
  total_profit?: number;
  last_purchase_date?: string;
  last_purchase_price?: number;
  created_at?: string;
}

interface Warehouse {
  id: string;
  name_ar: string;
}

interface HistoryEntry {
  id: string;
  type: string;
  quantity: number;
  price: number;
  total_value: number;
  reference_id?: string;
  performed_by_name?: string;
  notes?: string;
  created_at: string;
}

interface ProductMasterCardProps {
  productId: string;
  onClose: () => void;
}

export function ProductMasterCard({ productId, onClose }: ProductMasterCardProps) {
  const [product, setProduct] = useState<StockItem | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchData();
  }, [productId]);

  async function fetchData() {
    const [productRes, whRes, historyRes] = await Promise.all([
      inventoryService.getById(productId),
      warehouseService.getAll(),
      productHistoryService.getAll(productId),
    ]);

    if (productRes.data) setProduct(productRes.data);
    if (whRes.data) setWarehouses(whRes.data);
    if (historyRes.data) setHistory(historyRes.data);
    setLoading(false);
  }

  if (loading) return <div className="text-center py-8 text-gray-500">جاري التحميل...</div>;
  if (!product) return <div className="text-center py-8 text-gray-500">المنتج غير موجود</div>;

  const stockValue = product.current_qty * product.cost_price;
  const profitMargin = product.selling_price > 0 ? ((product.selling_price - product.cost_price) / product.selling_price * 100).toFixed(1) : '0';
  const expiryDate = product.expiry_date ? new Date(product.expiry_date) : null;
  const daysToExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const historyTypeLabels: Record<string, string> = {
    purchase: 'شراء', sale: 'بيع', transfer_in: 'تحويل وارد', transfer_out: 'تحويل صادر',
    adjustment: 'تسوية', audit: 'جرد', damage: 'تالف', return: 'مرتجع', coding: 'تكويـد',
  };
  const historyTypeColors: Record<string, string> = {
    purchase: 'text-blue-400', sale: 'text-emerald-400', transfer_in: 'text-purple-400',
    transfer_out: 'text-amber-400', adjustment: 'text-gray-400', audit: 'text-cyan-400',
    damage: 'text-red-400', return: 'text-orange-400', coding: 'text-violet-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#0A0A0C] border border-white/[0.08]">
        {/* Header */}
        <div className="sticky top-0 z-10 p-4 bg-[#0A0A0C]/95 backdrop-blur-sm border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-base font-semibold">كارت المنتج</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Basic Info */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-semibold">{product.product_name}</h4>
                <p className="text-xs text-gray-400 font-mono">{product.sku}{product.barcode ? ` | ${product.barcode}` : ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {product.category && (
                <div><p className="text-xs text-gray-400">القسم</p><p>{product.category}</p></div>
              )}
              {product.location && (
                <div><p className="text-xs text-gray-400">الموقع</p><p className="flex items-center gap-1"><MapPin size={12} />{product.location}</p></div>
              )}
              <div><p className="text-xs text-gray-400">الوحدة</p><p>{product.unit}</p></div>
              {product.batch_number && (
                <div><p className="text-xs text-gray-400">رقم الدفعة</p><p className="font-mono">{product.batch_number}</p></div>
              )}
            </div>
          </div>

          {/* Stock Levels */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <h5 className="text-sm font-semibold mb-3">المخزون</h5>

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">الرصيد الحالي</span>
              <span className={cn('text-lg font-bold',
                product.current_qty === 0 ? 'text-red-400' :
                product.current_qty <= product.min_qty ? 'text-amber-400' :
                'text-emerald-400'
              )}>
                {product.current_qty} {product.unit}
              </span>
            </div>

            {/* Warehouse breakdown */}
            <div className="space-y-2 mb-3">
              {product.main_warehouse_qty !== undefined && product.main_warehouse_qty !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">المخزن الرئيسي</span>
                  <span className="font-medium">{product.main_warehouse_qty} {product.unit}</span>
                </div>
              )}
              {product.branch_warehouse_qty !== undefined && product.branch_warehouse_qty !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">مخزن الفرع</span>
                  <span className="font-medium">{product.branch_warehouse_qty} {product.unit}</span>
                </div>
              )}
            </div>

            {/* Stock bar */}
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all',
                  product.current_qty === 0 ? 'bg-red-500' :
                  product.current_qty <= product.min_qty ? 'bg-amber-500' :
                  'bg-emerald-500'
                )}
                style={{ width: `${Math.min(100, (product.current_qty / (product.max_qty || 100)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>الحد الأدنى: {product.min_qty}</span>
              <span>الحد الأقصى: {product.max_qty}</span>
            </div>
          </div>

          {/* Financial Status */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <h5 className="text-sm font-semibold mb-3">الحالة المالية</h5>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-xs text-gray-400">سعر التكلفة</p>
                <p className="text-sm font-bold">{product.cost_price.toLocaleString('ar-EG')} <span className="text-xs text-gray-400">ج.م</span></p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <p className="text-xs text-emerald-400/70">سعر البيع</p>
                <p className="text-sm font-bold text-emerald-400">{product.selling_price.toLocaleString('ar-EG')} <span className="text-xs text-emerald-400/70">ج.م</span></p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-xs text-gray-400">قيمة المخزون</p>
                <p className="text-sm font-bold">{stockValue.toLocaleString('ar-EG')} <span className="text-xs text-gray-400">ج.م</span></p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <p className="text-xs text-blue-400/70">هامش الربح</p>
                <p className="text-sm font-bold text-blue-400">{profitMargin}%</p>
              </div>
            </div>

            {product.total_profit && product.total_profit > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400">صافي الأرباح المحققة</span>
                  <span className="text-sm font-bold text-emerald-400">{product.total_profit.toLocaleString('ar-EG')} ج.م</span>
                </div>
              </div>
            )}

            {/* Turnover */}
            {product.turnover_ratio && product.turnover_ratio > 0 && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1"><BarChart3 size={14} /> معدل الدوران</span>
                <span className="font-bold">{product.turnover_ratio.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Expiry */}
          {expiryDate && daysToExpiry !== null && (
            <div className={cn('p-4 rounded-xl border',
              daysToExpiry < 0 ? 'bg-red-500/10 border-red-500/20' :
              daysToExpiry < 30 ? 'bg-amber-500/10 border-amber-500/20' :
              'bg-white/[0.03] border-white/[0.06]'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className={daysToExpiry < 0 ? 'text-red-400' : daysToExpiry < 30 ? 'text-amber-400' : 'text-gray-400'} />
                  <span className="text-sm">تاريخ الصلاحية</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{expiryDate.toLocaleDateString('ar-EG')}</p>
                  <p className={cn('text-xs',
                    daysToExpiry < 0 ? 'text-red-400' :
                    daysToExpiry < 30 ? 'text-amber-400' :
                    'text-gray-400'
                  )}>
                    {daysToExpiry < 0 ? `منتهي منذ ${Math.abs(daysToExpiry)} يوم` :
                     daysToExpiry === 0 ? 'ينتهي اليوم' :
                     `متبقي ${daysToExpiry} يوم`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Last Purchase */}
          {product.last_purchase_date && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1"><Clock size={14} /> آخر شراء</span>
                <div className="text-left">
                  <p className="font-bold">{new Date(product.last_purchase_date).toLocaleDateString('ar-EG')}</p>
                  {product.last_purchase_price && (
                    <p className="text-xs text-gray-400">{product.last_purchase_price.toLocaleString('ar-EG')} ج.م</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* History Ledger */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
              <h5 className="text-sm font-semibold flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                سجل الحركات ({history.length})
              </h5>
              {showHistory ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {showHistory && (
              <div className="border-t border-white/[0.06] max-h-60 overflow-y-auto">
                {history.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">لا توجد حركات</div>
                ) : (
                  <div className="divide-y divide-white/[0.03]">
                    {history.slice(0, 20).map(entry => (
                      <div key={entry.id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center',
                            entry.type === 'sale' ? 'bg-emerald-500/10' :
                            entry.type === 'purchase' ? 'bg-blue-500/10' :
                            entry.type === 'transfer_in' ? 'bg-purple-500/10' :
                            entry.type === 'transfer_out' ? 'bg-amber-500/10' :
                            entry.type === 'damage' ? 'bg-red-500/10' :
                            'bg-white/[0.04]'
                          )}>
                            {entry.type === 'sale' ? <TrendingUp size={14} className="text-emerald-400" /> :
                             entry.type === 'purchase' ? <TrendingDown size={14} className="text-blue-400" /> :
                             entry.type === 'transfer_in' ? <ChevronDown size={14} className="text-purple-400" /> :
                             entry.type === 'transfer_out' ? <ChevronUp size={14} className="text-amber-400" /> :
                             entry.type === 'damage' ? <AlertTriangle size={14} className="text-red-400" /> :
                             <CheckCircle size={14} className="text-gray-400" />}
                          </div>
                          <div>
                            <p className={cn('text-xs font-medium', historyTypeColors[entry.type] || 'text-gray-400')}>
                              {historyTypeLabels[entry.type] || entry.type}
                            </p>
                            <p className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleDateString('ar-EG')}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold">{entry.quantity > 0 ? '+' : ''}{entry.quantity}</p>
                          {entry.total_value > 0 && (
                            <p className="text-xs text-gray-400">{entry.total_value.toLocaleString('ar-EG')} ج.م</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
