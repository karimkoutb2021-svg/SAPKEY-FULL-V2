'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, MapPin, CreditCard, CheckCircle, Truck, Wallet, ArrowRight, Loader2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { useCartStore, useCheckoutStore } from '@/lib/store/ecommerce-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import { PageTransition } from '@/components/ui/page-transition';
import toast from 'react-hot-toast';

type Step = 'shipping' | 'payment' | 'review';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getItemCount, getTotal, couponCode, clearCart } = useCartStore();
  const { shippingAddress, paymentMethod, notes, setShippingAddress, setPaymentMethod, setNotes, setLastOrder, reset } = useCheckoutStore();
  const [step, setStep] = useState<Step>('shipping');
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { branding } = useBrandingStore();
  const [couponInput, setCouponInput] = useState('');
  const { appliedCoupon, applyCoupon, removeCoupon } = useCartStore();
  const totals = getTotal(15, branding.taxRate || 0);

  const [form, setForm] = useState({
    fullName: shippingAddress?.fullName || '',
    phone: shippingAddress?.phone || '',
    city: shippingAddress?.city || '',
    district: shippingAddress?.district || '',
    street: shippingAddress?.street || '',
    building: shippingAddress?.building || '',
    notes: '',
  });

  const isEmpty = items.length === 0;
  if (isEmpty && !completed) {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2 text-gray-900">السلة فارغة</h2>
          <p className="text-gray-500 mb-6">أضف منتجات للسلة أولاً</p>
          <Button onClick={() => router.push('/shop')}>تسوق الآن</Button>
        </div>
      </PageTransition>
    );
  }

  const handlePlaceOrder = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shippingAddress: form,
          paymentMethod,
          couponCode,
          notes: form.notes,
          subtotal: totals.subtotal,
          deliveryFee: totals.deliveryFee,
          taxAmount: totals.tax,
          total: totals.total,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCompleted(true);
        setLastOrder(data.order);
        clearCart();
        reset();
        toast.success('تم تقديم الطلب بنجاح!');
      } else {
        toast.error(data.error || 'فشل تقديم الطلب');
      }
    } catch {
      toast.error('فشل تقديم الطلب');
    } finally { setProcessing(false); }
  };

  if (completed) {
    return (
      <PageTransition>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }} className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900">تم تقديم الطلب!</h1>
          <p className="text-gray-500 mb-6">سيتم تأكيد طلبك وتوصيله في أقرب وقت</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push('/shop')}>متابعة التسوق</Button>
            <Button onClick={() => router.push('/customer')}>متابعة الطلب</Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ArrowRight className="h-4 w-4 text-gray-700" />
          </button>
          <button onClick={() => router.push('/')} className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <Home className="h-4 w-4 text-gray-700" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">إتمام الطلب</h1>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {(['shipping', 'payment', 'review'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-emerald-500 text-white' : i < ['shipping', 'payment', 'review'].indexOf(step) ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>{i + 1}</div>
              <span className="text-sm hidden sm:block text-gray-700">{s === 'shipping' ? 'العنوان' : s === 'payment' ? 'الدفع' : 'المراجعة'}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Shipping Step */}
            {step === 'shipping' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-xl border border-gray-200 bg-white space-y-4">
                <div className="flex items-center gap-2 mb-2"><MapPin className="h-5 w-5 text-emerald-600" /><h2 className="font-semibold text-gray-900">عنوان التوصيل</h2></div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="الاسم الكامل" placeholder="أحمد محمد" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="col-span-2" />
                  <Input label="رقم الجوال" placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <Input label="المدينة" placeholder="القاهرة" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <Input label="الحي" placeholder="حي النزهة" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                  <Input label="الشارع" placeholder="شارع النيل" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                  <Input label="رقم المبنى" placeholder="مبنى 12" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
                  <Input label="ملاحظات (اختياري)" placeholder="ملاحظات للسائق" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="col-span-2" />
                </div>
                <Button className="w-full" onClick={() => { setShippingAddress(form as any); setStep('payment'); }} disabled={!form.fullName || !form.phone || !form.city}>التالي</Button>
              </motion.div>
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-xl border border-gray-200 bg-white space-y-4">
                <div className="flex items-center gap-2 mb-2"><CreditCard className="h-5 w-5 text-emerald-600" /><h2 className="font-semibold text-gray-900">طريقة الدفع</h2></div>
                {[
                  { key: 'cod', label: 'الدفع عند الاستلام', icon: Wallet, desc: 'ادفع نقداً عند استلام الطلب' },
                  { key: 'card', label: 'بطاقة ائتمان', icon: CreditCard, desc: 'ادفع عبر بطاقة الائتمان أو الخصم' },
                  { key: 'online', label: 'دفع إلكتروني', icon: CreditCard, desc: 'ادفع عبر Apple Pay أو مدى' },
                ].map(({ key, label, icon: Icon, desc }) => (
                  <button key={key} onClick={() => setPaymentMethod(key as any)} className={`w-full flex items-center gap-4 p-4 rounded-xl border text-right transition-all ${paymentMethod === key ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${paymentMethod === key ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}><Icon className="h-5 w-5" /></div>
                    <div className="flex-1"><p className="font-medium text-gray-900">{label}</p><p className="text-xs text-gray-500">{desc}</p></div>
                    {paymentMethod === key && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                  </button>
                ))}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('shipping')}>السابق</Button>
                  <Button className="flex-1" onClick={() => setStep('review')}>التالي</Button>
                </div>
              </motion.div>
            )}

            {/* Review Step */}
            {step === 'review' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-xl border border-gray-200 bg-white space-y-4">
                <div className="flex items-center gap-2 mb-2"><CheckCircle className="h-5 w-5 text-emerald-600" /><h2 className="font-semibold text-gray-900">مراجعة الطلب</h2></div>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">العنوان:</span> <span className="text-gray-900">{form.fullName}، {form.street}، {form.district}، {form.city}</span></p>
                  <p><span className="text-gray-500">الجوال:</span> <span className="text-gray-900 font-mono">{form.phone}</span></p>
                  <p><span className="text-gray-500">الدفع:</span> <span className="text-gray-900">{paymentMethod === 'cod' ? 'الدفع عند الاستلام' : paymentMethod === 'card' ? 'بطاقة ائتمان' : 'دفع إلكتروني'}</span></p>
                </div>
                <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.variantId || item.productId} className="flex justify-between py-2 text-sm"><span className="text-gray-700">{item.nameAr} x{item.quantity}</span><span className="font-medium text-gray-900 tabular-nums">{formatCurrency(item.price * item.quantity)}</span></div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('payment')}>السابق</Button>
                  <Button className="flex-1 h-12 text-base bg-emerald-500 hover:bg-emerald-600" onClick={handlePlaceOrder} disabled={processing}>{processing ? <><Loader2 className="h-4 w-4 ml-1 animate-spin" /> جاري تقديم الطلب...</> : 'تأكيد الطلب'}</Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
              <h3 className="font-semibold text-gray-900">الطلب ({getItemCount()})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.variantId || item.productId} className="flex justify-between text-sm">
                    <span className="line-clamp-1 text-gray-700">{item.nameAr} x{item.quantity}</span>
                    <span className="font-medium text-gray-900 tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 mt-2 space-y-2">
                {/* Coupon Input */}
                <div className="flex gap-2">
                  <Input 
                    placeholder="كود الخصم (إن وجد)" 
                    value={couponInput} 
                    onChange={(e) => setCouponInput(e.target.value)}
                    disabled={!!appliedCoupon}
                    className="h-10 text-sm"
                  />
                  {!appliedCoupon ? (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (couponInput) {
                          const code = couponInput.trim().toUpperCase();
                          const found = branding.coupons?.find((c: any) => c.code.toUpperCase() === code && c.active);
                          if (found) {
                            // Check expiration
                            if (found.endDate && found.endDate < Date.now()) {
                              toast.error('هذا الكوبون منتهي الصلاحية');
                              return;
                            }
                            // Check min purchase
                            if (found.minPurchase && totals.subtotal < found.minPurchase) {
                              toast.error(`هذا الكوبون يتطلب مشتريات بقيمة ${formatCurrency(found.minPurchase)} على الأقل`);
                              return;
                            }
                            applyCoupon(found);
                            toast.success('تم تفعيل الكوبون بنجاح!');
                          } else {
                            toast.error('كوبون غير صحيح أو غير مفعل');
                          }
                        }
                      }}
                      className="h-10 px-4 text-sm"
                    >
                      تفعيل
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={() => { removeCoupon(); setCouponInput(''); }} className="h-10 px-4 text-sm">
                      إلغاء
                    </Button>
                  )}
                </div>

                <div className="space-y-1 text-sm pt-2 border-t border-gray-100">
                  <div className="flex justify-between"><span className="text-gray-500">المجموع</span><span className="text-gray-900 tabular-nums">{formatCurrency(totals.subtotal)}</span></div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between"><span className="text-gray-500">الخصم</span><span className="text-red-500 font-bold tabular-nums">-{formatCurrency(totals.discount)}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-gray-500">التوصيل</span><span className="text-emerald-600 tabular-nums">{totals.deliveryFee > 0 ? formatCurrency(totals.deliveryFee) : 'مجاني'}</span></div>
                  {totals.tax > 0 && (
                    <div className="flex justify-between"><span className="text-gray-500">الضريبة ({branding.taxRate}%)</span><span className="text-gray-900 tabular-nums">{formatCurrency(totals.tax)}</span></div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-1 border-t border-gray-100"><span className="text-gray-900">الإجمالي</span><span className="text-emerald-600 tabular-nums">{formatCurrency(totals.total)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
