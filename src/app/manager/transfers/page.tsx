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
        <div className="rounded-3xl bg-slate-800/40 backdrop-blur-md shadow-xl border border-slate-700/50 p-4 flex items-center justify-between">
          <span className={cn('text-xs px-3 py-1 rounded-full', statuses[selectedTransfer.status]?.color)}>
            {statuses[selectedTransfer.status]?.label}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(selectedTransfer.created_at).toLocaleDateString('ar-EG')}
          </span>
        </div>

        {/* Timeline */}
        <div className="rounded-3xl bg-slate-800/40 backdrop-blur-md shadow-xl border border-slate-700/50 p-6">
          <h3 className="text-sm font-semibold mb-4">تقدم التحويل</h3>
          <div className="relative">
            <div className="absolute right-[11px] top-2 bottom-2 w-0.5 bg-slate-700/60" />
            <div className="space-y-4">
              {timelineSteps.map((s, i) => {
                const isActive = i <= currentIdx
                const isCurrent = i === currentIdx
                const Icon = s.icon
                return (
                  <div key={s.key} className="flex items-center gap-3 relative z-10">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                      isActive ? 'bg-emerald-500 text-white' : 'bg-slate-700/60 text-gray-500'
                    )}>
                      {isCurrent && isActive ? (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      ) : isActive ? (
                        <CheckCircle size={12} />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-500" />
                      )}
                    </div>
                    <span className={cn('text-sm', isActive ? 'text-white font-medium' : 'text-gray-500')}>
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
          <div className="rounded-3xl bg-slate-800/40 backdrop-blur-md shadow-xl border border-slate-700/50 p-6">
            <h3 className="text-sm font-semibold mb-3">الأصناف ({transferItems.length})</h3>
            <div className="space-y-2">
              {transferItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/30 backdrop-blur-sm">
                  <div>
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-gray-400">{item.product_sku} • {item.unit}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">{item.requested_qty.toLocaleString('ar-EG')}</p>
                    <p className="text-xs text-gray-400">مطلوب</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {selectedTransfer.notes && (
          <div className="rounded-3xl bg-slate-800/40 backdrop-blur-md shadow-xl border border-slate-700/50 p-4">
            <p className="text-xs text-gray-400 mb-1">ملاحظات</p>
            <p className="text-sm">{selectedTransfer.notes}</p>
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

        <div className="rounded-3xl bg-slate-800/40 backdrop-blur-md shadow-xl border border-slate-700/50 p-6">
          {/* STEP 1: Select Warehouses */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">من المستودع</label>
                  <select
                    value={fromWarehouse}
                    onChange={(e) => { setFromWarehouse(e.target.value); setToWarehouse('') }}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-800/60 backdrop-blur-lg shadow-inner border border-slate-600/50 text-sm"
                  >
                    <option value="">اختر...</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name_ar}</option>
                    ))}
                  </select>
                  {fromWarehouse && (
                    <div className="mt-2">
                      {getWarehouseTypeBadge(warehouses.find(w => w.id === fromWarehouse)?.type || '')}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">إلى المستودع</label>
                  <select
                    value={toWarehouse}
                    onChange={(e) => setToWarehouse(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-800/60 backdrop-blur-lg shadow-inner border border-slate-600/50 text-sm"
                  >
                    <option value="">اختر...</option>
                    {warehouses.filter(w => w.id !== fromWarehouse).map(w => (
                      <option key={w.id} value={w.id}>{w.name_ar}</option>
                    ))}
                  </select>
                  {toWarehouse && (
                    <div className="mt-2">
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
                className="w-full px-4 py-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!fromWarehouse || !toWarehouse || fromWarehouse === toWarehouse}
                onClick={() => setStep('products')}
              >
                التالي
              </button>
            </div>
          )}

          {/* STEP 2: Select Products */}
          {step === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm p-3 rounded-2xl bg-slate-800/60 backdrop-blur-lg shadow-inner">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {warehouses.find(w => w.id === fromWarehouse)?.name_ar}
                </div>
                <ArrowRight className="h-4 w-4 text-emerald-400" />
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {warehouses.find(w => w.id === toWarehouse)?.name_ar}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن صنف..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-800/60 backdrop-blur-lg shadow-inner border border-slate-600/50 text-sm"
                />
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchedProducts.map(p => {
                  const isSelected = !!selectedProducts.find(sp => sp.item.id === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => !isSelected && addProduct(p)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-2xl border text-right transition-all',
                        isSelected
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-slate-700/50 hover:bg-slate-800/60 backdrop-blur-lg shadow-inner'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-gray-500 shrink-0" />
                        <div className="text-right">
                          <p className="font-medium text-sm">{p.product_name}</p>
                          <p className="text-xs text-gray-400">{p.sku} • متوفر: {p.current_qty.toLocaleString('ar-EG')} {p.unit}</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />}
                    </button>
                  )
                })}
                {searchedProducts.length === 0 && searchQuery && (
                  <div className="text-center py-4 text-gray-500 text-sm">لا توجد نتائج</div>
                )}
              </div>

              {/* Selected products with quantities */}
              {selectedProducts.length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-800/60 backdrop-blur-lg shadow-inner">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">الأصناف المحددة ({selectedProducts.length})</p>
                    <p className="text-xs text-gray-400">إجمالي الوحدات: {totalBaseUnits.toLocaleString('ar-EG')}</p>
                  </div>
                  {selectedProducts.map(p => (
                    <div key={p.item.id} className="rounded-2xl bg-slate-800/40 backdrop-blur-md shadow-xl border border-slate-700/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{p.item.product_name}</p>
                          <p className="text-xs text-gray-400">المتوفر: {p.item.current_qty.toLocaleString('ar-EG')} {p.item.unit}</p>
                        </div>
                        <button
                          onClick={() => removeProduct(p.item.id)}
                          className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(p.item.id, p.qty - 1)}
                            className="w-7 h-7 rounded-full bg-slate-700/60 flex items-center justify-center hover:bg-slate-600/90 transition-colors text-sm"
                          >-</button>
                          <span className="w-10 text-center font-bold text-sm">{p.qty.toLocaleString('ar-EG')}</span>
                          <button
                            onClick={() => updateQty(p.item.id, p.qty + 1)}
                            className="w-7 h-7 rounded-full bg-slate-700/60 flex items-center justify-center hover:bg-slate-600/90 transition-colors text-sm"
                          >+</button>
                        </div>
                        <span className="text-xs text-gray-400">{p.item.unit}</span>
                      </div>
                      {/* Conversion factor */}
                      <div className="flex items-center gap-2">
                        <Scale className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                        <input
                          type="number"
                          min={1}
                          value={p.conversionFactor}
                          onChange={(e) => updateConversion(p.item.id, parseInt(e.target.value) || 1, p.conversionUnit)}
                          className="w-16 px-2 py-1 rounded-lg bg-slate-800/60 backdrop-blur-lg shadow-inner border border-slate-600/50 text-xs text-center"
                        />
                        <span className="text-xs text-gray-400">× {p.conversionUnit} = {(p.qty * p.conversionFactor).toLocaleString('ar-EG')} {p.item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="ملاحظات (اختياري)..."
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-800/60 backdrop-blur-lg shadow-inner border border-slate-600/50 text-sm min-h-[60px]"
              />

              <div className="flex gap-3">
                <button onClick={() => setStep('select')} className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-700/60 text-sm hover:bg-slate-600/90 transition-colors">
                  السابق
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={!selectedProducts.length}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 backdrop-blur-lg shadow-inner space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">من</span>
                  <span className="font-medium">{warehouses.find(w => w.id === fromWarehouse)?.name_ar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">إلى</span>
                  <span className="font-medium">{warehouses.find(w => w.id === toWarehouse)?.name_ar}</span>
                </div>
                <div className="border-t border-slate-700/50 pt-3" />
                <div className="flex justify-between">
                  <span className="text-gray-400">عدد الأصناف</span>
                  <span className="font-bold">{selectedProducts.length.toLocaleString('ar-EG')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">إجمالي الوحدات</span>
                  <span className="font-bold">{totalBaseUnits.toLocaleString('ar-EG')}</span>
                </div>
              </div>

              {/* Product list summary */}
              <div className="space-y-1">
                {selectedProducts.map(p => (
                  <div key={p.item.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 backdrop-blur-sm text-sm">
                    <span>{p.item.product_name}</span>
                    <span className="text-xs text-gray-400">
                      {p.qty.toLocaleString('ar-EG')} × {p.conversionFactor} = {(p.qty * p.conversionFactor).toLocaleString('ar-EG')} {p.item.unit}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>سيتم خصم الأصناف من المخزن المصدر وإضافتها للمخزن الوجهة.</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('products')} className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-700/60 text-sm hover:bg-slate-600/90 transition-colors">
                  تعديل
                </button>
                <button
                  onClick={createTransfer}
                  disabled={processing}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري...</> : 'تأكيد التحويل'}
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
