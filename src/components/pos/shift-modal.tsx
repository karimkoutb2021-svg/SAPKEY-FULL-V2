'use client';

/**
 * ═══════════════════════════════════════════════════════════
 *  إدارة الورديات - Shift Management
 * ═══════════════════════════════════════════════════════════
 * 
 * شاشة فتح الوردية: إدخال عهدة البداية + الرصيد المرحل
 * شاشة أثناء الوردية: ملخص المبيعات (كاش، فيزا، شبكة، آجل)
 * شاشة إغلاق الوردية: تسليم الكاش + الفيزا + المبيعات الآجلة
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Lock, Unlock, CreditCard, Network,
  AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown,
  Receipt, Wallet, Calendar, ArrowLeftRight, PiggyBank} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { shiftService, type Shift } from '@/lib/supabase/services/shifts';
import { usePOSStore } from '@/lib/pos/pos-store';
import { useAuthStore } from '@/lib/store/auth-store';
import toast from 'react-hot-toast';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashierId: string;
  onShiftChange: (shift: Shift | null) => void;
}

type ShiftView = 'open' | 'active' | 'close';

export function ShiftModal({ isOpen, onClose, cashierId, onShiftChange }: ShiftModalProps) {
  const { user } = useAuthStore();
  const completedOrders = usePOSStore(s => s.completedOrders);
  
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [view, setView] = useState<ShiftView>('open');
  const [loading, setLoading] = useState(false);

  // فتح الوردية
  const [startingCash, setStartingCash] = useState('');
  const [previousClosingCash, setPreviousClosingCash] = useState(0);

  // إغلاق الوردية
  const [actualCash, setActualCash] = useState('');
  const [actualCard, setActualCard] = useState('');
  const [actualNetwork, setActualNetwork] = useState('');
  const [notes, setNotes] = useState('');

  // اعتماد الفرق
  const [discrepancyReason, setDiscrepancyReason] = useState('');

  // ═══════════════════════════════════════════════════════
  // حساب ملخص الوردية من الطلبات المكتملة
  // Calculate shift summary from completed orders
  // ═══════════════════════════════════════════════════════
  const shiftSummary = useMemo(() => {
    if (!currentShift) return null;

    const shiftStart = new Date(currentShift.opened_at).getTime();
    const shiftOrders = completedOrders.filter(o => o.createdAt >= shiftStart);

    let totalSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let walletSales = 0;
    let creditSales = 0;
    let mixedSales = 0;
    let orderCount = 0;

    for (const order of shiftOrders) {
      totalSales += order.total;
      orderCount++;

      if (order.paymentMethod === 'cash') {
        cashSales += order.total;
      } else if (order.paymentMethod === 'card') {
        cardSales += order.total;
      } else if (order.paymentMethod === 'online') {
        walletSales += order.total;
      } else if (order.paymentMethod === 'credit') {
        creditSales += order.total;
      } else if (order.paymentMethod === 'mixed') {
        mixedSales += order.total;
        // توزيع الدفع المختلط
        for (const split of order.splitPayments || []) {
          if (split.method === 'cash') cashSales += split.amount;
          else if (split.method === 'card') cardSales += split.amount;
          else if (split.method === 'wallet') walletSales += split.amount;
          else if (split.method === 'credit') creditSales += split.amount;
        }
      }
    }

    // الكاش المتوقع في الدروج
    const expectedCash = currentShift.starting_cash + cashSales;

    // الفرق بين الكاش الفعلي والمتوقع
    const actualCashNum = parseFloat(actualCash) || 0;
    const cashDiscrepancy = actualCashNum - expectedCash;

    return {
      totalSales,
      cashSales,
      cardSales,
      walletSales,
      creditSales,
      mixedSales,
      orderCount,
      expectedCash,
      cashDiscrepancy,
    };
  }, [currentShift, completedOrders, actualCash]);

  // ═══════════════════════════════════════════════════════
  // تحميل الوردية الحالية
  // ═══════════════════════════════════════════════════════
  const loadShift = useCallback(async () => {
    const shift = await shiftService.getOpenShift(cashierId);
    setCurrentShift(shift);

    const lastShift = await shiftService.getLastClosedShift();
    setPreviousClosingCash(lastShift?.actual_cash || 0);

    if (shift) {
      setView('active');
      setStartingCash(shift.starting_cash.toString());
    } else {
      setView('open');
      setStartingCash(previousClosingCash > 0 ? previousClosingCash.toString() : '');
    }

    // إعادة تعيين حقول الإغلاق
    setActualCash('');
    setActualCard('');
    setActualNetwork('');
    setNotes('');
    setDiscrepancyReason('');
  }, [cashierId, previousClosingCash]);

  useEffect(() => {
    if (isOpen) loadShift();
  }, [isOpen, loadShift]);

  // ═══════════════════════════════════════════════════════
  // فتح الوردية
  // ═══════════════════════════════════════════════════════
  const handleOpenShift = async () => {
    const startingCashNum = parseFloat(startingCash) || 0;
    if (startingCashNum < 0) {
      toast.error('أدخل عهدة البداية بشكل صحيح');
      return;
    }

    setLoading(true);
    try {
      const shift = await shiftService.openShift(cashierId, startingCashNum);
      setCurrentShift(shift);
      onShiftChange(shift);
      setView('active');

      const disc = startingCashNum - previousClosingCash;
      if (disc !== 0) {
        toast.success(
          `تم فتح الوردية - ${disc > 0 ? 'زيادة' : 'نقص'} ${formatCurrency(Math.abs(disc))}`,
          { duration: 5000 }
        );
      } else {
        toast.success('تم فتح الوردية بنجاح');
      }
    } catch (e: any) {
      toast.error(e.message || 'فشل فتح الوردية');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════
  // إغلاق الوردية
  // ═══════════════════════════════════════════════════════
  const handleCloseShift = async () => {
    if (!currentShift) return;

    const actualCashNum = parseFloat(actualCash) || 0;
    const actualCardNum = parseFloat(actualCard) || 0;
    const actualNetworkNum = parseFloat(actualNetwork) || 0;

    if (actualCashNum === 0 && actualCardNum === 0 && actualNetworkNum === 0) {
      toast.error('أدخل مبلغ واحد على الأقل');
      return;
    }

    setLoading(true);
    try {
      const shift = await shiftService.closeShift(
        currentShift.id,
        actualCashNum,
        actualCardNum,
        actualNetworkNum,
        notes
      );
      setCurrentShift(null);
      onShiftChange(null);
      setView('open');
      toast.success('تم إغلاق الوردية بنجاح');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'فشل إغلاق الوردية');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════
  // اعتماد الفرق (للمدير)
  // ═══════════════════════════════════════════════════════
  const handleApproveDiscrepancy = async () => {
    if (!currentShift || !discrepancyReason) {
      toast.error('أدخل سبب التعديل');
      return;
    }
    setLoading(true);
    try {
      await shiftService.approveDiscrepancy(currentShift.id, user?.id || '', discrepancyReason);
      setCurrentShift({ ...currentShift, status: 'open' });
      toast.success('تم اعتماد الفرق بنجاح');
    } catch (e: any) {
      toast.error(e.message || 'فشل اعتماد الفرق');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════
  // حساب مدة الوردية
  // ═══════════════════════════════════════════════════════
  const shiftDuration = useMemo(() => {
    if (!currentShift) return '';
    const start = new Date(currentShift.opened_at);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} ساعة و ${minutes} دقيقة`;
  }, [currentShift]);

  // ═══════════════════════════════════════════════════════
  // العرض
  // ═══════════════════════════════════════════════════════
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto max-w-lg mx-auto"
            dir="rtl"
          >
            {/* شريط السحب */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-slate-600" />
            </div>

            {/* العنوان */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">إدارة الوردية</h3>
                <p className="text-xs text-gray-400">
                  {view === 'open' && 'فتح وردية جديدة'}
                  {view === 'active' && 'الوردية نشطة'}
                  {view === 'close' && 'إغلاق الوردية'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* ═══════════════════════════════════════════
                  شاشة فتح الوردية - Opening Shift
                  ═══════════════════════════════════════════ */}
              {view === 'open' && (
                <div className="space-y-4">
                  {/* الرصيد المرحل من الوردية السابقة */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowLeftRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                        الرصيد الختامي المرحل
                      </span>
                    </div>
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                      {formatCurrency(previousClosingCash)}
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-400/70 mt-1">
                      هذا هو الرصيد الذي يجب استلامه من الوردية السابقة
                    </p>
                  </div>

                  {/* إدخال عهدة البداية */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                      عهدة البداية (الفكة) - ج.م
                    </label>
                    <div className="relative">
                      <Wallet className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        value={startingCash}
                        onChange={(e) => setStartingCash(e.target.value)}
                        placeholder={previousClosingCash > 0 ? previousClosingCash.toString() : '0.00'}
                        className="w-full h-14 pr-11 pl-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* الفرق في العهدة */}
                  {startingCash && parseFloat(startingCash) !== previousClosingCash && previousClosingCash > 0 && (
                    <div className={`rounded-xl p-4 border ${
                      parseFloat(startingCash) > previousClosingCash
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {parseFloat(startingCash) > previousClosingCash ? (
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-bold ${
                          parseFloat(startingCash) > previousClosingCash
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}>
                          {parseFloat(startingCash) > previousClosingCash ? 'زيادة في العهدة' : 'نقص في العهدة'}
                        </span>
                      </div>
                      <p className={`text-lg font-black ${
                        parseFloat(startingCash) > previousClosingCash
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatCurrency(Math.abs(parseFloat(startingCash) - previousClosingCash))}
                      </p>
                    </div>
                  )}

                  {/* زر فتح الوردية */}
                  <button
                    onClick={handleOpenShift}
                    disabled={loading}
                    className="w-full h-14 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <Unlock className="h-5 w-5" />
                    {loading ? 'جاري الفتح...' : 'فتح الوردية'}
                  </button>
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  شاشة الوردية النشطة - Active Shift Summary
                  ═══════════════════════════════════════════ */}
              {view === 'active' && currentShift && (
                <div className="space-y-4">
                  {/* معلومات الوردية */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          الوردية نشطة
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <Clock className="h-3 w-3" />
                        <span>{shiftDuration}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">بدأت من</p>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          {new Date(currentShift.opened_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">عهدة البداية</p>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(currentShift.starting_cash)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ملخص المبيعات */}
                  {shiftSummary && shiftSummary.orderCount > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-gray-500" />
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">ملخص المبيعات</span>
                        <span className="text-xs text-gray-400">({shiftSummary.orderCount} فاتورة)</span>
                      </div>

                      {/* إجمالي المبيعات */}
                      <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3 border border-gray-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">إجمالي المبيعات</span>
                          <span className="text-lg font-black text-gray-900 dark:text-white">
                            {formatCurrency(shiftSummary.totalSales)}
                          </span>
                        </div>
                      </div>

                      {/* الكاش */}
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">مبيعات نقدية</span>
                          </div>
                          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(shiftSummary.cashSales)}
                          </span>
                        </div>
                      </div>

                      {/* الفيزا / البطاقة */}
                      {shiftSummary.cardSales > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-200 dark:border-blue-800/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-blue-600" />
                              <span className="text-xs font-bold text-blue-700 dark:text-blue-400">فيزا / بطاقة</span>
                            </div>
                            <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(shiftSummary.cardSales)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* الشبكة / إنستاباي */}
                      {shiftSummary.walletSales > 0 && (
                        <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-3 border border-purple-200 dark:border-purple-800/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Network className="h-4 w-4 text-purple-600" />
                              <span className="text-xs font-bold text-purple-700 dark:text-purple-400">شبكة / إنستاباي</span>
                            </div>
                            <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                              {formatCurrency(shiftSummary.walletSales)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* المبيعات الآجلة */}
                      {shiftSummary.creditSales > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-200 dark:border-amber-800/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <PiggyBank className="h-4 w-4 text-amber-600" />
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">مبيعات آجلة</span>
                            </div>
                            <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                              {formatCurrency(shiftSummary.creditSales)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* الكاش المتوقع في الدروج */}
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-5 w-5" />
                            <span className="text-sm font-bold">الكاش المتوقع في الدروج</span>
                          </div>
                          <span className="text-xl font-black">
                            {formatCurrency(shiftSummary.expectedCash)}
                          </span>
                        </div>
                        <p className="text-xs text-white/80 mt-1">
                          عهدة البداية ({formatCurrency(currentShift.starting_cash)}) + مبيعات نقدية ({formatCurrency(shiftSummary.cashSales)})
                        </p>
                      </div>
                    </div>
                  )}

                  {/* لا توجد مبيعات بعد */}
                  {shiftSummary && shiftSummary.orderCount === 0 && (
                    <div className="text-center py-8">
                       <Receipt className="h-12 w-12 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
                       <p className="text-sm text-gray-400 dark:text-gray-500">لا توجد مبيعات بعد</p>
                       <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">ابدأ البيع وسيظهر الملخص هنا</p>
                    </div>
                  )}

                  {/* أزرار */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setView('close')}
                      className="flex-1 h-14 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-500/20"
                    >
                      <Lock className="h-4 w-4" />
                      إغلاق الوردية
                    </button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  شاشة إغلاق الوردية - Closing Shift
                  ═══════════════════════════════════════════ */}
              {view === 'close' && currentShift && shiftSummary && (
                <div className="space-y-4">
                  {/* ملخص سريع */}
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">ملخص سريع</span>
                      <span className="text-xs text-gray-400">{shiftSummary.orderCount} فاتورة</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-400">إجمالي</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(shiftSummary.totalSales)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">كاش</p>
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(shiftSummary.cashSales)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">فيزا</p>
                        <p className="text-sm font-bold text-blue-600">{formatCurrency(shiftSummary.cardSales)}</p>
                      </div>
                    </div>
                  </div>

                  {/* الكاش المتوقع */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        <span className="text-sm font-bold">الكاش المتوقع في الدروج</span>
                      </div>
                      <span className="text-xl font-black">{formatCurrency(shiftSummary.expectedCash)}</span>
                    </div>
                  </div>

                  {/* إدخال الكاش الفعلي */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                      الكاش الفعلي (العد اليدوي) - ج.م
                    </label>
                    <div className="relative">
                      <Wallet className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                      <input
                        type="number"
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                        placeholder={shiftSummary.expectedCash.toString()}
                        className="w-full h-14 pr-11 pl-4 rounded-xl bg-gray-50 dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-800 text-gray-900 dark:text-white text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* إدخال الفيزا الفعلي */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                      الفيزا / البطاقة الفعلي - ج.م
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                      <input
                        type="number"
                        value={actualCard}
                        onChange={(e) => setActualCard(e.target.value)}
                        placeholder={shiftSummary.cardSales > 0 ? shiftSummary.cardSales.toString() : '0.00'}
                        className="w-full h-14 pr-11 pl-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* إدخال الشبكة الفعلي */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                      الشبكة / إنستاباي الفعلي - ج.م
                    </label>
                    <div className="relative">
                      <Network className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-500" />
                      <input
                        type="number"
                        value={actualNetwork}
                        onChange={(e) => setActualNetwork(e.target.value)}
                        placeholder={shiftSummary.walletSales > 0 ? shiftSummary.walletSales.toString() : '0.00'}
                        className="w-full h-14 pr-11 pl-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* عرض الفرق في الكاش */}
                  {actualCash && (
                    <div className={`rounded-xl p-4 border ${
                      shiftSummary.cashDiscrepancy === 0
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        : shiftSummary.cashDiscrepancy > 0
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {shiftSummary.cashDiscrepancy === 0 ? (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                          ) : shiftSummary.cashDiscrepancy > 0 ? (
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          )}
                          <span className={`text-sm font-bold ${
                            shiftSummary.cashDiscrepancy === 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : shiftSummary.cashDiscrepancy > 0
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}>
                            {shiftSummary.cashDiscrepancy === 0
                              ? 'مطابق تماماً'
                              : shiftSummary.cashDiscrepancy > 0
                              ? 'زيادة'
                              : 'عجز'}
                          </span>
                        </div>
                        <span className={`text-lg font-black ${
                          shiftSummary.cashDiscrepancy === 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : shiftSummary.cashDiscrepancy > 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {shiftSummary.cashDiscrepancy === 0
                            ? '✓'
                            : formatCurrency(Math.abs(shiftSummary.cashDiscrepancy))}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* المبيعات الآجلة */}
                  {shiftSummary.creditSales > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <PiggyBank className="h-5 w-5 text-amber-600" />
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                          مبيعات آجلة (تحت التحصيل)
                        </span>
                      </div>
                      <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {formatCurrency(shiftSummary.creditSales)}
                      </p>
                      <p className="text-xs text-amber-500 dark:text-amber-400/70 mt-1">
                        هذا المبلغ سيتم تحصيله لاحقاً - لا يدخل في حساب الكاش
                      </p>
                    </div>
                  )}

                  {/* ملاحظات */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                      ملاحظات التسليم
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أي ملاحظات عن التسليم..."
                      className="w-full h-20 p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                    />
                  </div>

                  {/* أزرار */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setView('active')}
                      className="flex-1 h-14 rounded-xl border-2 border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      رجوع
                    </button>
                    <button
                      onClick={handleCloseShift}
                      disabled={loading}
                      className="flex-1 h-14 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-lg shadow-red-500/20"
                    >
                      <Lock className="h-4 w-4" />
                      {loading ? 'جاري الإغلاق...' : 'تأكيد الإغلاق'}
                    </button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════
                  اعتماد الفرق (للمدير فقط)
                  ═══════════════════════════════════════════ */}
              {view === 'active' && currentShift?.status === 'pending_approval' && (user?.role === 'manager' || user?.role === 'admin') && (
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-400">فرق العهدة في انتظار الاعتماد</span>
                    </div>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {currentShift.discrepancy_amount > 0 ? 'زيادة' : 'نقص'}: {formatCurrency(Math.abs(currentShift.discrepancy_amount))}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">سبب التعديل</label>
                    <select
                      value={discrepancyReason}
                      onChange={(e) => setDiscrepancyReason(e.target.value)}
                      className="w-full h-12 px-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="">اختر السبب</option>
                      <option value="سحب نقدية">سحب نقدية</option>
                      <option value="إضافة عهدة">إضافة عهدة</option>
                      <option value="مصروفات">مصروفات</option>
                      <option value="خطأ عد">خطأ عد</option>
                      <option value="تسوية مالية">تسوية مالية</option>
                    </select>
                  </div>
                  <button
                    onClick={handleApproveDiscrepancy}
                    disabled={loading || !discrepancyReason}
                    className="w-full h-12 rounded-xl bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {loading ? 'جاري الاعتماد...' : 'اعتماد الفرق'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
