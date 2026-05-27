'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { ArrowRightLeft, Building2, Package, Search, ArrowLeft, ArrowRight, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useTableSync } from '@/hooks/use-realtime-sync';
import toast from 'react-hot-toast';

export default function TransferPage() {
  const { data: warehouses, loading: whLoading } = useTableSync<any>('warehouses');
  const { data: stockItems, loading: stockLoading } = useTableSync<any>('stock_items');
  const [step, setStep] = useState<'select' | 'transfer' | 'confirm'>('select');
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [transferQty, setTransferQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const sourceProducts = (stockItems || []).filter((p: any) => p.warehouse_id === fromWarehouse);
  const fromName = (warehouses || []).find((w: any) => w.id === fromWarehouse)?.name || '';
  const toName = (warehouses || []).find((w: any) => w.id === toWarehouse)?.name || '';

  const handleTransfer = async () => {
    if (!selectedProduct || transferQty <= 0 || transferQty > (selectedProduct.quantity || 0)) {
      toast.error('كمية غير صالحة'); return;
    }
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    const name = selectedProduct.name_ar || selectedProduct.name || '';
    toast.success(`تم تحويل ${transferQty} ${name} من ${fromName} إلى ${toName}`);
    setCompleted(true);
    setProcessing(false);
  };

  const reset = () => {
    setStep('select');
    setFromWarehouse('');
    setToWarehouse('');
    setSelectedProduct(null);
    setTransferQty(1);
    setNotes('');
    setCompleted(false);
  };

  if (whLoading || stockLoading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </PageTransition>
    );
  }

  if (completed) {
    return (
      <PageTransition>
        <div className="max-w-lg mx-auto py-20 text-center space-y-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </motion.div>
          <h2 className="text-2xl font-bold">تم التحويل بنجاح</h2>
          <p className="text-muted-foreground">تم نقل {transferQty} وحدة من {selectedProduct?.name_ar || selectedProduct?.name || ''} من {fromName} إلى {toName}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={reset}>تحويل جديد</Button>
            <Button variant="outline" onClick={() => window.history.back()}>العودة</Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">تحويل المخزون بين المستودعات</h1>
          <p className="text-muted-foreground">نقل المنتجات من مستودع إلى آخر</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3">
          {['اختيار المستودعات', 'اختيار المنتج', 'تأكيد التحويل'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 && step === 'select' ? 'bg-primary text-primary-foreground' : i === 1 && step === 'transfer' ? 'bg-primary text-primary-foreground' : i === 2 && step === 'confirm' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
              <span className="text-xs hidden sm:block">{label}</span>
              {i < 2 && <ArrowLeft className="h-3 w-3 text-muted-foreground hidden sm:block" />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            {step === 'select' && (
              <>
                <CardTitle className="text-base">اختر المستودعات</CardTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">من المستودع</label>
                    <select
                      value={fromWarehouse}
                      onChange={(e) => { setFromWarehouse(e.target.value); setToWarehouse(''); }}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">اختر...</option>
                      {(warehouses || []).map((w: any) => <option key={w.id} value={w.id}>{w.name} - {w.location || ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">إلى المستودع</label>
                    <select
                      value={toWarehouse}
                      onChange={(e) => setToWarehouse(e.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">اختر...</option>
                      {(warehouses || []).filter((w: any) => w.id !== fromWarehouse).map((w: any) => <option key={w.id} value={w.id}>{w.name} - {w.location || ''}</option>)}
                    </select>
                  </div>
                </div>
                <Button className="w-full" disabled={!fromWarehouse || !toWarehouse} onClick={() => setStep('transfer')}>التالي</Button>
              </>
            )}

            {step === 'transfer' && (
              <>
                <div className="flex items-center justify-between text-sm bg-muted/50 p-3 rounded-xl">
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />{fromName}</div>
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />{toName}</div>
                </div>

                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" placeholder="ابحث عن منتج..." className="h-11 w-full rounded-xl border border-input bg-background pr-10 pl-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sourceProducts.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProduct(p); setTransferQty(Math.min(transferQty, p.quantity || 0)); }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-right transition-all ${selectedProduct?.id === p.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{p.name_ar || p.name || ''}</p>
                          <p className="text-xs text-muted-foreground">{p.sku || p.barcode || ''} • متوفر: {p.quantity || 0}</p>
                        </div>
                      </div>
                      {selectedProduct?.id === p.id && <CheckCircle className="h-5 w-5 text-primary" />}
                    </button>
                  ))}
                </div>

                {selectedProduct && (
                  <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                    <p className="font-medium">الكمية المراد تحويلها من {selectedProduct.name_ar || selectedProduct.name || ''}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-xl">
                        <button onClick={() => setTransferQty(Math.max(1, transferQty - 1))} className="h-10 w-10 flex items-center justify-center hover:bg-accent">-</button>
                        <span className="h-10 w-16 flex items-center justify-center border-x text-lg font-bold tabular-nums">{transferQty}</span>
                        <button onClick={() => setTransferQty(Math.min(selectedProduct.quantity || 0, transferQty + 1))} className="h-10 w-10 flex items-center justify-center hover:bg-accent">+</button>
                      </div>
                      <span className="text-sm text-muted-foreground">الحد الأقصى: {selectedProduct.quantity || 0}</span>
                    </div>
                    <Input label="ملاحظات (اختياري)" placeholder="سبب التحويل..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('select')}>السابق</Button>
                  <Button className="flex-1" disabled={!selectedProduct || transferQty <= 0} onClick={() => setStep('confirm')}>التالي</Button>
                </div>
              </>
            )}

            {step === 'confirm' && selectedProduct && (
              <>
                <CardTitle className="text-base">تأكيد التحويل</CardTitle>
                <div className="space-y-3 text-sm">
                  <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">المنتج</span><span className="font-medium">{selectedProduct.name_ar || selectedProduct.name || ''}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">من</span><span>{fromName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">إلى</span><span>{toName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">الكمية</span><span className="font-bold text-lg">{transferQty}</span></div>
                    {notes && <div className="flex justify-between"><span className="text-muted-foreground">ملاحظات</span><span>{notes}</span></div>}
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>سيتم خصم {transferQty} وحدة من {fromName} وإضافتها إلى {toName}.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('transfer')}>تعديل</Button>
                  <Button className="flex-1" onClick={handleTransfer} disabled={processing}>
                    {processing ? <><Loader2 className="h-4 w-4 ml-1 animate-spin" /> جاري التحويل...</> : 'تأكيد التحويل'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

