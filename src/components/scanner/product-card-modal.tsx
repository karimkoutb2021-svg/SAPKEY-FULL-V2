'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Barcode, MapPin, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ShoppingCart, Edit3, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

const supabase = createClient();

interface ProductCard {
  id: string;
  name: string;
  name_ar: string;
  name_en?: string;
  sku: string;
  barcode?: string;
  price: number;
  cost_price?: number;
  category?: string;
  category_ar?: string;
  image_url?: string;
  unit?: string;
  description?: string;
  is_active?: boolean;
}

interface StockInfo {
  current_qty: number;
  min_qty: number;
  max_qty: number;
  location?: string;
  last_audit_date?: string;
}

interface ProductCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedCode: string;
  mode?: 'barcode' | 'qr';
}

export function ProductCardModal({ isOpen, onClose, scannedCode, mode = 'barcode' }: ProductCardModalProps) {
  const [product, setProduct] = useState<ProductCard | null>(null);
  const [stock, setStock] = useState<StockInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    if (!isOpen || !scannedCode) return;
    fetchProduct(scannedCode);
  }, [isOpen, scannedCode]);

  async function fetchProduct(code: string) {
    setLoading(true);
    setError(null);

    try {
      // Search by barcode first, then SKU, then ID
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .or(`barcode.eq.${code},sku.eq.${code},id.eq.${code}`)
        .limit(1);

      if (error) throw error;

      if (products && products.length > 0) {
        const p = products[0];
        setProduct(p);

        // Fetch stock info
        const { data: stockData } = await supabase
          .from('stock_items')
          .select('*')
          .eq('product_id', p.id)
          .limit(1)
          .single();

        if (stockData) setStock(stockData);
      } else {
        // Also check stock_items directly
        const { data: stockData } = await supabase
          .from('stock_items')
          .select('*')
          .or(`barcode.eq.${code},sku.eq.${code}`)
          .limit(1);

        if (stockData && stockData.length > 0) {
          const s = stockData[0];
          setStock(s);

          // Fetch product info
          const { data: prodData } = await supabase
            .from('products')
            .select('*')
            .eq('id', s.product_id)
            .limit(1)
            .single();

          if (prodData) setProduct(prodData);
        } else {
          setError('لم يتم العثور على المنتج');
        }
      }
    } catch (err: any) {
      setError(err.message || 'خطأ في البحث');
    } finally {
      setLoading(false);
    }
  }

  function getStockStatus() {
    if (!stock) return { label: 'غير متوفر', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', icon: AlertTriangle };
    if (stock.current_qty === 0) return { label: 'نفذ من المخزون', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: AlertTriangle };
    if (stock.current_qty <= stock.min_qty) return { label: 'منخفض', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: TrendingDown };
    return { label: 'متوفر', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: CheckCircle };
  }

  const stockStatus = getStockStatus();
  const StockIcon = stockStatus.icon;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10001] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative h-48 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <button onClick={onClose} className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors">
              <X size={16} />
            </button>

            {loading ? (
              <div className="text-white/60 text-sm">جاري البحث...</div>
            ) : error ? (
              <div className="text-center text-white px-4">
                <AlertTriangle size={32} className="mx-auto mb-2 opacity-60" />
                <p className="text-sm">{error}</p>
              </div>
            ) : product ? (
              <>
                {product.image_url ? (
                  <img loading="lazy" src={product.image_url} alt={product.name_ar} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-white/30">
                    <Package size={64} />
                  </div>
                )}
                {/* Badge */}
                <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                  {mode === 'qr' ? 'QR' : 'باركود'}
                </div>
              </>
            ) : null}
          </div>

          {/* Content */}
          {product && (
            <div className="p-5 space-y-4">
              {/* Product Name */}
              <div>
                <h3 className="text-xl font-bold text-gray-900">{product.name_ar}</h3>
                {product.name_en && <p className="text-sm text-gray-500">{product.name_en}</p>}
              </div>

              {/* Price */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{product.price?.toLocaleString('ar-EG')} <span className="text-sm text-gray-400">ج.م</span></p>
                  {product.cost_price && (
                    <p className="text-xs text-gray-400">التكلفة: {product.cost_price.toLocaleString('ar-EG')} ج.م</p>
                  )}
                </div>
                <div className={cn('px-3 py-1.5 rounded-full border text-sm font-medium', stockStatus.bg, stockStatus.color, stockStatus.border)}>
                  <span className="flex items-center gap-1">
                    <StockIcon size={14} />
                    {stockStatus.label}
                  </span>
                </div>
              </div>

              {/* Stock Info */}
              {stock && (
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{stock.current_qty}</p>
                    <p className="text-xs text-gray-500">الكمية</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-600">{stock.min_qty}</p>
                    <p className="text-xs text-gray-500">الحد الأدنى</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{stock.max_qty}</p>
                    <p className="text-xs text-gray-500">الحد الأقصى</p>
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Barcode size={14} />
                  <span className="text-gray-400">SKU:</span>
                  <span className="font-mono">{product.sku}</span>
                </div>
                {product.barcode && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <QrCode size={14} />
                    <span className="text-gray-400">الباركود:</span>
                    <span className="font-mono">{product.barcode}</span>
                  </div>
                )}
                {product.category_ar && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Package size={14} />
                    <span className="text-gray-400">التصنيف:</span>
                    <span>{product.category_ar}</span>
                  </div>
                )}
                {stock?.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={14} />
                    <span className="text-gray-400">الموقع:</span>
                    <span>{stock.location}</span>
                  </div>
                )}
                {stock?.last_audit_date && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle size={14} />
                    <span className="text-gray-400">آخر جرد:</span>
                    <span>{new Date(stock.last_audit_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <QrCode size={16} />
                  عرض QR
                </button>
                <button className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm font-medium text-white hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                  <ShoppingCart size={16} />
                  إضافة للسلة
                </button>
              </div>

              {/* QR Code Display */}
              {showQRCode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-xl bg-gray-50 text-center">
                    <div className="w-32 h-32 mx-auto bg-white rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                      <QrCode size={48} className="text-gray-300" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{product.id}</p>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
