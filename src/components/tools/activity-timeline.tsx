'use client';

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft, ArrowUpRight, ArrowRight, ArrowLeft,
  Receipt, Wallet, CheckCircle, ShoppingCart, ShoppingBag,
  SlidersHorizontal, ClipboardCheck, AlertTriangle, RotateCcw,
  ArrowRightLeft, Activity, Filter, RefreshCw, Search, Image,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export interface ActivityItem {
  id: string;
  timestamp: string;
  user?: string;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'opening'
       | 'purchase' | 'sale' | 'adjustment' | 'audit' | 'damage' | 'return'
       | 'stock_transfer' | 'reconciliation' | 'expense' | 'loan_issue' | 'loan_settlement';
  category: 'financial' | 'inventory' | 'admin';
  value: number;
  status: string;
  balance_before?: number;
  balance_after?: number;
  description: string;
  source_name?: string;
  attachment_url?: string;
  reference_id?: string;
}

export interface ActivityTimelineProps {
  items?: ActivityItem[];
  loading?: boolean;
  maxItems?: number;
  showFilters?: boolean;
  onRefresh?: () => void;
  autoFetch?: boolean;
  sourceTypes?: ('treasury' | 'inventory' | 'stock_transfer' | 'order')[];
  dateFrom?: string;
  dateTo?: string;
}

type CategoryFilter = 'all' | 'financial' | 'inventory' | 'admin';
type DateRange = 'today' | 'week' | 'month' | 'custom';

const typeConfig: Record<string, { category: ActivityItem['category']; color: string; label: string }> = {
  deposit:     { category: 'financial', color: 'emerald', label: 'إيداع' },
  withdrawal:  { category: 'financial', color: 'red',     label: 'سحب' },
  transfer_in: { category: 'financial', color: 'blue',    label: 'تحويل وارد' },
  transfer_out:{ category: 'financial', color: 'orange',  label: 'تحويل صادر' },
  opening:     { category: 'financial', color: 'gray',    label: 'رصيد افتتاحي' },
  expense:     { category: 'financial', color: 'rose',    label: 'مصروف' },
  loan_issue:  { category: 'financial', color: 'violet',  label: 'سلفة' },
  loan_settlement: { category: 'financial', color: 'emerald', label: 'تسوية سلفة' },

  purchase:        { category: 'inventory', color: 'blue',    label: 'مشتريات' },
  sale:            { category: 'inventory', color: 'emerald', label: 'مبيعات' },
  adjustment:      { category: 'inventory', color: 'amber',   label: 'تسوية' },
  audit:           { category: 'inventory', color: 'purple',  label: 'جرد' },
  damage:          { category: 'inventory', color: 'red',     label: 'توالف' },
  'return':        { category: 'inventory', color: 'violet',  label: 'مرتجع' },
  stock_transfer:  { category: 'inventory', color: 'cyan',    label: 'تحويل مخزني' },

  reconciliation:  { category: 'admin', color: 'indigo', label: 'مطابقة' },
};

const colorClasses: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'border-emerald-400 bg-emerald-400/20' },
  red:     { border: 'border-red-500/30',     bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'border-red-400 bg-red-400/20' },
  blue:    { border: 'border-blue-500/30',    bg: 'bg-blue-500/10',    text: 'text-blue-400',    dot: 'border-blue-400 bg-blue-400/20' },
  orange:  { border: 'border-orange-500/30',  bg: 'bg-orange-500/10',  text: 'text-orange-400',  dot: 'border-orange-400 bg-orange-400/20' },
  gray:    { border: 'border-gray-500/30',    bg: 'bg-gray-500/10',    text: 'text-gray-400',    dot: 'border-gray-400 bg-gray-400/20' },
  rose:    { border: 'border-rose-500/30',    bg: 'bg-rose-500/10',    text: 'text-rose-400',    dot: 'border-rose-400 bg-rose-400/20' },
  violet:  { border: 'border-violet-500/30',  bg: 'bg-violet-500/10',  text: 'text-violet-400',  dot: 'border-violet-400 bg-violet-400/20' },
  amber:   { border: 'border-amber-500/30',   bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'border-amber-400 bg-amber-400/20' },
  purple:  { border: 'border-purple-500/30',  bg: 'bg-purple-500/10',  text: 'text-purple-400',  dot: 'border-purple-400 bg-purple-400/20' },
  cyan:    { border: 'border-cyan-500/30',    bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    dot: 'border-cyan-400 bg-cyan-400/20' },
  indigo:  { border: 'border-indigo-500/30',  bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  dot: 'border-indigo-400 bg-indigo-400/20' },
};

