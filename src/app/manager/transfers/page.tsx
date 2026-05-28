'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store/auth-store'
import { transferService, transferItemService, warehouseService, productHistoryService } from '@/lib/supabase/services/procurement'
import { inventoryService } from '@/lib/supabase/services/inventory'
import { ArrowRightLeft, Building2, Package, Search, ArrowRight, CheckCircle, Loader2, AlertTriangle, Plus, X, Clock, Eye, ChevronLeft, Warehouse, Scale } from 'lucide-react'
import toast from 'react-hot-toast'

const supabase = createClient()

interface Warehouse {
  id: string
  name: string
  name_ar: string
  type: string
}

interface StockItem {
  id: string
  product_name: string
  sku: string
  current_qty: number
  unit: string
  warehouse_id?: string
}

interface Transfer {
  id: string
  transfer_number: string
  from_warehouse_id?: string
  to_warehouse_id?: string
  status: string
  total_items: number
  notes?: string
  requested_by_name?: string
  created_at: string
  from_warehouse?: { name_ar: string }
  to_warehouse?: { name_ar: string }
}

interface TransferItem {
  id: string
  transfer_id: string
  stock_item_id?: string
  product_name: string
  product_sku?: string
  requested_qty: number
  approved_qty: number
  received_qty: number
  unit: string
  notes?: string
}

interface ProductWithConversion {
  item: StockItem
  qty: number
  conversionFactor: number
  conversionUnit: string
}

const statuses: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-500/20 text-gray-400' },
  pending_approval: { label: 'بانتظار الاعتماد', color: 'bg-amber-500/20 text-amber-400' },
  approved: { label: 'معتمد', color: 'bg-blue-500/20 text-blue-400' },
  in_transit: { label: 'قيد النقل', color: 'bg-purple-500/20 text-purple-400' },
  received: { label: 'تم الاستلام', color: 'bg-emerald-500/20 text-emerald-400' },
  cancelled: { label: 'ملغي', color: 'bg-red-500/20 text-red-400' },
}

const warehouseTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
  main: { label: 'رئيسي', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: 'Warehouse' },
  branch: { label: 'فرعي', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: 'Building2' },
  cold_storage: { label: 'تبريد', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: 'Warehouse' },
  dry_storage: { label: 'جاف', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: 'Warehouse' },
  display: { label: 'عرض', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: 'Package' },
}

