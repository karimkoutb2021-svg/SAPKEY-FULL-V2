'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingCart, Minus, Plus, Trash2, ArrowLeft, Percent, Truck, Store, Heart, User, Home, Package } from 'lucide-react';
import { useCartStore } from '@/lib/store/ecommerce-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CATEGORY_KEYS, findCategoryId, loadCategories } from '@/lib/category-utils';
import { formatCurrency } from '@/lib/utils';
import { PageTransition } from '@/components/ui/page-transition';
import { useState, useEffect } from 'react';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getItemCount, getTotal, applyCoupon, removeCoupon, couponCode, appliedCoupon } = useCartStore();
  const [couponInput, setCouponInput] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const router = useRouter();
  const totals = getTotal(15, 0);
  const isEmpty = items.length === 0;

  useEffect(() => {
    loadCategories().then(cats => setCategories(cats)).catch(() => {});
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    try {
      const res = await fetch('/api/validate-coupon', {
        method: 'POST',
        body: JSON.stringify({ code: couponInput, subtotal: totals.subtotal }),
      });
      const data = await res.json();
      if (data.valid) {
        applyCoupon(data.coupon);
      }
    } catch {}
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] pb-36" dir="rtl">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <button onClick={() => router.back()} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              <h1 className="text-base font-bold text-gray-900 dark:text-white">سلة التسوق</h1>
              <span className="text-xs text-gray-400">({getItemCount()} منتج)</span>
            </div>
            <div className="w-9" />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-4">
          {isEmpty ? (
            <div className="text-center py-20">
              <ShoppingCart className="h-20 w-20 mx-auto mb-4 text-gray-200 dark:text-slate-700" />
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">السلة فارغة</h2>
              <p className="text-gray-400 mb-6">أضف بعض المنتجات إلى سلة التسوق</p>
              <Link href="/shop">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">ابدأ التسوق</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Items */}
              <div className="lg:col-span-2 space-y-3">
                {items.map((item) => (
                  <motion.div key={item.variantId || item.productId} layout className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800">
                    <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.image ? (
                          <img loading="lazy" src={item.image || "/product-placeholder.svg"} alt={item.nameAr} className="w-full h-full object-cover" />
                        ) : (
                        <ShoppingCart className="h-8 w-8 text-gray-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/shop/product/${item.productId}`} className="font-bold text-sm text-gray-900 dark:text-white hover:text-emerald-600 line-clamp-1">{item.nameAr}</Link>
                      {item.variantName && <p className="text-xs text-gray-400 mt-0.5">{item.variantName}</p>}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatCurrency(item.price)} / {item.unit}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <button onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)} className="h-8 w-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><Minus className="h-3 w-3 text-gray-500" /></button>
                          <span className="h-8 w-10 flex items-center justify-center border-x border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)} className="h-8 w-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><Plus className="h-3 w-3 text-gray-500" /></button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600 text-sm">{formatCurrency(item.price * item.quantity)}</span>
                          <button onClick={() => removeItem(item.productId, item.variantId)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4 text-gray-400" /></button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary - Desktop */}
              <div className="hidden lg:block space-y-4">
                <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 space-y-3">
                  <h3 className="font-bold text-gray-900 dark:text-white">ملخص الطلب</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">المجموع الفرعي</span><span className="text-gray-900 dark:text-white">{formatCurrency(totals.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">التوصيل</span><span className="text-gray-900 dark:text-white">{totals.deliveryFee > 0 ? formatCurrency(totals.deliveryFee) : 'مجاني'}</span></div>
                    {totals.discount > 0 && <div className="flex justify-between text-emerald-600"><span>الخصم ({couponCode})</span><span>-{formatCurrency(totals.discount)}</span></div>}
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-100 dark:border-slate-800">
                    <span className="text-gray-900 dark:text-white">الإجمالي</span>
                    <span className="text-emerald-600">{formatCurrency(totals.total)}</span>
                  </div>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm">
                      <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> {couponCode}</span>
                      <button onClick={removeCoupon} className="text-red-500 text-xs">إزالة</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input placeholder="كود الخصم" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="h-9 text-sm" />
                      <Button variant="outline" size="sm" onClick={handleApplyCoupon} className="h-9">تطبيق</Button>
                    </div>
                  )}
                  <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push('/checkout')}>إتمام الطلب</Button>
                </div>
                <div className="p-4 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Truck className="h-4 w-4 text-emerald-600" />
                    <span>توصيل مجاني للطلبات فوق 200 ج.م</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Fixed Bottom Bar */}
        {!isEmpty && (
          <div className="fixed bottom-0 left-0 right-0 z-50">
            {/* Navigation Icons */}
            <div className="bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800">
              <div className="max-w-lg mx-auto flex justify-around py-1.5">
                {[
                  { icon: Home, label: 'الرئيسية', action: () => router.push('/'), active: false },
                  { icon: ShoppingCart, label: 'المشروبات', action: () => router.push(`/shop?category=${findCategoryId(CATEGORY_KEYS.beverages, categories) || 'all'}`), active: false },
                  { icon: Package, label: 'الألبان', action: () => router.push(`/shop?category=${findCategoryId(CATEGORY_KEYS.dairy, categories) || 'all'}`), active: false },
                  { icon: Percent, label: 'العروض', action: () => router.push('/offers'), active: false },
                  { icon: Heart, label: 'المفضلة', action: () => router.push('/favorites'), active: false },
                  { icon: Truck, label: 'طلباتي', action: () => router.push('/orders'), active: false },
                  { icon: ShoppingCart, label: 'عربة التسوق', action: () => router.push('/cart'), active: true },
                ].map(({ icon: Icon, label, active, action }) => (
                  <button key={label} onClick={action}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1.5 relative transition-all ${active ? 'font-bold text-emerald-600' : 'text-gray-400 dark:text-gray-500'}`}>
                    <Icon className="h-5 w-5" />
                    <span className="text-[9px] font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Total + Checkout Bar */}
            <div className="bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 px-4 py-3 safe-area-bottom">
              <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] text-gray-400">الإجمالي</p>
                  <p className="text-lg font-black text-emerald-600">{formatCurrency(totals.total)}</p>
                </div>
                <Button className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={() => router.push('/checkout')}>
                  إتمام الطلب
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

