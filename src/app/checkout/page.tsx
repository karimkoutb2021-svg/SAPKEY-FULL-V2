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
  const { shippingAddress, paymentMethod, notes, setShippingAddress, setPaymentMethod, setNotes, setLastOrder, reset } = useCheckoutStore();
  const [step, setStep] = useState<Step>('shipping');
  const [walletPhone, setWalletPhone] = useState('');
  const [cardPhone, setCardPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { branding } = useBrandingStore();
  const [couponInput, setCouponInput] = useState('');
  const { items, getTotal, appliedCoupon, applyCoupon, removeCoupon } = useCartStore();
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
          paymentMethod: paymentMethod === 'wallet' ? `wallet (${walletPhone})` : paymentMethod === 'card' ? `card (${cardPhone})` : paymentMethod,
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

  const generateWhatsAppLink = () => {
    const storePhone = branding.whatsapp || branding.phone || '';
    if (!storePhone) return null;

    let msg = `*🛍️ طلب جديد من المتجر الإلكتروني*\n\n`;
    msg += `👤 *العميل:* ${form.fullName}\n`;
    msg += `📱 *الجوال:* ${form.phone}\n`;
    msg += `📍 *العنوان:* ${form.city} - ${form.district}، ${form.street}، مبنى ${form.building}\n`;
    if (form.notes) msg += `📝 *ملاحظات:* ${form.notes}\n`;
    msg += `\n*💳 طريقة الدفع:* ${paymentMethod === 'cod' ? 'نقداً عند الاستلام' : paymentMethod === 'wallet' ? 'محفظة إلكترونية (' + walletPhone + ')' : 'بطاقة ائتمان'}\n\n`;
    
    msg += `*📦 المنتجات:*\n`;
    items.forEach((item) => {
      msg += `▪️ ${item.nameAr} - العدد: ${item.quantity} - السعر: ${formatCurrency(item.price * item.quantity)}\n`;
    });
    
    msg += `\n*🧾 الملخص:*\n`;
    msg += `المجموع: ${formatCurrency(totals.subtotal)}\n`;
    if (totals.discount > 0) msg += `الخصم: -${formatCurrency(totals.discount)}\n`;
    msg += `التوصيل: ${totals.deliveryFee > 0 ? formatCurrency(totals.deliveryFee) : 'مجاني'}\n`;
    if (totals.tax > 0) msg += `الضريبة: ${formatCurrency(totals.tax)}\n`;
    msg += `*الإجمالي المستحق: ${formatCurrency(totals.total)}*\n`;

    const cleanPhone = storePhone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.startsWith('20') ? cleanPhone : `20${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`;
    return `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`;
  };

  if (completed) {
    const waLink = generateWhatsAppLink();
    return (
      <PageTransition>
        <div className="max-w-md mx-auto px-4 py-8">
          {/* Professional Receipt */}
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            {/* Receipt Header */}
            <div className="bg-gray-50 border-b border-dashed border-gray-300 p-6 text-center relative">
              <div className="absolute -bottom-3 left-[-10px] w-6 h-6 bg-gray-50 rounded-full"></div>
              <div className="absolute -bottom-3 right-[-10px] w-6 h-6 bg-gray-50 rounded-full"></div>
              
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">تم تأكيد الطلب!</h2>
              <p className="text-sm text-gray-500">رقم الطلب: #{Math.floor(100000 + Math.random() * 900000)}</p>
            </div>

            {/* Receipt Body */}
            <div className="p-6 space-y-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-gray-500">العميل</span>
                  <span className="font-bold text-gray-900">{form.fullName}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-gray-500">طريقة الدفع</span>
                  <span className="font-bold text-gray-900">{paymentMethod === 'cod' ? 'نقداً عند الاستلام' : paymentMethod === 'wallet' ? 'محفظة إلكترونية' : 'بطاقة ائتمان'}</span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-3 text-sm">المنتجات</h3>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.nameAr} <span className="text-gray-400">x{item.quantity}</span></span>
                      <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-100">
                <div className="flex justify-between"><span className="text-gray-500">المجموع</span><span className="text-gray-900 font-medium tabular-nums">{formatCurrency(totals.subtotal)}</span></div>
                {totals.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">الخصم</span><span className="text-red-500 font-medium tabular-nums">-{formatCurrency(totals.discount)}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">التوصيل</span><span className="text-emerald-600 font-medium tabular-nums">{totals.deliveryFee > 0 ? formatCurrency(totals.deliveryFee) : 'مجاني'}</span></div>
                <div className="flex justify-between text-lg font-black pt-2 border-t border-gray-200 mt-2"><span className="text-gray-900">الإجمالي</span><span className="text-emerald-600 tabular-nums">{formatCurrency(totals.total)}</span></div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 space-y-3">
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="w-full h-14 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/30 transition-all">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                أرسل الطلب عبر واتساب
              </a>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12" onClick={() => router.push('/shop')}>تسوق المزيد</Button>
              <Button className="flex-1 h-12" onClick={() => router.push('/customer')}>طلباتي</Button>
            </div>
          </motion.div>
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
                  { key: 'wallet', label: 'محفظة إلكترونية', icon: Wallet, desc: 'فودافون كاش، اتصالات كاش، إلخ' },
                ].map(({ key, label, icon: Icon, desc }) => (
                  <div key={key}>
                    <button onClick={() => setPaymentMethod(key as any)} className={`w-full flex items-center gap-4 p-4 rounded-xl border text-right transition-all ${paymentMethod === key ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${paymentMethod === key ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}><Icon className="h-5 w-5" /></div>
                      <div className="flex-1"><p className="font-medium text-gray-900 dark:text-white">{label}</p><p className="text-xs text-gray-500">{desc}</p></div>
                      {paymentMethod === key && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                    </button>
                    {paymentMethod === 'wallet' && key === 'wallet' && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                        <Input type="tel" label="رقم المحفظة" placeholder="01XXXXXXXXX" value={walletPhone} onChange={(e) => setWalletPhone(e.target.value)} />
                      </div>
                    )}
                    {paymentMethod === 'card' && key === 'card' && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                        <Input type="tel" label="رقم الهاتف المسجل بالبطاقة" placeholder="01XXXXXXXXX" value={cardPhone} onChange={(e) => setCardPhone(e.target.value)} />
                      </div>
                    )}
                  </div>
                ))}
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
          {/* Fixed Bottom Bar for Actions like POS */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] p-4 safe-area-bottom">
            <div className="max-w-4xl mx-auto flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 font-medium">الإجمالي المستحق</p>
                <p className="text-xl font-black text-emerald-600">{formatCurrency(totals.total)}</p>
              </div>
              <div className="flex items-center gap-3 w-2/3">
                {step !== 'shipping' && (
                  <Button variant="outline" className="h-12 w-1/3 text-base font-bold" onClick={() => setStep(step === 'review' ? 'payment' : 'shipping')}>السابق</Button>
                )}
                {step === 'review' ? (
                  <Button className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" onClick={handlePlaceOrder} disabled={processing}>
                    {processing ? <><Loader2 className="h-5 w-5 ml-2 animate-spin" /> جاري التأكيد...</> : 'إتمام الطلب'}
                  </Button>
                ) : (
                  <Button className="flex-1 h-12 text-base font-bold bg-gray-900 hover:bg-gray-800 text-white" 
                    onClick={() => setStep(step === 'shipping' ? 'payment' : 'review')} 
                    disabled={step === 'shipping' ? (!form.fullName || !form.phone || !form.city) : false}>
                    متابعة
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Spacer for bottom bar */}
        <div className="h-24"></div>
      </div>
    </PageTransition>
  );
}
