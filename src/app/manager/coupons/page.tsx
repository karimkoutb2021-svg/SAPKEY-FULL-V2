'use client';

import { useState } from 'react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { formatCurrency, formatDate, generateId } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Coupon } from '@/types';

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function toDateInputValue(ts: number): string {
  return new Date(ts).toISOString().split('T')[0];
}

const EMPTY_FORM = {
  code: generateCouponCode(),
  name: '',
  nameAr: '',
  type: 'percentage' as Coupon['type'],
  discountValue: 0,
  minPurchase: 0,
  maxDiscount: 0,
  startDate: toDateInputValue(Date.now()),
  endDate: toDateInputValue(Date.now() + 30 * 24 * 60 * 60 * 1000),
  active: true,
};

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────
export default function ManagerCouponsPage() {
  const { branding, addCoupon, removeCoupon, updateCoupon } = useBrandingStore();
  const coupons: Coupon[] = branding.coupons ?? [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Stats ────────────────────────────────
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.active).length;
  const expiredCoupons = coupons.filter((c) => c.endDate < Date.now()).length;

  // ── Filtered list ────────────────────────
  const filtered = searchQuery.trim()
    ? coupons.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.nameAr.includes(searchQuery) ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : coupons;

  // ── Handlers ─────────────────────────────
  function handleCreate() {
    if (!form.code.trim()) {
      toast.error('يجب إدخال كود الكوبون');
      return;
    }
    if (!form.nameAr.trim()) {
      toast.error('يجب إدخال اسم الكوبون بالعربية');
      return;
    }
    if (form.discountValue <= 0) {
      toast.error('يجب إدخال قيمة الخصم');
      return;
    }
    if (coupons.some((c) => c.code.toUpperCase() === form.code.toUpperCase())) {
      toast.error('هذا الكود مستخدم بالفعل');
      return;
    }

    const newCoupon: Coupon = {
      id: generateId(),
      code: form.code.toUpperCase(),
      name: form.name || form.nameAr,
      nameAr: form.nameAr,
      type: form.type,
      discountValue: Number(form.discountValue),
      minPurchase: Number(form.minPurchase) || undefined,
      maxDiscount: Number(form.maxDiscount) || undefined,
      usageLimit: undefined,
      usedCount: 0,
      perUserLimit: 1,
      userIds: [],
      productIds: [],
      categoryIds: [],
      startDate: new Date(form.startDate).getTime(),
      endDate: new Date(form.endDate).getTime(),
      active: form.active,
      createdAt: Date.now(),
    };

    addCoupon(newCoupon);
    toast.success('تم إضافة الكوبون بنجاح');
    setForm({ ...EMPTY_FORM, code: generateCouponCode() });
    setShowForm(false);
  }

  function handleToggle(coupon: Coupon) {
    updateCoupon(coupon.id, { active: !coupon.active });
    toast.success(coupon.active ? 'تم تعطيل الكوبون' : 'تم تفعيل الكوبون');
  }

  function handleDelete(id: string) {
    removeCoupon(id);
    setDeleteConfirmId(null);
    toast.success('تم حذف الكوبون');
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`تم نسخ الكود: ${code}`);
  }

  function handleRegenerateCode() {
    setForm((f) => ({ ...f, code: generateCouponCode() }));
  }

  // ── Coupon status helpers ────────────────
  function getCouponStatus(coupon: Coupon): { label: string; color: string } {
    const now = Date.now();
    if (!coupon.active) return { label: 'معطّل', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
    if (coupon.endDate < now) return { label: 'منتهي', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    if (coupon.startDate > now) return { label: 'لم يبدأ', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    return { label: 'نشط', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  }

  return (
    <PageTransition>
      <div dir="rtl" className="space-y-6">
        {/* ── Header ───────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">كوبونات الخصم</h1>
            <p className="text-sm text-gray-400 mt-1">إدارة كوبونات الخصم والعروض الترويجية</p>
          </div>
          <Button
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm) setForm({ ...EMPTY_FORM, code: generateCouponCode() });
            }}
            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0"
          >
            {showForm ? 'إلغاء' : '+ إضافة كوبون'}
          </Button>
        </div>

        {/* ── Stats Row ────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
            <p className="text-sm text-gray-400">إجمالي الكوبونات</p>
            <p className="text-2xl font-bold mt-1">{totalCoupons}</p>
          </div>
          <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-5">
            <p className="text-sm text-emerald-400/70">كوبونات نشطة</p>
            <p className="text-2xl font-bold mt-1 text-emerald-400">{activeCoupons}</p>
          </div>
          <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-5">
            <p className="text-sm text-red-400/70">منتهية الصلاحية</p>
            <p className="text-2xl font-bold mt-1 text-red-400">{expiredCoupons}</p>
          </div>
        </div>

        {/* ── Add Coupon Form (Collapsible) ── */}
        {showForm && (
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold mb-2">إضافة كوبون جديد</h3>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">كود الكوبون</label>
                <div className="flex gap-2">
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="SAVE20"
                    className="font-mono tracking-widest bg-white/[0.04] border-white/[0.08] text-base"
                  />
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="px-4 py-2 rounded-xl bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] transition-colors text-sm whitespace-nowrap"
                  >
                    توليد عشوائي
                  </button>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="اسم الكوبون (عربي)"
                  value={form.nameAr}
                  onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                  placeholder="خصم الصيف"
                  className="bg-white/[0.04] border-white/[0.08]"
                />
                <Input
                  label="اسم الكوبون (إنجليزي - اختياري)"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Summer Sale"
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>

              {/* Type & Value */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">نوع الخصم</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Coupon['type'] }))}
                    className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
                  >
                    <option value="percentage">نسبة مئوية (%)</option>
                    <option value="fixed">مبلغ ثابت (جنيه)</option>
                  </select>
                </div>
                <Input
                  label={form.type === 'percentage' ? 'نسبة الخصم (%)' : 'قيمة الخصم (جنيه)'}
                  type="number"
                  min="0"
                  max={form.type === 'percentage' ? '100' : undefined}
                  value={form.discountValue || ''}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))}
                  placeholder={form.type === 'percentage' ? '20' : '50'}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
                <Input
                  label="الحد الأقصى للخصم (جنيه)"
                  type="number"
                  min="0"
                  value={form.maxDiscount || ''}
                  onChange={(e) => setForm((f) => ({ ...f, maxDiscount: Number(e.target.value) }))}
                  placeholder="100"
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>

              {/* Min Purchase & Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="الحد الأدنى للشراء (جنيه)"
                  type="number"
                  min="0"
                  value={form.minPurchase || ''}
                  onChange={(e) => setForm((f) => ({ ...f, minPurchase: Number(e.target.value) }))}
                  placeholder="200"
                  className="bg-white/[0.04] border-white/[0.08]"
                />
                <Input
                  label="تاريخ البداية"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
                <Input
                  label="تاريخ النهاية"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    form.active ? 'bg-emerald-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      form.active ? 'right-0.5' : 'right-[calc(100%-22px)]'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-300">{form.active ? 'نشط' : 'معطّل'}</span>
              </div>

              {/* Submit */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                >
                  حفظ الكوبون
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Search ───────────────────────── */}
        {coupons.length > 0 && (
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بكود الكوبون أو الاسم..."
            className="bg-white/[0.04] border-white/[0.08] max-w-md"
          />
        )}

        {/* ── Coupons List ─────────────────── */}
        {coupons.length === 0 ? (
          /* ── Empty State ──────────────── */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                <path d="M13 5v2" />
                <path d="M13 17v2" />
                <path d="M13 11v2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">لا توجد كوبونات بعد</h3>
            <p className="text-sm text-gray-400 max-w-sm">
              قم بإنشاء كوبون خصم جديد لجذب المزيد من العملاء وزيادة المبيعات
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
            >
              + إضافة أول كوبون
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">لا توجد نتائج مطابقة للبحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((coupon) => {
              const status = getCouponStatus(coupon);
              const isExpired = coupon.endDate < Date.now();

              return (
                <div
                  key={coupon.id}
                  className={`rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-4 transition-opacity ${
                    isExpired || !coupon.active ? 'opacity-60' : ''
                  }`}
                >
                  {/* Top row: code + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Code pill */}
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        title="نسخ الكود"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors group"
                      >
                        <span className="font-mono font-bold text-emerald-400 tracking-wider text-sm">
                          {coupon.code}
                        </span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-emerald-400/50 group-hover:text-emerald-400 transition-colors"
                        >
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </button>
                    </div>
                    <Badge className={`shrink-0 border ${status.color}`}>
                      {status.label}
                    </Badge>
                  </div>

                  {/* Name & discount info */}
                  <div>
                    <p className="font-semibold text-sm">{coupon.nameAr}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                      <span>
                        الخصم:{' '}
                        <span className="text-white font-medium">
                          {coupon.type === 'percentage'
                            ? `${coupon.discountValue}%`
                            : formatCurrency(coupon.discountValue)}
                        </span>
                      </span>
                      {coupon.minPurchase ? (
                        <span>
                          الحد الأدنى: <span className="text-white font-medium">{formatCurrency(coupon.minPurchase)}</span>
                        </span>
                      ) : null}
                      {coupon.maxDiscount ? (
                        <span>
                          أقصى خصم: <span className="text-white font-medium">{formatCurrency(coupon.maxDiscount)}</span>
                        </span>
                      ) : null}
                      <span>
                        الاستخدام: <span className="text-white font-medium">{coupon.usedCount} مرة</span>
                      </span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>من: {formatDate(coupon.startDate)}</span>
                    <span>إلى: {formatDate(coupon.endDate)}</span>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(coupon)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        coupon.active ? 'bg-emerald-500' : 'bg-gray-600'
                      }`}
                      title={coupon.active ? 'تعطيل الكوبون' : 'تفعيل الكوبون'}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                          coupon.active ? 'right-0.5' : 'right-[calc(100%-18px)]'
                        }`}
                      />
                    </button>
                    <span className="text-xs text-gray-400 ml-1">
                      {coupon.active ? 'مفعّل' : 'معطّل'}
                    </span>

                    <div className="flex-1" />

                    {/* Copy */}
                    <button
                      onClick={() => handleCopyCode(coupon.code)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-gray-400 transition-colors"
                    >
                      نسخ الكود
                    </button>

                    {/* Delete */}
                    {deleteConfirmId === coupon.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs transition-colors"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] text-xs transition-colors"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(coupon.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400/70 hover:bg-red-500/20 hover:text-red-400 text-xs transition-colors"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
