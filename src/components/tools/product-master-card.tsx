'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Package, Wallet, Clock, BarChart3, Layers,
  Warehouse, Scale, Ruler, Box, History, Camera, Edit,
  Printer, ArrowRightLeft, X, Loader2, Tag, AlertTriangle,
  TrendingDown, ArrowUp, Undo2, FileText
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { productService } from '@/lib/supabase/services/products';
import { productHistoryService } from '@/lib/supabase/services/procurement';
import { inventoryService } from '@/lib/supabase/services/inventory';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Product, InventoryStock } from '@/types/erp';

const supabase = createClient();

interface ProductMasterCardProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
  sku?: string;
  barcode?: string;
}

interface WarehouseStock {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  min_level: number;
  max_level: number;
  warehouse: {
    id: string;
    name_ar: string;
    name_en: string | null;
  };
}

interface HistoryEntry {
  id: string;
  stock_item_id?: string;
  product_name: string;
  type: 'purchase' | 'sale' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'audit' | 'damage' | 'return' | 'coding';
  quantity: number;
  price: number;
  total_value: number;
  reference_id?: string;
  reference_type?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  performed_by?: string;
  performed_by_name?: string;
  notes?: string;
  created_at: string;
}

const HISTORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  purchase: { label: 'مشتريات', icon: Package, color: 'text-emerald-400 bg-emerald-500/10' },
  sale: { label: 'مبيعات', icon: TrendingDown, color: 'text-blue-400 bg-blue-500/10' },
  transfer_in: { label: 'وارد تحويل', icon: ArrowRightLeft, color: 'text-amber-400 bg-amber-500/10' },
  transfer_out: { label: 'صادر تحويل', icon: ArrowRightLeft, color: 'text-purple-400 bg-purple-500/10' },
  adjustment: { label: 'تسوية', icon: Edit, color: 'text-gray-400 bg-gray-500/10' },
  audit: { label: 'جرد', icon: Camera, color: 'text-cyan-400 bg-cyan-500/10' },
  damage: { label: 'تالف', icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
  return: { label: 'مرتجع', icon: Undo2, color: 'text-orange-400 bg-orange-500/10' },
  coding: { label: 'تكويد', icon: FileText, color: 'text-indigo-400 bg-indigo-500/10' },
};

