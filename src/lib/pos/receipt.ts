'use client';

import type { POSCartItem, POSOrder } from './pos-store';
import { formatCurrency } from '@/lib/utils';

export interface ReceiptData {
  storeName: string;
  slogan:string;
  address: string;
  phone: string;
  taxNumber: string;
  receiptNumber: string;
  cashierName: string;
  date: string;
  time: string;
  items: POSCartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  taxRate: number;
  deliveryFee: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  whatsappNumber?: string;
}

export function loadBranding(): { storeName: string; storeNameEn: string; slogan: string; address: string; phone: string; taxNumber: string; whatsapp: string; footer: string; logo: string; primaryColor: string } {
  const def: any = { storeName: 'سوبر ماركت', storeNameEn: 'SuperMarket', slogan: 'السوبر ماركت الذكي', address: 'القاهرة', phone: '0100XXXXXXX', taxNumber: '300XXXXXXX', whatsapp: '', footer: 'جميع الحقوق محفوظة', logo: '', primaryColor: '#22C55E' };
  if (typeof window === 'undefined') return def;
  try { const saved = localStorage.getItem('branding'); if (saved) return { ...def, ...JSON.parse(saved) }; } catch {}
  return def;
}

export function generateReceiptData(order: POSOrder, cashierName: string = 'كاشير'): ReceiptData {
  const now = new Date();
  const brand = loadBranding();
  return {
    storeName: (brand as any).storeNameEn || brand.storeName || 'SuperMarket',
    slogan: brand.slogan || 'السوبر ماركت الذكي',
    address: brand.address || 'القاهرة',
    phone: brand.phone || '0100XXXXXXX',
    taxNumber: brand.taxNumber || '300XXXXXXX',
    receiptNumber: order.id,
    cashierName,
    date: now.toLocaleDateString('ar-EG'),
    time: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    items: order.items,
    subtotal: order.subtotal,
    discount: order.orderDiscount,
    tax: order.taxTotal,
    taxRate: 15,
    deliveryFee: 0,
    total: order.total,
    paidAmount: order.paidAmount,
    changeAmount: order.changeAmount,
    paymentMethod: order.paymentMethod,
    customerName: order.customerName || undefined,
    customerPhone: order.customerPhone || undefined,
    whatsappNumber: order.customerPhone || undefined,
  };
}

// Print A4 PDF style receipt
export function printReceiptA4(data: ReceiptData): void {
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) return;

  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>فاتورة - ${data.receiptNumber}</title>
<style>
@page { size: A4; margin: 15mm; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Cairo','Tajawal',sans-serif; font-size:12px; color:#000; background:#fff; padding:20px; direction:rtl; }
.header { text-align:center; margin-bottom:20px; padding-bottom:15px; border-bottom:2px solid #22C55E; }
.header h1 { font-size:22px; color:#22C55E; margin-bottom:3px; }
.header p { font-size:11px; color:#666; }
.info-table { width:100%; border-collapse:collapse; margin-bottom:15px; font-size:11px; }
.info-table td { padding:3px 5px; }
.items-table { width:100%; border-collapse:collapse; margin-bottom:15px; }
.items-table th { background:#22C55E; color:white; padding:8px 6px; font-size:11px; text-align:center; }
.items-table td { padding:6px; border-bottom:1px solid #eee; text-align:center; font-size:11px; }
.items-table tr:nth-child(even) { background:#f9f9f9; }
.summary { width:300px; margin-right:auto; }
.summary td { padding:5px 8px; font-size:12px; }
.summary .total-row td { font-size:16px; font-weight:bold; color:#22C55E; padding-top:8px; border-top:2px solid #22C55E; }
.footer { text-align:center; margin-top:25px; padding-top:15px; border-top:1px solid #ddd; font-size:10px; color:#888; }
.barcode { text-align:center; font-family:monospace; font-size:14px; letter-spacing:2px; margin:8px 0; }
</style></head><body>
<div class="header"><h1>${data.slogan}</h1><p>${data.address} | هاتف: ${data.phone} | ضريبي: ${data.taxNumber}</p></div>
<table class="info-table"><tr>
<td><b>الفاتورة:</b> ${data.receiptNumber}</td>
<td><b>التاريخ:</b> ${data.date} ${data.time}</td>
<td><b>الكاشير:</b> ${data.cashierName}</td></tr>
${data.customerName?`<tr><td colspan="3"><b>العميل:</b> ${data.customerName} ${data.customerPhone?`| ${data.customerPhone}`:''}</td></tr>`:''}
</table>
<table class="items-table"><thead><tr><th>م</th><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>
${data.items.map((item,i)=>`<tr><td>${i+1}</td><td>${item.nameAr}</td><td>${item.unit}</td><td>${item.quantity}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.price*item.quantity)}</td></tr>`).join('')}
</tbody></table>
<table class="summary"><tr><td>المجموع الفرعي</td><td>${formatCurrency(data.subtotal)}</td></tr>
${data.discount>0?`<tr><td>الخصم</td><td>-${formatCurrency(data.discount)}</td></tr>`:''}
<tr><td>ضريبة القيمة المضافة (${data.taxRate}%)</td><td>${formatCurrency(data.tax)}</td></tr>
${data.deliveryFee>0?`<tr><td>رسوم التوصيل</td><td>${formatCurrency(data.deliveryFee)}</td></tr>`:''}
<tr class="total-row"><td>الإجمالي</td><td>${formatCurrency(data.total)}</td></tr>
<tr><td>المدفوع</td><td>${formatCurrency(data.paidAmount)}</td></tr>
${data.changeAmount>0?`<tr><td>الباقي</td><td>${formatCurrency(data.changeAmount)}</td></tr>`:''}
<tr><td>طريقة الدفع</td><td>${data.paymentMethod==='cash'?'نقداً':data.paymentMethod==='card'?'بطاقة':data.paymentMethod==='wallet'?'محفظة':'آخرى'}</td></tr>
</table>
<div class="barcode">${data.receiptNumber}</div>
<div class="footer"><p>شكراً لتسوقك معنا! 🌟</p><p>${data.date} ${data.time}</p><p style="font-size:9px;margin-top:3px;">${data.slogan}</p></div>
<script>window.print();</script></body></html>`);
  w.document.close();
}

// WhatsApp share
export function shareViaWhatsApp(data: ReceiptData, adminPhone: string): void {
  const text = `🧾 *فاتورة ${data.receiptNumber}*\n📅 ${data.date} ${data.time}\n━━━━━━━━━━━━━━\n${data.items.map(i=>`${i.nameAr} ×${i.quantity} = ${formatCurrency(i.price*i.quantity)}`).join('\n')}\n━━━━━━━━━━━━━━\n💰 الإجمالي: ${formatCurrency(data.total)}\n💳 الدفع: ${data.paymentMethod==='cash'?'نقداً':'بطاقة'}\n━━━━━━━━━━━━━━\n${data.slogan}`;
  const url = `https://wa.me/${adminPhone.replace(/^0/,'20').replace(/[^0-9]/g,'')}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