export default function TransferPage() {
  const auth = useAuthStore()
  const user = auth.user
  const isManager = user?.role === 'manager' || user?.role === 'admin'

  const [activeView, setActiveView] = useState<'list' | 'create' | 'detail'>('list')
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [transferItems, setTransferItems] = useState<TransferItem[]>([])
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const [step, setStep] = useState<'select' | 'products' | 'confirm'>('select')
  const [fromWarehouse, setFromWarehouse] = useState('')
  const [toWarehouse, setToWarehouse] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<ProductWithConversion[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [transferNotes, setTransferNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchData()

    const channel = supabase.channel('transfers-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transfers' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_items' }, () => {
        if (selectedTransfer) fetchTransferItems(selectedTransfer.id)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_history' }, () => {})
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedTransfer])

  async function fetchData() {
    const [whRes, stockRes, transfersRes] = await Promise.all([
      warehouseService.getAll(),
      inventoryService.getAll(),
      transferService.getAll(),
    ])
    if (whRes.data) setWarehouses(whRes.data)
    if (stockRes.data) setStockItems(stockRes.data)
    if (transfersRes.data) setTransfers(transfersRes.data)
    setLoading(false)
  }

  async function fetchTransferItems(transferId: string) {
    if (!transferId) return
    const res = await transferItemService.getAll(transferId)
    if (res.data) setTransferItems(res.data)
  }

  const filteredTransfers = statusFilter === 'all'
    ? transfers
    : transfers.filter(t => t.status === statusFilter)

  const sourceProducts = stockItems.filter(p =>
    !fromWarehouse || p.warehouse_id === fromWarehouse
  )

  const searchedProducts = sourceProducts.filter(p =>
    p.product_name.includes(searchQuery) || p.sku.includes(searchQuery)
  )

  function addProduct(item: StockItem) {
    if (selectedProducts.find(p => p.item.id === item.id)) return
    setSelectedProducts([...selectedProducts, { item, qty: 1, conversionFactor: 1, conversionUnit: item.unit }])
  }

  function removeProduct(itemId: string) {
    setSelectedProducts(selectedProducts.filter(p => p.item.id !== itemId))
  }

  function updateQty(itemId: string, qty: number) {
    setSelectedProducts(selectedProducts.map(p =>
      p.item.id === itemId ? { ...p, qty: Math.max(1, Math.min(qty, p.item.current_qty)) } : p
    ))
  }

  function updateConversion(itemId: string, factor: number, unit: string) {
    setSelectedProducts(selectedProducts.map(p =>
      p.item.id === itemId ? { ...p, conversionFactor: Math.max(1, factor), conversionUnit: unit } : p
    ))
  }

  const totalBaseUnits = selectedProducts.reduce((sum, p) => sum + p.qty * p.conversionFactor, 0)

  function getStockCount(warehouseId: string) {
    return stockItems.filter(s => s.warehouse_id === warehouseId).length
  }

  function getWarehouseTypeBadge(type: string) {
    const cfg = warehouseTypeConfig[type] || warehouseTypeConfig.branch
    return (
      <span className={cn('text-xs px-2 py-0.5 rounded-full border', cfg.color)}>
        {cfg.label}
      </span>
    )
  }

  async function createTransfer() {
    if (!fromWarehouse || !toWarehouse || !selectedProducts.length) {
      toast.error('أكمل جميع البيانات')
      return
    }

    setProcessing(true)

    try {
      const transferRes = await transferService.create({
        transfer_number: `TRF-${Date.now()}`,
        from_warehouse_id: fromWarehouse,
        to_warehouse_id: toWarehouse,
        status: isManager ? 'received' : 'pending_approval',
        total_items: selectedProducts.length,
        notes: transferNotes,
        requested_by: user?.id,
        requested_by_name: user?.nameAr || user?.name,
        approved_by: isManager ? user?.id : undefined,
        approved_at: isManager ? new Date().toISOString() : undefined,
        received_by: isManager ? user?.id : undefined,
        received_by_name: isManager ? (user?.nameAr || user?.name) : undefined,
        received_at: isManager ? new Date().toISOString() : undefined,
      })

      if (transferRes.data) {
        const transferId = transferRes.data.id

        for (const p of selectedProducts) {
          await transferItemService.create({
            transfer_id: transferId,
            stock_item_id: p.item.id,
            product_name: p.item.product_name,
            product_sku: p.item.sku,
            requested_qty: p.qty,
            approved_qty: isManager ? p.qty : 0,
            received_qty: isManager ? p.qty : 0,
            unit: p.item.unit,
            notes: p.conversionFactor > 1 ? `1 ${p.conversionUnit} = ${p.conversionFactor} ${p.item.unit}` : undefined,
          })
        }

        if (isManager) {
          for (const p of selectedProducts) {
            const effectiveQty = p.qty * p.conversionFactor

            await supabase.from('stock_items').update({
              current_qty: p.item.current_qty - effectiveQty,
              updated_at: new Date().toISOString(),
            }).eq('id', p.item.id)

            await productHistoryService.create({
              stock_item_id: p.item.id,
              product_name: p.item.product_name,
              type: 'transfer_out',
              quantity: effectiveQty,
              from_warehouse_id: fromWarehouse,
              to_warehouse_id: toWarehouse,
              performed_by: user?.id,
              performed_by_name: user?.nameAr || user?.name,
              notes: `تحويل إلى ${warehouses.find(w => w.id === toWarehouse)?.name_ar}`,
            })

            const destRes = await supabase.from('stock_items')
              .select('*')
              .eq('product_name', p.item.product_name)
              .eq('warehouse_id', toWarehouse)
              .maybeSingle()

            if (destRes.data) {
              await supabase.from('stock_items').update({
                current_qty: destRes.data.current_qty + effectiveQty,
                updated_at: new Date().toISOString(),
              }).eq('id', destRes.data.id)
            }

            await productHistoryService.create({
              stock_item_id: p.item.id,
              product_name: p.item.product_name,
              type: 'transfer_in',
              quantity: effectiveQty,
              from_warehouse_id: fromWarehouse,
              to_warehouse_id: toWarehouse,
              performed_by: user?.id,
              performed_by_name: user?.nameAr || user?.name,
              notes: `استلام من ${warehouses.find(w => w.id === fromWarehouse)?.name_ar}`,
            })
          }
        }

        toast.success('تم إنشاء التحويل بنجاح')
        resetForm()
        fetchData()
      }
    } catch (error) {
      toast.error('خطأ في إنشاء التحويل')
    }

    setProcessing(false)
  }

  async function approveTransfer(transfer: Transfer) {
    await transferService.approve(transfer.id, user?.id || '')

    const itemsRes = await transferItemService.getAll(transfer.id)
    if (itemsRes.data) {
      for (const item of itemsRes.data) {
        if (item.stock_item_id) {
          const srcRes = await supabase.from('stock_items').select('*').eq('id', item.stock_item_id).single()
          if (srcRes.data) {
            await supabase.from('stock_items').update({
              current_qty: srcRes.data.current_qty - item.requested_qty,
              updated_at: new Date().toISOString(),
            }).eq('id', item.stock_item_id)

            await productHistoryService.create({
              stock_item_id: item.stock_item_id,
              product_name: item.product_name,
              type: 'transfer_out',
              quantity: item.requested_qty,
              from_warehouse_id: transfer.from_warehouse_id,
              to_warehouse_id: transfer.to_warehouse_id,
              performed_by: user?.id,
              performed_by_name: user?.nameAr || user?.name,
              notes: `تحويل إلى ${warehouses.find(w => w.id === transfer.to_warehouse_id)?.name_ar}`,
            })
          }
        }
      }
    }

    toast.success('تم اعتماد التحويل')
    fetchData()
    if (selectedTransfer) fetchTransferItems(selectedTransfer.id)
  }

  async function confirmInTransit(transfer: Transfer) {
    await transferService.update(transfer.id, { status: 'in_transit' })
    toast.success('تم تأكيد الشحن')
    fetchData()
    if (selectedTransfer) fetchTransferItems(selectedTransfer.id)
  }

  async function receiveTransfer(transfer: Transfer) {
    const itemsRes = await transferItemService.getAll(transfer.id)
    if (itemsRes.data) {
      for (const item of itemsRes.data) {
        if (item.stock_item_id) {
          const destRes = await supabase.from('stock_items')
            .select('*')
            .eq('product_name', item.product_name)
            .eq('warehouse_id', transfer.to_warehouse_id)
            .maybeSingle()

          if (destRes.data) {
            await supabase.from('stock_items').update({
              current_qty: destRes.data.current_qty + item.requested_qty,
              updated_at: new Date().toISOString(),
            }).eq('id', destRes.data.id)
          }

          await productHistoryService.create({
            stock_item_id: item.stock_item_id,
            product_name: item.product_name,
            type: 'transfer_in',
            quantity: item.requested_qty,
            from_warehouse_id: transfer.from_warehouse_id,
            to_warehouse_id: transfer.to_warehouse_id,
            performed_by: user?.id,
            performed_by_name: user?.nameAr || user?.name,
            notes: `استلام من ${warehouses.find(w => w.id === transfer.from_warehouse_id)?.name_ar}`,
          })
        }
      }
    }

    await transferService.receive(transfer.id, user?.id || '', user?.nameAr || user?.name || '')
    toast.success('تم استلام التحويل')
    fetchData()
    if (selectedTransfer) fetchTransferItems(selectedTransfer.id)
  }

  async function cancelTransfer(transfer: Transfer) {
    await transferService.update(transfer.id, { status: 'cancelled' })
    toast.success('تم إلغاء التحويل')
    fetchData()
    if (selectedTransfer) fetchTransferItems(selectedTransfer.id)
  }

  function resetForm() {
    setStep('select')
    setFromWarehouse('')
    setToWarehouse('')
    setSelectedProducts([])
    setSearchQuery('')
    setTransferNotes('')
    setActiveView('list')
  }

  function viewDetail(transfer: Transfer) {
    setSelectedTransfer(transfer)
    fetchTransferItems(transfer.id)
    setActiveView('detail')
  }

  if (loading) return <div className="text-center py-8 text-gray-500">جاري التحميل...</div>

  // ==================== DETAIL VIEW ====================
  if (activeView === 'detail' && selectedTransfer) {
    const fromName = selectedTransfer.from_warehouse?.name_ar || warehouses.find(w => w.id === selectedTransfer.from_warehouse_id)?.name_ar || 'غير محدد'
    const toName = selectedTransfer.to_warehouse?.name_ar || warehouses.find(w => w.id === selectedTransfer.to_warehouse_id)?.name_ar || 'غير محدد'

    const timelineSteps = [
      { key: 'draft', label: 'تم الإنشاء', icon: Clock },
      { key: 'pending_approval', label: 'بانتظار الاعتماد', icon: Clock },
      { key: 'approved', label: 'معتمد', icon: CheckCircle },
      { key: 'in_transit', label: 'قيد النقل', icon: Package },
      { key: 'received', label: 'تم الاستلام', icon: ArrowRightLeft },
    ]

    const currentIdx = timelineSteps.findIndex(s => s.key === selectedTransfer.status)

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveView('list'); setSelectedTransfer(null) }} className="p-2 rounded-lg bg-slate-800/60 backdrop-blur-lg shadow-inner hover:bg-slate-700/80 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold">{selectedTransfer.transfer_number}</h2>
            <p className="text-xs text-gray-400">
              {fromName} ← {toName}
            </p>
          </div>
        </div>

        {/* Status & Date */}
        <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-5 flex items-center justify-between">
          <span className={cn('text-xs px-3 py-1.5 rounded-xl font-bold inline-flex items-center gap-1.5 border', statuses[selectedTransfer.status]?.color)}>
            {statuses[selectedTransfer.status]?.label}
          </span>
          <span className="text-sm font-medium text-gray-400">
            {new Date(selectedTransfer.created_at).toLocaleDateString('ar-EG')}
          </span>
        </div>

        {/* Timeline */}
        <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-8">
          <h3 className="text-sm font-semibold mb-4">تقدم التحويل</h3>
          <div className="relative">
            <div className="absolute right-[11px] top-2 bottom-2 w-0.5 bg-slate-700/60" />
            <div className="space-y-4">
              {timelineSteps.map((s, i) => {
                const isActive = i <= currentIdx
                const isCurrent = i === currentIdx
                const Icon = s.icon
                return (
                  <div key={s.key} className="flex items-center gap-4 relative z-10">
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-colors',
                      isActive ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-white/[0.04] text-gray-500 border border-white/[0.06]'
                    )}>
                      {isCurrent && isActive ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                      ) : isActive ? (
                        <CheckCircle size={14} />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                      )}
                    </div>
                    <span className={cn('text-sm transition-colors', isActive ? 'text-white font-bold' : 'text-gray-500 font-medium')}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Products */}
        {transferItems.length > 0 && (
          <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-8">
            <h3 className="text-base font-bold mb-4 text-white">الأصناف ({transferItems.length})</h3>
            <div className="space-y-3">
              {transferItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                  <div>
                    <p className="text-sm font-bold text-white">{item.product_name}</p>
                    <p className="text-xs text-gray-400 mt-1">{item.product_sku} • {item.unit}</p>
                  </div>
                  <div className="text-left bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                    <p className="text-base font-black text-emerald-400">{item.requested_qty.toLocaleString('ar-EG')}</p>
                    <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider">مطلوب</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {selectedTransfer.notes && (
          <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl border border-white/[0.06] shadow-xl p-6">
            <p className="text-xs text-gray-400 mb-2 font-bold flex items-center gap-2"><FileText size={14}/> ملاحظات</p>
            <p className="text-sm text-gray-300 leading-relaxed">{selectedTransfer.notes}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {isManager && selectedTransfer.status === 'pending_approval' && (
            <>
              <button onClick={() => approveTransfer(selectedTransfer)} className="flex-1 min-w-[120px] py-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium flex items-center justify-center gap-2">
                <CheckCircle size={16} /> اعتماد التحويل
              </button>
              <button onClick={() => cancelTransfer(selectedTransfer)} className="flex-1 min-w-[120px] py-2.5 rounded-2xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium">
                إلغاء
              </button>
            </>
          )}
          {selectedTransfer.status === 'approved' && (
            <>
              <button onClick={() => confirmInTransit(selectedTransfer)} className="flex-1 min-w-[120px] py-2.5 rounded-2xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-sm font-medium flex items-center justify-center gap-2">
                <Package size={16} /> تأكيد الشحن
              </button>
            </>
          )}
          {selectedTransfer.status === 'in_transit' && (
            <button onClick={() => receiveTransfer(selectedTransfer)} className="flex-1 min-w-[120px] py-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium flex items-center justify-center gap-2">
              <ArrowRightLeft size={16} /> تأكيد الاستلام
            </button>
          )}
        </div>
      </div>
    )
  }

  // ==================== CREATE VIEW ====================
  if (activeView === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={resetForm} className="p-2 rounded-lg bg-slate-800/60 backdrop-blur-lg shadow-inner hover:bg-slate-700/80 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold">تحويل مخزني جديد</h2>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3">
          {['اختيار المستودعات', 'اختيار الأصناف', 'تأكيد'].map((label, i) => {
            const isActive =
              (i === 0 && step === 'select') ||
              (i === 1 && step === 'products') ||
              (i === 2 && step === 'confirm')
            const isPast =
              (i === 0 && (step === 'products' || step === 'confirm')) ||
              (i === 1 && step === 'confirm')
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  isActive ? 'bg-emerald-500 text-white' :
                  isPast ? 'bg-emerald-500/30 text-emerald-300' :
                  'bg-slate-700/60 text-gray-500'
                )}>{isPast ? <CheckCircle size={14} /> : i + 1}</div>
                <span className="text-xs hidden sm:block">{label}</span>
                {i < 2 && (
                  <div className={cn('w-6 h-0.5 rounded', isPast ? 'bg-emerald-500/50' : 'bg-slate-700/60')} />
                )}
              </div>
            )
          })}
        </div>

        <div className="rounded-3xl bg-[#111114]/90 backdrop-blur-2xl shadow-xl border border-white/[0.06] p-8">
          {/* STEP 1: Select Warehouses */}
          {step === 'select' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-300 block">من المستودع</label>
                  <select
                    value={fromWarehouse}
                    onChange={(e) => { setFromWarehouse(e.target.value); setToWarehouse('') }}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all [&>option]:bg-[#111114]"
                  >
                    <option value="">اختر المستودع المصدر...</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name_ar}</option>
                    ))}
                  </select>
                  {fromWarehouse && (
                    <div className="mt-2 inline-block">
                      {getWarehouseTypeBadge(warehouses.find(w => w.id === fromWarehouse)?.type || '')}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-300 block">إلى المستودع</label>
                  <select
                    value={toWarehouse}
                    onChange={(e) => setToWarehouse(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all [&>option]:bg-[#111114]"
                  >
                    <option value="">اختر المستودع الوجهة...</option>
                    {warehouses.filter(w => w.id !== fromWarehouse).map(w => (
                      <option key={w.id} value={w.id}>{w.name_ar}</option>
                    ))}
                  </select>
                  {toWarehouse && (
                    <div className="mt-2 inline-block">
                      {getWarehouseTypeBadge(warehouses.find(w => w.id === toWarehouse)?.type || '')}
                    </div>
                  )}
                </div>
              </div>

              {fromWarehouse && toWarehouse && fromWarehouse === toWarehouse && (
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>لا يمكن التحويل لنفس المستودع. الرجاء اختيار مستودعين مختلفين.</span>
                </div>
              )}

              <button
                className="w-full py-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                disabled={!fromWarehouse || !toWarehouse || fromWarehouse === toWarehouse}
                onClick={() => setStep('products')}
              >
                التالي
              </button>
            </div>
          )}

          {/* STEP 2: Select Products */}
          {step === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between text-sm p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] shadow-inner gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <span className="font-bold">{warehouses.find(w => w.id === fromWarehouse)?.name_ar}</span>
                </div>
                <ArrowRight className="h-5 w-5 text-emerald-500 hidden sm:block transform rotate-180" />
                <ArrowRight className="h-5 w-5 text-emerald-500 sm:hidden transform rotate-90" />
                <div className="flex items-center gap-3 w-full sm:w-auto p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                  <span className="font-bold text-emerald-400">{warehouses.find(w => w.id === toWarehouse)?.name_ar}</span>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن صنف لاضافته للتحويل..."
                  className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all placeholder-gray-500"
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {searchedProducts.map(p => {
                  const isSelected = !!selectedProducts.find(sp => sp.item.id === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => !isSelected && addProduct(p)}
                      className={cn(
                        'w-full flex items-center justify-between p-4 rounded-2xl border text-right transition-all group',
                        isSelected
                          ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                          : 'border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/[0.08]'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("p-2.5 rounded-xl transition-colors", isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.04] text-gray-400 group-hover:text-white")}>
                          <Package className="h-5 w-5 shrink-0" />
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-white mb-0.5">{p.product_name}</p>
                          <p className="text-xs text-gray-400 font-medium">SKU: {p.sku} • المتوفر: <span className="text-blue-400 font-bold">{p.current_qty.toLocaleString('ar-EG')}</span> {p.unit}</p>
                        </div>
                      </div>
                      {isSelected ? <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" /> : <Plus className="h-5 w-5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                  )
                })}
                {searchedProducts.length === 0 && searchQuery && (
                  <div className="text-center py-4 text-gray-500 text-sm">لا توجد نتائج</div>
                )}
              </div>

              {/* Selected products with quantities */}
              {selectedProducts.length > 0 && (
                <div className="space-y-4 p-5 rounded-3xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md">{selectedProducts.length}</span>
                      الأصناف المحددة
                    </p>
                    <p className="text-xs font-bold text-gray-400">إجمالي الوحدات: <span className="text-white bg-white/[0.06] px-2 py-0.5 rounded-md">{totalBaseUnits.toLocaleString('ar-EG')}</span></p>
                  </div>
                  <div className="space-y-3">
                    {selectedProducts.map(p => (
                      <div key={p.item.id} className="rounded-2xl bg-[#0A0A0C]/50 border border-white/[0.06] p-4 space-y-4 transition-all hover:border-white/[0.1]">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-bold text-white mb-1">{p.item.product_name}</p>
                            <p className="text-xs text-gray-400 font-medium">الرصيد المتاح: <span className="text-blue-400 font-bold">{p.item.current_qty.toLocaleString('ar-EG')}</span> {p.item.unit}</p>
                          </div>
                          <button
                            onClick={() => removeProduct(p.item.id)}
                            className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors border border-red-500/20"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateQty(p.item.id, p.qty - 1)}
                              className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors text-white border border-white/[0.04]"
                            >-</button>
                            <span className="w-12 text-center font-black text-lg text-white">{p.qty.toLocaleString('ar-EG')}</span>
                            <button
                              onClick={() => updateQty(p.item.id, p.qty + 1)}
                              className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30 transition-colors text-emerald-400 border border-emerald-500/20"
                            >+</button>
                            <span className="text-sm font-bold text-gray-400 mr-2">{p.item.unit}</span>
                          </div>
                          {/* Conversion factor */}
                          <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-r border-white/[0.06] pt-3 sm:pt-0 sm:pr-4">
                            <Scale className="h-4 w-4 text-gray-500 shrink-0" />
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                value={p.conversionFactor}
                                onChange={(e) => updateConversion(p.item.id, parseInt(e.target.value) || 1, p.conversionUnit)}
                                className="w-16 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white text-center font-mono focus:outline-none focus:border-emerald-500/50"
                              />
                              <span className="text-xs font-bold text-gray-400">× {p.conversionUnit} = <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{(p.qty * p.conversionFactor).toLocaleString('ar-EG')} {p.item.unit}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/[0.06]">
                <label className="text-xs font-bold text-gray-400 block mb-2">ملاحظات التحويل</label>
                <textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="أضف أي ملاحظات هامة تخص عملية التحويل..."
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all min-h-[100px] resize-y placeholder-gray-500"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button onClick={() => setStep('select')} className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-300 font-bold hover:bg-white/[0.08] hover:text-white transition-colors">
                  العودة للمستودعات
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={!selectedProducts.length}
                  className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  مراجعة وتأكيد التحويل
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] shadow-inner space-y-4 text-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <h3 className="font-bold text-lg text-white mb-4">ملخص التحويل</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0A0A0C]/50 p-4 rounded-2xl border border-white/[0.04]">
                    <span className="text-gray-400 text-xs block mb-1 font-medium">من مستودع</span>
                    <span className="font-bold text-white text-base">{warehouses.find(w => w.id === fromWarehouse)?.name_ar}</span>
                  </div>
                  <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                    <span className="text-emerald-500/80 text-xs block mb-1 font-medium">إلى مستودع</span>
                    <span className="font-bold text-emerald-400 text-base">{warehouses.find(w => w.id === toWarehouse)?.name_ar}</span>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] my-4" />
                
                <div className="flex justify-between items-center p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <span className="text-gray-400 font-medium">عدد الأصناف الفريدة</span>
                  <span className="font-black text-white bg-white/[0.06] px-3 py-1 rounded-lg">{selectedProducts.length.toLocaleString('ar-EG')}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <span className="text-gray-400 font-medium">إجمالي الوحدات المحولة</span>
                  <span className="font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">{totalBaseUnits.toLocaleString('ar-EG')}</span>
                </div>
              </div>

              {/* Product list summary */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {selectedProducts.map(p => (
                  <div key={p.item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-sm gap-2">
                    <span className="font-bold text-white">{p.item.product_name}</span>
                    <div className="flex items-center gap-2 bg-[#0A0A0C]/50 px-3 py-1.5 rounded-lg border border-white/[0.04]">
                      <span className="text-white font-bold">{p.qty.toLocaleString('ar-EG')}</span>
                      <span className="text-xs text-gray-500">× {p.conversionFactor} = </span>
                      <span className="text-emerald-400 font-bold">{(p.qty * p.conversionFactor).toLocaleString('ar-EG')}</span>
                      <span className="text-xs text-gray-400 font-medium">{p.item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                </div>
                <div>
                  <p className="font-bold mb-0.5">تأكيد العملية</p>
                  <p className="text-amber-500/80 text-xs font-medium">سيتم خصم الأصناف من المخزن المصدر وإضافتها للمخزن الوجهة فور الاعتماد.</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setStep('products')} className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-300 font-bold hover:bg-white/[0.08] hover:text-white transition-colors">
                  تعديل الأصناف
                </button>
                <button
                  onClick={createTransfer}
                  disabled={processing}
                  className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {processing ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري التنفيذ...</> : 'تأكيد واعتماد التحويل'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">التحويلات المخزنية</h2>
        <button
          onClick={() => setActiveView('create')}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium"
        >
          <Plus size={16} /> تحويل جديد
        </button>
      </div>

      {/* Warehouse Hierarchy */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-gray-400 flex items-center gap-2">
          <Building2 size={14} /> المستودعات
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {warehouses.map(w => (
            <div
              key={w.id}
              className="rounded-3xl bg-slate-800/40 backdrop-blur-md shadow-xl border border-slate-700/50 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  w.type === 'main' ? 'bg-blue-500/20 text-blue-400' :
                  w.type === 'branch' || w.type === 'display' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-700/60 text-gray-400'
                )}>
                  <Warehouse size={16} />
                </div>
                {getWarehouseTypeBadge(w.type)}
              </div>
              <div>
                <p className="text-sm font-medium">{w.name_ar}</p>
                <p className="text-xs text-gray-400 mt-1">
                  <Package size={12} className="inline ml-1" />
                  {getStockCount(w.id).toLocaleString('ar-EG')} منتج
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-2xl bg-slate-800/40 backdrop-blur-md shadow-xl border border-slate-700/50 p-4">
          <p className="text-xs text-gray-400">إجمالي التحويلات</p>
          <p className="text-xl font-bold mt-1">{transfers.length.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
          <p className="text-xs text-amber-400/70">بانتظار الاعتماد</p>
          <p className="text-xl font-bold mt-1 text-amber-400">{transfers.filter(t => t.status === 'pending_approval').length.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4">
          <p className="text-xs text-blue-400/70">معتمد</p>
          <p className="text-xl font-bold mt-1 text-blue-400">{transfers.filter(t => t.status === 'approved').length.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl bg-purple-500/10 border border-purple-500/20 p-4">
          <p className="text-xs text-purple-400/70">قيد النقل</p>
          <p className="text-xl font-bold mt-1 text-purple-400">{transfers.filter(t => t.status === 'in_transit').length.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
          <p className="text-xs text-emerald-400/70">تم الاستلام</p>
          <p className="text-xl font-bold mt-1 text-emerald-400">{transfers.filter(t => t.status === 'received').length.toLocaleString('ar-EG')}</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'all', label: 'الكل' },
          { key: 'pending_approval', label: 'بانتظار الاعتماد' },
          { key: 'approved', label: 'معتمد' },
          { key: 'in_transit', label: 'قيد النقل' },
          { key: 'received', label: 'تم الاستلام' },
          { key: 'cancelled', label: 'ملغي' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              statusFilter === f.key
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800/60 backdrop-blur-lg shadow-inner text-gray-400 border-slate-600/50 hover:bg-slate-700/80'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transfer list */}
      <div className="space-y-2">
        {filteredTransfers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ArrowRightLeft className="h-10 w-10 mx-auto mb-3 text-gray-600" />
            <p>لا توجد تحويلات</p>
          </div>
        ) : (
          filteredTransfers.map(transfer => {
            const s = statuses[transfer.status] || statuses.draft
            const fromName = transfer.from_warehouse?.name_ar || warehouses.find(w => w.id === transfer.from_warehouse_id)?.name_ar || 'غير محدد'
            const toName = transfer.to_warehouse?.name_ar || warehouses.find(w => w.id === transfer.to_warehouse_id)?.name_ar || 'غير محدد'

            return (
              <div
                key={transfer.id}
                className="rounded-3xl bg-slate-800/40 backdrop-blur-md shadow-xl border border-slate-700/50 p-4 hover:bg-slate-700/50 transition-colors cursor-pointer"
                onClick={() => viewDetail(transfer)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transfer.transfer_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fromName} ← {toName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:block text-xs text-gray-400">
                      {new Date(transfer.created_at).toLocaleDateString('ar-EG')}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', s.color)}>
                      {s.label}
                    </span>
                    <ChevronLeft size={16} className="text-gray-500 shrink-0" />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>{transfer.total_items} صنف</span>
                  {transfer.requested_by_name && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-600" />
                      <span>{transfer.requested_by_name}</span>
                    </>
                  )}
                  {/* Action buttons (stop propagation to avoid opening detail) */}
                  <div className="flex-1" />
                  {isManager && transfer.status === 'pending_approval' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); approveTransfer(transfer) }}
                      className="text-xs px-3 py-1 rounded-2xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    >
                      اعتماد
                    </button>
                  )}
                  {transfer.status === 'in_transit' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); receiveTransfer(transfer) }}
                      className="text-xs px-3 py-1 rounded-2xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    >
                      استلام
                    </button>
                  )}
                  {(transfer.status === 'pending_approval' || transfer.status === 'approved') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelTransfer(transfer) }}
                      className="text-xs px-3 py-1 rounded-2xl bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