const statusColors: Record<string, string> = {
  completed: 'text-emerald-400 bg-emerald-500/10',
  settled: 'text-emerald-400 bg-emerald-500/10',
  approved: 'text-emerald-400 bg-emerald-500/10',
  received: 'text-emerald-400 bg-emerald-500/10',
  active: 'text-emerald-400 bg-emerald-500/10',
  paid: 'text-emerald-400 bg-emerald-500/10',
  reconciled: 'text-emerald-400 bg-emerald-500/10',
  matched: 'text-emerald-400 bg-emerald-500/10',
  pending: 'text-amber-400 bg-amber-500/10',
  pending_approval: 'text-amber-400 bg-amber-500/10',
  draft: 'text-amber-400 bg-amber-500/10',
  in_progress: 'text-amber-400 bg-amber-500/10',
  open: 'text-amber-400 bg-amber-500/10',
  partial: 'text-amber-400 bg-amber-500/10',
  processing: 'text-amber-400 bg-amber-500/10',
  delayed: 'text-amber-400 bg-amber-500/10',
  in_transit: 'text-blue-400 bg-blue-500/10',
  rejected: 'text-red-400 bg-red-500/10',
  cancelled: 'text-red-400 bg-red-500/10',
  shortage: 'text-red-400 bg-red-500/10',
  overage: 'text-red-400 bg-red-500/10',
};

function getStatusColor(status: string): string {
  return statusColors[status] || 'text-gray-400 bg-white/[0.06]';
}

function parseValue(val: number): { sign: string; abs: number } {
  return { sign: val >= 0 ? '+' : '-', abs: Math.abs(val) };
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'الآن';
  if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} د`;
  if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} س`;
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const iconMap: Record<string, (props: any) => ReactNode> = {
    deposit: (p) => <ArrowDownLeft {...p} />,
    withdrawal: (p) => <ArrowUpRight {...p} />,
    transfer_in: (p) => <ArrowRight {...p} />,
    transfer_out: (p) => <ArrowLeft {...p} />,
    opening: (_p) => <div className="w-[18px] h-[18px] rounded-full border-2 border-current" />,
    expense: (p) => <Receipt {...p} />,
    loan_issue: (p) => <Wallet {...p} />,
    loan_settlement: (p) => <CheckCircle {...p} />,
    purchase: (p) => <ShoppingCart {...p} />,
    sale: (p) => <ShoppingBag {...p} />,
    adjustment: (p) => <SlidersHorizontal {...p} />,
    audit: (p) => <ClipboardCheck {...p} />,
    damage: (p) => <AlertTriangle {...p} />,
    'return': (p) => <RotateCcw {...p} />,
    stock_transfer: (p) => <ArrowRightLeft {...p} />,
    reconciliation: (p) => <ClipboardCheck {...p} />,
  };
  const Icon = iconMap[type];
  if (!Icon) return <Activity className={className} />;
  return Icon({ className });
}

function filterByDate(items: ActivityItem[], range: DateRange, dateFrom?: string, dateTo?: string): ActivityItem[] {
  const now = new Date();
  let start: Date;

  switch (range) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 86400000);
      break;
    case 'month':
      start = new Date(now.getTime() - 30 * 86400000);
      break;
    case 'custom': {
      if (!dateFrom) return items;
      const s = new Date(dateFrom).getTime();
      const e = dateTo ? new Date(dateTo).getTime() : Infinity;
      return items.filter((item) => {
        const t = new Date(item.timestamp).getTime();
        return t >= s && t <= e;
      });
    }
    default:
      return items;
  }

  const startMs = start.getTime();
  return items.filter((item) => new Date(item.timestamp).getTime() >= startMs);
}

