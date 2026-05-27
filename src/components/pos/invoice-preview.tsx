'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Printer, X, Share2, MessageCircle, CheckCircle2, Plus } from 'lucide-react';
import type { POSOrder } from '@/lib/pos/pos-store';
import { generateReceiptData, printReceiptA4, shareViaWhatsApp } from '@/lib/pos/receipt';
import toast from 'react-hot-toast';

interface InvoicePreviewProps {
  order: POSOrder | null;
  onClose: () => void;
}

export function InvoicePreview({ order, onClose }: InvoicePreviewProps) {
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);

  if (!order) return null;

  const receipt = generateReceiptData(order);

  const handleWhatsAppShare = () => {
    const num = whatsAppNumber || order.customerPhone || '';
    if (!num) { toast.error('أدخل رقم واتساب'); return; }
    shareViaWhatsApp(receipt, num);
    setShowWhatsAppInput(false);
    toast.success('تم إرسال الفاتورة');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white text-black rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()} dir="rtl">

        {/* Success Header */}
        <div className="bg-emerald-500 text-white px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold">تمت العملية بنجاح</h3>
            <p className="text-xs text-emerald-100">{order.order_number || order.id}</p>
          </div>
          <button onClick={onClose} className="mr-auto h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors" title="طلب جديد">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-center mb-3">
            <h2 className="text-base font-bold">{receipt.slogan}</h2>
            <p className="text-[10px] text-gray-500">{receipt.address} | هاتف: {receipt.phone}</p>
          </div>

          <div className="flex justify-between text-[10px] text-gray-500 mb-2">
            <span>رقم: {order.order_number || order.id}</span>
            <span>{receipt.date} {receipt.time}</span>
          </div>
          {order.customerName && <p className="text-[10px] text-gray-500 mb-2">العميل: {order.customerName}</p>}

          {/* Items */}
          <div className="border-t border-b border-dashed border-gray-300 py-2 mb-2">
            <div className="flex justify-between text-[10px] font-bold pb-1 mb-1 border-b border-gray-200">
              <span className="flex-1">الصنف</span>
              <span className="w-8 text-center">الكمية</span>
              <span className="w-16 text-left">الإجمالي</span>
            </div>
            {receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between text-[11px] py-0.5">
                <span className="flex-1">{item.nameAr}</span>
                <span className="w-8 text-center">{item.quantity}</span>
                <span className="w-16 text-left font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-gray-500"><span>المجموع</span><span>{formatCurrency(receipt.subtotal)}</span></div>
            {receipt.discount > 0 && <div className="flex justify-between text-red-600"><span>الخصم</span><span>-{formatCurrency(receipt.discount)}</span></div>}
            <div className="flex justify-between text-gray-500"><span>الضريبة ({receipt.taxRate}%)</span><span>{formatCurrency(receipt.tax)}</span></div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-300 mt-2">
              <span>الإجمالي</span>
              <span className="text-emerald-600">{formatCurrency(receipt.total)}</span>
            </div>
            <div className="flex justify-between text-gray-500"><span>المدفوع</span><span>{formatCurrency(receipt.paidAmount)}</span></div>
            {receipt.changeAmount > 0 && <div className="flex justify-between text-green-600"><span>الباقي</span><span>{formatCurrency(receipt.changeAmount)}</span></div>}
            <div className="flex justify-between text-gray-500">
              <span>طريقة الدفع</span>
              <span>{
                order.paymentMethod === 'cash' ? 'نقداً 💵' :
                order.paymentMethod === 'card' ? 'بطاقة 💳' :
                order.paymentMethod === 'wallet' ? 'محفظة 📱' :
                order.paymentMethod === 'credit' ? 'آجل 📋' :
                order.paymentMethod === 'mixed' ? 'متعدد 💰' : 'أونلاين 🌐'
              }</span>
            </div>

            {order.splitPayments && order.splitPayments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                <p className="text-[10px] font-bold text-gray-500 mb-1">تفاصيل الدفع المتعدد:</p>
                {order.splitPayments.map((p, i) => (
                  <div key={i} className="flex justify-between text-[10px] text-gray-500">
                    <span>{
                      p.method === 'cash' ? 'نقداً' :
                      p.method === 'card' ? 'بطاقة' :
                      p.method === 'wallet' ? 'محفظة' :
                      p.method === 'credit' ? `آجل (${p.dueDate || 'بدون تاريخ'})` : p.method
                    }</span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center mt-4 py-2 border-t border-dashed border-gray-300">
            <p className="text-xs font-bold">شكراً لتسوقك معنا! 🌟</p>
          </div>
        </div>

        {/* WhatsApp Input */}
        {showWhatsAppInput && (
          <div className="px-4 py-2 border-t border-gray-200 space-y-2 shrink-0">
            <div className="flex gap-2">
              <input type="tel" placeholder="01XXXXXXXXX" value={whatsAppNumber} onChange={(e) => setWhatsAppNumber(e.target.value)} className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-xs" dir="ltr" />
              <Button size="sm" onClick={handleWhatsAppShare}>إرسال</Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-3 border-t border-gray-200 grid grid-cols-2 gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="border-gray-300 font-bold"><Plus className="h-4 w-4 ml-1" /> طلب جديد</Button>
          <Button size="sm" onClick={() => printReceiptA4(receipt)}><Printer className="h-3.5 w-3.5 ml-1" /> طباعة</Button>
          <Button variant="outline" size="sm" onClick={async () => { try { const t = `🧾 فاتورة ${order.order_number || order.id}\n💰 ${formatCurrency(receipt.total)}`; if (navigator.share) { await navigator.share({ title: 'الفاتورة', text: t }); } else { await navigator.clipboard.writeText(t); toast.success('تم النسخ'); } } catch { toast.success('تم'); } }}><Share2 className="h-3.5 w-3.5 ml-1" /> مشاركة</Button>
          <Button variant="outline" size="sm" onClick={() => setShowWhatsAppInput(true)} className="text-emerald-600 border-emerald-200"><MessageCircle className="h-3.5 w-3.5 ml-1" /> واتساب</Button>
        </div>
      </div>
    </div>
  );
}
