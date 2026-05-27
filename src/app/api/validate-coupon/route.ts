import { NextResponse } from 'next/server';

const coupons = [
  { code: 'SAVE20', type: 'percentage', discountValue: 20, minPurchase: 100, maxDiscount: 50, active: true },
  { code: 'WELCOME10', type: 'fixed', discountValue: 10, minPurchase: 50, active: true },
  { code: 'FREESHIP', type: 'fixed', discountValue: 15, minPurchase: 0, active: true },
];

export async function POST(request: Request) {
  try {
    const { code, subtotal } = await request.json();
    if (!code) {
      return NextResponse.json({ valid: false, message: 'Missing code' }, { status: 400 });
    }

    const coupon = coupons.find((c) => c.code === code.toUpperCase());
    if (!coupon) {
      return NextResponse.json({ valid: false, message: 'كود الخصم غير صالح' });
    }

    if (!coupon.active) {
      return NextResponse.json({ valid: false, message: 'كود الخصم منتهي الصلاحية' });
    }

    if (coupon.minPurchase > 0 && subtotal < coupon.minPurchase) {
      return NextResponse.json({
        valid: false,
        message: `الحد الأدنى للطلب: ${coupon.minPurchase} ج.م`,
      });
    }

    return NextResponse.json({ valid: true, coupon });
  } catch {
    return NextResponse.json({ valid: false, message: 'خطأ في التحقق' }, { status: 500 });
  }
}