async function fetchActivityData(
  sourceTypes: NonNullable<ActivityTimelineProps['sourceTypes']>,
  dateFrom?: string,
  dateTo?: string,
  maxItems: number = 100
): Promise<ActivityItem[]> {
  const supabase = createClient();
  const allItems: ActivityItem[] = [];

  const hasTreasury = sourceTypes.length === 0 || sourceTypes.includes('treasury');
  const hasInventory = sourceTypes.length === 0 || sourceTypes.includes('inventory');
  const hasTransfer = sourceTypes.length === 0 || sourceTypes.includes('stock_transfer');
  const hasOrder = sourceTypes.length === 0 || sourceTypes.includes('order');

  if (hasTreasury) {
    const { data: txns } = await supabase
      .from('treasury_transactions')
      .select('*, treasury_accounts(name_ar)')
      .order('created_at', { ascending: false });

    if (txns) {
      for (const t of txns) {
        allItems.push({
          id: `treasury-${t.id}`,
          timestamp: t.created_at,
          user: t.performed_by,
          type: t.type,
          category: 'financial',
          value: t.amount,
          status: t.status,
          balance_before: t.balance_before,
          balance_after: t.balance_after,
          description: t.description || '',
          source_name: t.treasury_accounts?.name_ar || t.category,
          attachment_url: t.attachment_url,
          reference_id: t.reference_id,
        });
      }
    }
  }

  if (hasInventory) {
    const { data: history } = await supabase
      .from('product_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (history) {
      for (const h of history) {
        const mappedType = h.type === 'coding' ? 'adjustment' : h.type as ActivityItem['type'];
        allItems.push({
          id: `history-${h.id}`,
          timestamp: h.created_at,
          user: h.performed_by_name,
          type: mappedType,
          category: 'inventory',
          value: h.total_value || h.quantity,
          status: 'completed',
          description: h.product_name
            ? `${h.product_name}${h.quantity ? ` (${h.quantity > 0 ? '+' : ''}${h.quantity})` : ''}${h.notes ? ` - ${h.notes}` : ''}`
            : h.notes || '',
          source_name: undefined,
          attachment_url: undefined,
          reference_id: h.reference_id || h.id,
        });
      }
    }
  }

  if (hasTransfer) {
    const { data: transfers } = await supabase
      .from('stock_transfers')
      .select('*, from_warehouse:from_warehouse_id(name_ar), to_warehouse:to_warehouse_id(name_ar)')
      .order('created_at', { ascending: false });

    if (transfers) {
      for (const t of transfers) {
        allItems.push({
          id: `transfer-${t.id}`,
          timestamp: t.created_at,
          user: t.requested_by_name,
          type: 'stock_transfer',
          category: 'inventory',
          value: t.total_items,
          status: t.status,
          description: `من ${t.from_warehouse?.name_ar || '—'} إلى ${t.to_warehouse?.name_ar || '—'}`,
          source_name: t.transfer_number,
          attachment_url: undefined,
          reference_id: t.transfer_number,
        });
      }
    }
  }

  if (hasTreasury) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (expenses) {
      for (const e of expenses) {
        allItems.push({
          id: `expense-${e.id}`,
          timestamp: e.created_at,
          user: e.responsible,
          type: 'expense',
          category: 'financial',
          value: -Math.abs(e.amount),
          status: e.status,
          description: e.description,
          source_name: e.category,
          attachment_url: e.attachment_url,
          reference_id: undefined,
        });
      }
    }

    const { data: loans } = await supabase
      .from('internal_loans')
      .select('*')
      .order('created_at', { ascending: false });

    if (loans) {
      for (const l of loans) {
        allItems.push({
          id: `loan-${l.id}`,
          timestamp: l.created_at,
          user: l.borrower_name,
          type: l.status === 'settled' ? 'loan_settlement' : 'loan_issue',
          category: 'financial',
          value: l.amount,
          status: l.status,
          balance_after: l.remaining_amount,
          description: l.reason,
          source_name: l.borrower_role,
          attachment_url: undefined,
          reference_id: undefined,
        });
      }
    }
  }

  if (dateFrom || dateTo) {
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : 0;
    const toMs = dateTo ? new Date(dateTo).getTime() + 86400000 : Infinity;
    return allItems
      .filter((item) => {
        const t = new Date(item.timestamp).getTime();
        return t >= fromMs && t <= toMs;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxItems);
  }

  return allItems
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxItems);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export function ActivityTimeline({
  items: propItems,
  loading: propLoading,
  maxItems = 100,
  showFilters = true,
  onRefresh,
  autoFetch = false,
  sourceTypes = [],
  dateFrom: propDateFrom,
  dateTo: propDateTo,
}: ActivityTimelineProps) {
  const [fetchedItems, setFetchedItems] = useState<ActivityItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customFrom, setCustomFrom] = useState<string | undefined>(propDateFrom);
  const [customTo, setCustomTo] = useState<string | undefined>(propDateTo);

  const fetchData = useCallback(async () => {
    if (!autoFetch) return;
    setFetching(true);
    try {
      const data = await fetchActivityData(sourceTypes, propDateFrom, propDateTo, maxItems);
      setFetchedItems(data);
    } catch {
      setFetchedItems([]);
    } finally {
      setFetching(false);
    }
  }, [autoFetch, sourceTypes, propDateFrom, propDateTo, maxItems]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    if (autoFetch) {
      fetchData();
    }
    onRefresh?.();
  }, [autoFetch, fetchData, onRefresh]);

  const displayItems = useMemo(() => {
    const source = propItems || fetchedItems;
    if (!source.length) return [];

    let filtered = source;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    filtered = filterByDate(filtered, dateRange, customFrom, customTo);

    return filtered.slice(0, maxItems);
  }, [propItems, fetchedItems, categoryFilter, dateRange, customFrom, customTo, maxItems]);

  const isLoading = propLoading || fetching;

  const categoryPills: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'financial', label: 'مالي' },
    { key: 'inventory', label: 'مخزني' },
    { key: 'admin', label: 'إداري' },
  ];

  const datePills: { key: DateRange; label: string }[] = [
    { key: 'today', label: 'اليوم' },
    { key: 'week', label: 'أسبوع' },
    { key: 'month', label: 'شهر' },
    { key: 'custom', label: 'مخصص' },
  ];

  return (
    <div dir="rtl" className="w-full">
      {showFilters && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">النشاط المالي والمخزني</h3>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={cn('text-gray-400', isLoading && 'animate-spin')} />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-gray-500 flex-shrink-0" />
            <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.04]">
              {categoryPills.map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setCategoryFilter(pill.key)}
                  className={cn(
                    'px-3 h-7 rounded-md text-xs font-medium transition-all duration-200',
                    categoryFilter === pill.key
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Search size={14} className="text-gray-500 flex-shrink-0" />
            <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.04]">
              {datePills.map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setDateRange(pill.key)}
                  className={cn(
                    'px-3 h-7 rounded-md text-xs font-medium transition-all duration-200',
                    dateRange === pill.key
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom || ''}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-7 px-2 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-white outline-none"
                />
                <span className="text-xs text-gray-500">—</span>
                <input
                  type="date"
                  value={customTo || ''}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-7 px-2 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-white outline-none"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-3 h-3 mt-1.5 rounded-full bg-white/[0.06] flex-shrink-0" />
              <div className="flex-1 p-4 rounded-xl bg-white/[0.02]">
                <div className="h-4 w-24 bg-white/[0.06] rounded mb-2" />
                <div className="h-3 w-48 bg-white/[0.04] rounded mb-2" />
                <div className="h-3 w-32 bg-white/[0.04] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <Activity size={28} className="text-gray-500" />
          </div>
          <p className="text-sm text-gray-400">لا توجد حركات</p>
          {(categoryFilter !== 'all' || dateRange !== 'month') && (
            <button
              onClick={() => { setCategoryFilter('all'); setDateRange('month'); }}
              className="mt-2 text-xs text-emerald-400 hover:text-emerald-300"
            >
              إعادة تعيين الفلترة
            </button>
          )}
        </div>
      ) : (
        <motion.div
          className="relative"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="absolute right-[17px] top-0 bottom-0 w-px bg-white/[0.06]" />

          {displayItems.map((item) => {
            const config = typeConfig[item.type] || { category: 'admin', color: 'gray', label: item.type };
            const cc = colorClasses[config.color] || colorClasses.gray;
            const val = parseValue(item.value);
            const statusCls = getStatusColor(item.status);
            const valueCls = val.sign === '+' ? 'text-emerald-400' : 'text-red-400';

            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                className="relative pr-11 pb-4 last:pb-0"
              >
                <div className={cn('absolute right-[11px] top-5 w-3 h-3 rounded-full border-2', cc.dot)} />

                <div className={cn('p-4 rounded-xl bg-white/[0.02] border-r-2', cc.border)}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('flex-shrink-0', cc.text)}>
                        <TypeIcon type={item.type} />
                      </span>
                      <span className={cn('text-xs font-semibold', cc.text)}>
                        {config.label}
                      </span>
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium leading-none', statusCls)}>
                        {item.status === 'completed' ? 'مكتمل' :
                         item.status === 'settled' ? 'مسوى' :
                         item.status === 'approved' ? 'معتمد' :
                         item.status === 'received' ? 'مستلم' :
                         item.status === 'active' ? 'نشط' :
                         item.status === 'paid' ? 'مدفوع' :
                         item.status === 'reconciled' ? 'مطابق' :
                         item.status === 'matched' ? 'مطابق' :
                         item.status === 'pending' || item.status === 'pending_approval' ? 'معلق' :
                         item.status === 'draft' ? 'مسودة' :
                         item.status === 'in_progress' || item.status === 'open' ? 'قيد التنفيذ' :
                         item.status === 'partial' ? 'جزئي' :
                         item.status === 'processing' ? 'قيد المعالجة' :
                         item.status === 'in_transit' ? 'قيد النقل' :
                         item.status === 'rejected' ? 'مرفوض' :
                         item.status === 'cancelled' ? 'ملغي' :
                         item.status === 'shortage' ? 'عجز' :
                         item.status === 'overage' ? 'زيادة' :
                         item.status === 'delayed' ? 'مؤجل' :
                         item.status}
                      </span>
                    </div>
                    <span className={cn('text-sm font-bold flex-shrink-0', valueCls)}>
                      {val.sign}{val.abs.toLocaleString('ar-EG')}{item.category === 'financial' ? ' ج.م' : ''}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 mb-1.5 leading-relaxed">{item.description}</p>

                  <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
                    {item.user && <span>{item.user}</span>}
                    <span>{formatTimestamp(item.timestamp)}</span>
                    {item.source_name && <span>{item.source_name}</span>}
                  </div>

                  {(item.balance_before !== undefined || item.balance_after !== undefined) && (
                    <div className="mt-2 text-[10px] text-gray-500">
                      قبل: <span className="text-gray-300">{item.balance_before?.toLocaleString('ar-EG') || '—'} ج.م</span>
                      {' → '}
                      بعد: <span className="text-gray-300">{item.balance_after?.toLocaleString('ar-EG') || '—'} ج.م</span>
                    </div>
                  )}

                  {item.attachment_url && (
                    <a
                      href={item.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Image size={12} />
                      مرفق
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

export default ActivityTimeline;
