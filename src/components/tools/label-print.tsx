'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Printer, X, Package, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { codingLabelService } from '@/lib/supabase/services/procurement';
import { normalizeArabic } from '@/lib/arabic-normalize';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const supabase = createClient();

interface LabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LabelPrintModal({ isOpen, onClose }: LabelPrintModalProps) {
  const [search, setSearch] = useState('');
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  useState(() => {
    if (isOpen) {
      setLoading(true);
      supabase.from('stock_items').select('*').order('product_name').then(({ data }) => {
        if (data) setStockItems(data);
        setLoading(false);
      });
    }
  });

  const filtered = stockItems.filter(
    (item) =>
      !search ||
      normalizeArabic(item.product_name).includes(normalizeArabic(search)) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
  );

  async function handlePrint() {
    if (!selected) return;
    setGenerating(true);
    try {
      await codingLabelService.create({
        stock_item_id: selected.id,
        product_name: selected.product_name,
        product_sku: selected.sku,
        selling_price: selected.selling_price,
        label_type: 'barcode',
        barcode_data: selected.barcode || selected.sku,
        qr_data: JSON.stringify({ sku: selected.sku, name: selected.product_name, price: selected.selling_price }),
      });

      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast.error('افتح السماح للنوافذ المنبثقة'); return; }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>ملصق ${selected.product_name}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
          <style>
            @page { size: 100mm 60mm; margin: 0; }
            body { margin: 0; padding: 8mm; font-family: Arial, sans-serif; text-align: center; }
            .name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
            .price { font-size: 18px; color: #059669; font-weight: bold; margin-bottom: 6px; }
            .barcode svg { max-width: 100%; height: 30px; }
            .sku { font-size: 9px; color: #999; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="name">${selected.product_name}</div>
          <div class="price">${selected.selling_price?.toLocaleString('ar-EG') || 0} ج.م</div>
          <div class="barcode"><svg id="barcode"></svg></div>
          <div class="sku">${selected.sku}</div>
          <script>
            JsBarcode("#barcode", "${selected.barcode || selected.sku}", { format: "CODE128", width: 2, height: 30, displayValue: false });
            setTimeout(() => window.print(), 500);
          <\/script>
        </body>
        </html>
      `);
      printWindow.document.close();
      toast.success('تم فتح الطباعة');
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setGenerating(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full sm:max-w-sm mx-0 sm:mx-4 max-h-[70vh] bg-[#0A0A0C] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-2xl overflow-hidden backdrop-blur-[25px]"
        style={{ backgroundColor: 'rgba(10,10,12,0.96)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
          <h2 className="text-base font-semibold text-white">طباعة لاصقة</h2>
          <div className="w-8" />
        </div>

        <div className="px-5 pb-5">
          <div className="relative mb-4">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن صنف..."
              className="w-full h-11 bg-white/[0.06] border border-white/[0.08] rounded-xl pr-10 pl-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <div className="space-y-1 max-h-[300px] overflow-y-auto mb-4">
            {filtered.slice(0, 20).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-right',
                  selected?.id === item.id ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-white/[0.04]'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <Package size={16} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-medium text-white truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500">{item.selling_price?.toLocaleString('ar-EG') || 0} ج.م</p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            disabled={!selected || generating}
            className={cn(
              'w-full h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300',
              selected && !generating ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/[0.06] text-gray-500 cursor-not-allowed'
            )}
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {generating ? 'جار التجهيز...' : selected ? `طباعة ${selected.product_name}` : 'اختر منتج'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
