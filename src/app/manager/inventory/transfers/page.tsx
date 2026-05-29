'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Search, Plus, CheckCircle2, Package, History, ArrowDownToLine, ArrowUpFromLine, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { inventoryService } from '@/lib/supabase/services/inventory';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function StockTransfersPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New transfer state
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [transferQty, setTransferQty] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    // Fetch warehouses
    const { data: wh } = await supabase.from('warehouses').select('*');
    if (wh) setWarehouses(wh);

    // Fetch stock items
    const { data: items } = await inventoryService.getAll();
    if (items) setStockItems(items);

    // Fetch transfers
    const { data: trf } = await supabase.from('stock_transfers').select('*, transfer_items(*)').order('created_at', { ascending: false }).limit(50);
    if (trf) setTransfers(trf);
    
    setLoading(false);
  }

  async function submitTransfer() {
    if (!sourceId || !destId || !selectedItem || !transferQty) {
      toast.error('يرجى ملء جميع البيانات');
      return;
    }
    if (sourceId === destId) {
      toast.error('لا يمكن النقل لنفس المستودع');
      return;
    }
    const qty = parseFloat(transferQty);
    if (qty <= 0 || qty > (selectedItem.current_qty || 0)) {
      toast.error('الكمية غير صالحة أو تتجاوز الرصيد المتاح');
      return;
    }

    // Since we don't have complex warehouse_stock bridging table yet in DB, we mock the stock reduction
    // In a full implementation, we'd call a Supabase RPC to atomic transfer
    
    const { data: trfData, error: trfErr } = await supabase.from('stock_transfers').insert({
      source_warehouse_id: sourceId,
      destination_warehouse_id: destId,
      status: 'completed',
      notes,
    }).select().single();

    if (trfErr) {
      toast.error('فشل إنشاء إذن النقل');
      return;
    }

    await supabase.from('transfer_items').insert({
      transfer_id: trfData.id,
      stock_item_id: selectedItem.id,
      quantity: qty,
      unit: selectedItem.unit || 'قطعة',
    });

    // Deduct from main stock items (mocking since we don't have warehouse-specific qty)
    await supabase.from('stock_items').update({
      current_qty: (selectedItem.current_qty || 0) - qty,
    }).eq('id', selectedItem.id);

    toast.success('تم تنفيذ النقل بنجاح');
    
    setSourceId('');
    setDestId('');
    setSelectedItem(null);
    setTransferQty('');
    setNotes('');
    loadData();
    setActiveTab('history');
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">حركة المخزون</h1>
          <p className="text-sm text-gray-500">نقل الأصناف بين المستودعات والفروع</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'new' ? 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}
          >
            نقل جديد
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}
          >
            السجل
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  {/* Arrow Indicator between warehouses */}
                  <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full items-center justify-center border-4 border-white dark:border-gray-900 z-10">
                    <ArrowRightLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <ArrowUpFromLine className="h-4 w-4 text-red-500" /> من مستودع
                    </label>
                    <select
                      value={sourceId}
                      onChange={(e) => setSourceId(e.target.value)}
                      className="w-full h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl px-4 outline-none focus:border-emerald-500 transition-all text-gray-900 dark:text-white"
                    >
                      <option value="">اختر مستودع المصدر...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name_ar || w.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <ArrowDownToLine className="h-4 w-4 text-emerald-500" /> إلى مستودع
                    </label>
                    <select
                      value={destId}
                      onChange={(e) => setDestId(e.target.value)}
                      className="w-full h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl px-4 outline-none focus:border-emerald-500 transition-all text-gray-900 dark:text-white"
                    >
                      <option value="">اختر مستودع الوجهة...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name_ar || w.name}</option>)}
                    </select>
                  </div>
                </div>

                <hr className="my-6 border-gray-100 dark:border-gray-800" />

                <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" /> اختيار الصنف والكمية
                  </label>
                  
                  <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={selectedItem?.id || ''}
                      onChange={(e) => setSelectedItem(stockItems.find(i => i.id === e.target.value))}
                      className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl pr-12 pl-4 outline-none focus:border-emerald-500 transition-all text-gray-900 dark:text-white appearance-none"
                    >
                      <option value="">ابحث عن صنف بالاسم أو الباركود...</option>
                      {stockItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.product_name} - الرصيد الحالي: {item.current_qty || 0}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedItem && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">الرصيد المتاح بالنظام</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{selectedItem.current_qty || 0}</p>
                      </div>
                      <div>
                        <input
                          type="number"
                          value={transferQty}
                          onChange={(e) => setTransferQty(e.target.value)}
                          placeholder="الكمية المراد نقلها"
                          className="w-full h-full bg-white dark:bg-gray-900 border-2 border-emerald-500/30 rounded-xl px-4 text-center text-xl font-bold outline-none focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات النقل (اختياري)..."
                    className="w-full h-24 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl p-4 mt-4 outline-none focus:border-emerald-500 transition-all text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-600 to-teal-700 text-white sticky top-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">ملخص العملية</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-emerald-100">من</span>
                    <span className="font-bold">{warehouses.find(w => w.id === sourceId)?.name_ar || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-emerald-100">إلى</span>
                    <span className="font-bold">{warehouses.find(w => w.id === destId)?.name_ar || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-4 border-t border-emerald-500/30">
                    <span className="text-emerald-100">الصنف</span>
                    <span className="font-bold truncate max-w-[150px]">{selectedItem?.product_name || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-emerald-100">الكمية</span>
                    <span className="font-black text-xl">{transferQty || '0'}</span>
                  </div>
                </div>

                <button
                  onClick={submitTransfer}
                  className="w-full h-12 rounded-xl bg-white text-emerald-700 font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  اعتماد ونقل
                </button>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-bold">رقم النقل</th>
                    <th className="px-6 py-4 font-bold">التاريخ</th>
                    <th className="px-6 py-4 font-bold">من مستودع</th>
                    <th className="px-6 py-4 font-bold">إلى مستودع</th>
                    <th className="px-6 py-4 font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {transfers.length > 0 ? transfers.map((trf) => (
                    <tr key={trf.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {trf.transfer_number || trf.id.split('-')[0]}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(trf.created_at).toLocaleString('ar-EG')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                          <ArrowUpFromLine className="h-3 w-3 text-red-500" />
                          {warehouses.find(w => w.id === trf.source_warehouse_id)?.name_ar || 'مستودع غير معروف'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                          <ArrowDownToLine className="h-3 w-3 text-emerald-500" />
                          {warehouses.find(w => w.id === trf.destination_warehouse_id)?.name_ar || 'مستودع غير معروف'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="success" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-0">
                          تم النقل
                        </Badge>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        لا توجد حركات نقل مسجلة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
