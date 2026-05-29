'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Minus, Plus, Trash2, ArrowLeft, CheckCircle, Tag } from 'lucide-react';
import { useCartStore } from '@/lib/store/ecommerce-store';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, removeItem, updateQuantity, getItemCount, getTotal } = useCartStore();
  const router = useRouter();
  const totals = getTotal(15, 0);
  const [promoCode, setPromoCode] = useState('');
  const [showPromo, setShowPromo] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-full max-w-md bg-white z-50 shadow-elevated flex flex-col"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-900">سلة التسوق</span>
                  <span className="text-[10px] text-gray-400 block">{getItemCount()} منتج</span>
                </div>
              </div>
              <button onClick={onClose} className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <ShoppingCart className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="text-base font-bold text-gray-900 mb-1">السلة فارغة</p>
                  <p className="text-sm text-gray-400 mb-4">أضف منتجات للبدء</p>
                  <button
                    onClick={() => { onClose(); router.push('/shop'); }}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
                  >
                    تصفح المنتجات
                  </button>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {items.map((item) => (
                    <motion.div
                      key={item.variantId || item.productId}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white rounded-xl p-3 border border-gray-100"
                    >
                      <div className="flex gap-3">
                        {/* Product Image */}
                        <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.image ? (
                            <img loading="lazy" src={item.image} alt={item.nameAr} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-2xl">🛒</span>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{item.nameAr}</p>
                          {item.variantName && (
                            <p className="text-[10px] text-gray-400 mt-0.5 bg-gray-50 px-2 py-0.5 rounded-md inline-block">{item.variantName}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">{item.unit === 'piece' ? 'قطعة' : item.unit}</p>

                          {/* Price Row */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-base font-black text-emerald-600 tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
                            {item.quantity > 1 && (
                              <span className="text-[10px] text-gray-400 tabular-nums">({formatCurrency(item.price)} / واحد)</span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex flex-col items-end justify-between shrink-0">
                          <div className="flex items-center gap-0 bg-gray-100 rounded-lg overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                              className="h-8 w-8 flex items-center justify-center hover:bg-gray-200 transition-colors"
                            >
                              <Minus className="h-3.5 w-3.5 text-gray-600" />
                            </button>
                            <span className="min-w-[24px] text-center text-sm font-bold text-gray-900 tabular-nums">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                              className="h-8 w-8 flex items-center justify-center hover:bg-gray-200 transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5 text-gray-600" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.productId, item.variantId)}
                            className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3 w-3 text-red-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 bg-white shrink-0">
                {/* Promo Code */}
                <div className="px-4 py-2 border-b border-gray-50">
                  <button
                    onClick={() => setShowPromo(!showPromo)}
                    className="flex items-center gap-2 text-xs text-emerald-600 font-medium py-1"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    {showPromo ? 'إخفاء كود الخصم' : 'إضافة كود خصم'}
                  </button>
                  {showPromo && (
                    <div className="flex gap-2 mt-2 pb-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="أدخل كود الخصم"
                        className="flex-1 h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button className="h-9 px-4 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors">
                        تطبيق
                      </button>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="px-4 py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">المجموع الفرعي</span>
                    <span className="font-medium text-gray-900 tabular-nums">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">رسوم التوصيل</span>
                    <span className="font-medium text-emerald-600 tabular-nums">{totals.deliveryFee > 0 ? formatCurrency(totals.deliveryFee) : 'مجاني'}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>الخصم</span>
                      <span className="font-medium tabular-nums">-{formatCurrency(totals.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-gray-100">
                    <span className="text-base font-black text-gray-900">الإجمالي</span>
                    <span className="text-xl font-black text-emerald-600 tabular-nums">{formatCurrency(totals.total)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <div className="px-4 pb-4">
                  <Button
                    className="w-full h-12 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => { onClose(); router.push('/checkout'); }}
                  >
                    <CheckCircle className="h-4 w-4 ml-2" />
                    إتمام الطلب
                  </Button>
                  <button
                    onClick={onClose}
                    className="w-full h-10 mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> متابعة التسوق
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