export function ProductMasterCard({ isOpen, onClose, productId, productName, sku, barcode }: ProductMasterCardProps) {
  const [product, setProduct] = useState<any>(null);
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStock[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    try {
      let data: any = null;

      if (productId) {
        data = await productService.getById(productId);
      } else if (barcode) {
        data = await productService.getByBarcode(barcode);
      } else if (sku) {
        data = await productService.getBySku(sku);
      } else if (productName) {
        const result = await productService.getAll({ search: productName, limit: 1 });
        if (result.data?.length) data = result.data[0];
      }

      if (!data) {
        setError('لم يتم العثور على المنتج');
        setLoading(false);
        return;
      }

      if (data.category_id) {
        const { data: cat } = await supabase
          .from('categories')
          .select('name_ar')
          .eq('id', data.category_id)
          .single();
        data.category_name = (cat as any)?.name_ar || null;
      }

      setProduct(data);

      const stock = await productService.getInventory(data.id);
      setWarehouseStock((stock as any[]) || []);

      const { data: hist } = await supabase
        .from('product_history')
        .select('*')
        .or(`stock_item_id.eq.${data.id},reference_id.eq.${data.id}`)
        .order('created_at', { ascending: false })
        .limit(50);
      setHistory(hist || []);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [isOpen, productId, productName, sku, barcode]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      return;
    }
    setProduct(null);
    setWarehouseStock([]);
    setHistory([]);
    setError(null);
  }, [isOpen, fetchData]);

  useEffect(() => {
    if (!isOpen || !product?.id) return;

    const channel = supabase
      .channel(`product-master-${product.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_history',
        filter: `reference_id=eq.${product.id}`,
      }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, product?.id, fetchData]);

  if (!isOpen) return null;

  const totalSales = history
    .filter((h) => h.type === 'sale')
    .reduce((s, h) => s + Math.abs(h.total_value || 0), 0);

  const totalCost = history
    .filter((h) => h.type === 'purchase')
    .reduce((s, h) => s + Math.abs(h.total_value || 0), 0);

  const totalProfit = totalSales - totalCost;
  const marginPercent = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const inventoryValue = (product?.current_stock || 0) * (product?.cost_price || 0);

  const lastPurchase = [...history].find((h) => h.type === 'purchase');
  const lastAudit = [...history].find((h) => h.type === 'audit');

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#0A0A0C] border border-white/[0.08] p-6"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="text-emerald-400 animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Search size={40} className="text-gray-600" />
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        )}

        {product && !loading && (
          <>
            <button onClick={onClose} className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
              <X size={16} className="text-gray-400" />
            </button>

            {/* ─── Header ─── */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img
                  src={product.image_url || '/product-placeholder.svg'}
                  alt={product.name_ar}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/product-placeholder.svg'; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white">{product.name_ar}</h2>
                {product.name_en && <p className="text-sm text-gray-400 mt-0.5">{product.name_en}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs bg-white/[0.06] text-gray-400 px-2.5 py-1 rounded-md">{product.sku}</span>
                  {product.barcode && <span className="text-xs bg-white/[0.06] text-gray-400 px-2.5 py-1 rounded-md">{product.barcode}</span>}
                  {product.category_name && (
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md">{product.category_name}</span>
                  )}
                  <span className={cn(
                    'text-xs px-2.5 py-1 rounded-md',
                    product.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  )}>
                    {product.is_active ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Stock per Warehouse ─── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Warehouse size={16} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-white">رصيد المخازن</h3>
              </div>
              {warehouseStock.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4 bg-white/[0.03] rounded-xl">لا يوجد رصيد في المخازن</p>
              ) : (
                <div className="space-y-2">
                  {warehouseStock.map((ws) => {
                    const qty = ws.quantity || 0;
                    const minLvl = (ws as any).min_level || product.min_stock_level || 0;
                    const maxLvl = (ws as any).max_level || 0;
                    const colorClass = qty === 0 ? 'bg-red-500/10 border-red-500/20' : qty <= minLvl ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20';
                    const textColor = qty === 0 ? 'text-red-400' : qty <= minLvl ? 'text-amber-400' : 'text-emerald-400';
                    return (
                      <div key={ws.id} className={cn('flex items-center justify-between rounded-xl px-4 py-3 border', colorClass)}>
                        <span className="text-sm text-white font-medium">{ws.warehouse?.name_ar || ws.warehouse?.name_en || 'مخزن'}</span>
                        <div className="flex items-center gap-4">
                          <span className={cn('text-lg font-bold', textColor)}>{qty}</span>
                          <span className="text-xs text-gray-500">{minLvl > 0 ? `حد أدنى ${minLvl}` : ''}</span>
                          {maxLvl > 0 && <span className="text-xs text-gray-500">/ أقصى {maxLvl}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── Units ─── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={16} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-white">وحدات القياس</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'الوحدة الأساسية', value: product.base_unit || product.unit || '—', factor: product.base_unit_factor },
                  { label: 'الوزن', value: product.weight_unit || '—', factor: product.weight_unit_factor },
                  { label: 'الحجم', value: product.volume_unit || '—', factor: product.volume_unit_factor },
                  { label: 'التعبئة', value: product.pack_unit || '—', factor: product.pack_unit_factor },
                ].map((u, i) => (
                  <div key={i} className="bg-white/[0.04] rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      {i === 0 && <Box size={12} className="text-gray-500" />}
                      {i === 1 && <Scale size={12} className="text-gray-500" />}
                      {i === 2 && <Ruler size={12} className="text-gray-500" />}
                      {i === 3 && <Package size={12} className="text-gray-500" />}
                      <span className="text-xs text-gray-500">{u.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{u.value}</p>
                    {u.factor && <p className="text-xs text-gray-500 mt-0.5">معامل: {u.factor}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Financial Section ─── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Wallet size={16} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-white">الحالة المالية</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.04] rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">سعر التكلفة</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(product.cost_price || 0)}</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">سعر البيع</p>
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(product.sale_price || 0)}</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">قيمة المخزون</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(inventoryValue)}</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">هامش الربح</p>
                  <p className={cn('text-sm font-bold', marginPercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {marginPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">إجمالي الربح</span>
                  <span className={cn('text-sm font-bold', totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {formatCurrency(totalProfit)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">إجمالي المبيعات</span>
                  <span className="text-sm text-white">{formatCurrency(totalSales)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">إجمالي المشتريات</span>
                  <span className="text-sm text-white">{formatCurrency(totalCost)}</span>
                </div>
              </div>
            </div>

            {/* ─── History Timeline ─── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <History size={16} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-white">حركات المنتج</h3>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4 bg-white/[0.03] rounded-xl">لا توجد حركات</p>
              ) : (
                <div className="space-y-0 relative">
                  <div className="absolute right-[11px] top-2 bottom-2 w-px bg-white/[0.06]" />
                  {history.slice(0, 20).map((entry, idx) => {
                    const config = HISTORY_CONFIG[entry.type] || HISTORY_CONFIG.adjustment;
                    const Icon = config.icon;
                    return (
                      <div key={entry.id} className="flex items-start gap-3 pb-4 relative">
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10', config.color)}>
                          <Icon size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{config.label}</span>
                            <span className="text-xs text-gray-500">{formatDate(new Date(entry.created_at).getTime())}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                              'text-xs font-medium',
                              entry.quantity > 0 ? 'text-emerald-400' : entry.quantity < 0 ? 'text-red-400' : 'text-gray-400'
                            )}>
                              {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                            </span>
                            {entry.price > 0 && <span className="text-xs text-gray-500">{formatCurrency(entry.price)}</span>}
                          </div>
                          {entry.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
                <div className="text-xs text-gray-500">
                  آخر شراء:{' '}
                  <span className="text-white">
                    {lastPurchase ? `${formatDate(new Date(lastPurchase.created_at).getTime())} - ${formatCurrency(lastPurchase.price)}` : '—'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  آخر جرد:{' '}
                  <span className="text-white">
                    {lastAudit ? formatDate(new Date(lastAudit.created_at).getTime()) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Quick Actions ─── */}
            <div className="pt-4 border-t border-white/[0.06]">
              <div className="grid grid-cols-4 gap-2">
                <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                  <Camera size={18} className="text-cyan-400" />
                  <span className="text-xs text-gray-400">جرد</span>
                </button>
                <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                  <Edit size={18} className="text-amber-400" />
                  <span className="text-xs text-gray-400">تعديل</span>
                </button>
                <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                  <Printer size={18} className="text-emerald-400" />
                  <span className="text-xs text-gray-400">طباعة لاصقة</span>
                </button>
                <button className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                  <ArrowRightLeft size={18} className="text-purple-400" />
                  <span className="text-xs text-gray-400">تحويل مخزني</span>
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
