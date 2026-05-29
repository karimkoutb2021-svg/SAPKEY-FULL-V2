'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  BarChart3, TrendingUp, TrendingDown, FileText, Download, Printer,
  Wallet, Package, Users, Filter, RefreshCw,
  AlertTriangle, CheckCircle, XCircle, Search, Building2, Clock,
  ArrowRightLeft} from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient();

const CHART_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: 'قرض شخصي',
  custodian_cashier: 'عهدة كاشير',
  custodian_driver: 'عهدة سائق',
  advance_salary: 'سلفة مرتب',
};

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
}

interface ExpenseCategory {
  category: string;
  total: number;
}

interface TreasuryAccount {
  id: string;
  name_ar: string;
  type: string;
  opening_balance: number;
  current_balance: number;
  wallet_provider?: string;
  deposits?: number;
  withdrawals?: number;
}

interface StockMovementSummary {
  movement_type: string;
  total_qty: number;
  count: number;
}

interface TransferStatusSummary {
  status: string;
  count: number;
}

interface WarehouseStockItem {
  warehouse_name: string;
  total_qty: number;
}

interface TopTransferredProduct {
  product_name: string;
  total_qty: number;
}

interface LoanItem {
  id: string;
  borrower_name: string;
  borrower_role: string;
  loan_type: string;
  amount: number;
  remaining_amount: number;
  status: string;
  issue_date: string;
}

interface ReconSession {
  id: string;
  session_date: string;
  status: string;
  total_system_balance: number;
  total_actual_balance: number;
  total_difference: number;
  pending_operations_count: number;
  pending_transfers_count: number;
  pending_collections_count: number;
}

function PieChart({ data, size = 120 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const center = size / 2;
  const radius = size / 2 - 4;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        const startAngle = (cumulative / total) * 360;
        cumulative += d.value;
        const endAngle = (cumulative / total) * 360;
        const startRad = ((startAngle - 90) * Math.PI) / 180;
        const endRad = ((endAngle - 90) * Math.PI) / 180;
        const x1 = center + radius * Math.cos(startRad);
        const y1 = center + radius * Math.sin(startRad);
        const x2 = center + radius * Math.cos(endRad);
        const y2 = center + radius * Math.sin(endRad);
        const large = endAngle - startAngle > 180 ? 1 : 0;
        if (d.value === 0) return null;
        return (
          <path key={i} d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`} fill={d.color} />
        );
      })}
      <circle cx={center} cy={center} r={radius * 0.5} fill="#0A0A0C" />
    </svg>
  );
}

function Sparkline({ data, color = '#10b981', height = 60, width = 200 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-50">
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#6b7280" fontSize="10">لا توجد بيانات</text>
      </svg>
    );
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 4;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * chartW;
    const y = padding + chartH - ((v - min) / range) * chartH;
    return `${x},${y}`;
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p}`).join(' ');
  const areaD = `${pathD} L ${padding + chartW},${padding + chartH} L ${padding},${padding + chartH} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`spark-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-fill-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'treasury' | 'inventory' | 'loans' | 'reconciliation'>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [dateRangeLabel, setDateRangeLabel] = useState('آخر شهر');

  const [walletTypeFilter, setWalletTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');

  const [employees, setEmployees] = useState<{ id: string; full_name_ar: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name_ar: string }[]>([]);

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalExpenses: 0,
    netProfit: 0,
    newCustomers: 0,
    topProducts: [] as TopProduct[],
  });
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [treasurySparkline, setTreasurySparkline] = useState<number[]>([]);
  const [treasuryTotalBal, setTreasuryTotalBal] = useState(0);

  const [stockMovements, setStockMovements] = useState<StockMovementSummary[]>([]);
  const [transferStats, setTransferStats] = useState<TransferStatusSummary[]>([]);
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStockItem[]>([]);
  const [topTransferred, setTopTransferred] = useState<TopTransferredProduct[]>([]);

  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [custodianTotals, setCustodianTotals] = useState<Record<string, { count: number; total: number }>>({});

  const [reconSessions, setReconSessions] = useState<ReconSession[]>([]);
  const [discrepancyCount, setDiscrepancyCount] = useState(0);
  const [discrepancyTotalDiff, setDiscrepancyTotalDiff] = useState(0);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  useEffect(() => {
    const ch = supabase.channel('sync-orders-expenses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchReportData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchReportData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function fetchFilterOptions() {
    const [empRes, whRes] = await Promise.all([
      supabase.from('employees').select().limit(500).eq('is_active', true),
      supabase.from('warehouses').select().limit(500).eq('is_active', true),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (whRes.data) setWarehouses(whRes.data);
  }

  async function fetchReportData() {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      if (dateRange === 'today') { startDate.setHours(0, 0, 0, 0); setDateRangeLabel('اليوم'); }
      else if (dateRange === 'week') { startDate.setDate(now.getDate() - 7); setDateRangeLabel('آخر 7 أيام'); }
      else if (dateRange === 'month') { startDate.setMonth(now.getMonth() - 1); setDateRangeLabel('آخر شهر'); }

      const startStr = startDate.toISOString();

      await Promise.all([
        fetchSummary(startStr),
        fetchTreasury(startStr),
        fetchInventory(startStr),
        fetchLoans(),
        fetchReconciliation(startStr),
      ]);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary(startStr: string) {
    try {
      const [ordersRes, expensesRes] = await Promise.all([
        supabase.from('orders').select().limit(500).gte('created_at', startStr),
        supabase.from('expenses').select().limit(500).eq('status', 'approved').gte('created_at', startStr),
      ]);

      const orders = ordersRes.data || [];
      const expenses = expensesRes.data || [];

      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalOrders = orders.length;
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const netProfit = totalRevenue - totalExpenses;
      const uniqueCustomers = new Set(orders.filter(o => o.customer_name).map(o => o.customer_name));

      const productMap = new Map<string, { qty: number; revenue: number }>();
      for (const order of orders) {
        if (!order.items || !Array.isArray(order.items)) continue;
        for (const item of order.items) {
          const name = item.name || item.product_name || 'منتج';
          const qty = item.quantity || item.qty || 1;
          const price = item.price || item.total || 0;
          const existing = productMap.get(name) || { qty: 0, revenue: 0 };
          existing.qty += qty;
          existing.revenue += price * qty;
          productMap.set(name, existing);
        }
      }

      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, qty: data.qty, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const dailyMap = new Map<string, number>();
      for (const order of orders) {
        const day = order.created_at.slice(0, 10);
        dailyMap.set(day, (dailyMap.get(day) || 0) + (order.total || 0));
      }
      const daily = Array.from(dailyMap.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const expenseCatMap = new Map<string, number>();
      for (const e of expenses) {
        const cat = e.category || 'أخرى';
        expenseCatMap.set(cat, (expenseCatMap.get(cat) || 0) + (e.amount || 0));
      }
      const expenseCats = Array.from(expenseCatMap.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      setSummary({ totalRevenue, totalOrders, avgOrderValue, totalExpenses, netProfit, newCustomers: uniqueCustomers.size, topProducts });
      setDailyRevenue(daily);
      setExpenseCategories(expenseCats);
    } catch (err) {
      console.error('fetchSummary error:', err);
    }
  }

  async function fetchTreasury(startStr: string) {
    try {
      let accountsQuery = supabase.from('treasury_accounts').select().limit(500).eq('is_active', true);
      if (walletTypeFilter !== 'all') accountsQuery = accountsQuery.eq('type', walletTypeFilter);
      const accountsRes = await accountsQuery;
      const accounts = (accountsRes.data || []) as TreasuryAccount[];

      const acctsWithBalance = await Promise.all(
        accounts.map(async (acct) => {
          const depRes = await supabase
            .from('treasury_transactions')
            .select().limit(500)
            .eq('treasury_id', acct.id)
            .eq('type', 'deposit')
            .eq('status', 'completed')
            .gte('created_at', startStr);
          const wdRes = await supabase
            .from('treasury_transactions')
            .select().limit(500)
            .eq('treasury_id', acct.id)
            .eq('type', 'withdrawal')
            .eq('status', 'completed')
            .gte('created_at', startStr);
          const deposits = (depRes.data || []).reduce((s, t) => s + (t.amount || 0), 0);
          const withdrawals = (wdRes.data || []).reduce((s, t) => s + (t.amount || 0), 0);
          return { ...acct, deposits, withdrawals };
        })
      );

      setTreasuryAccounts(acctsWithBalance);
      setTreasuryTotalBal(acctsWithBalance.reduce((s, a) => s + (a.current_balance || 0), 0));

      const now = new Date();
      const sparkDays: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
        const { data: dayTx } = await supabase
          .from('treasury_transactions')
          .select().limit(500)
          .eq('status', 'completed')
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd);
        const dayNet = (dayTx || []).reduce((s, t) => {
          if (t.type === 'deposit' || t.type === 'transfer_in') return s + (t.amount || 0);
          if (t.type === 'withdrawal' || t.type === 'transfer_out') return s - (t.amount || 0);
          return s;
        }, 0);
        sparkDays.push(dayNet);
      }
      setTreasurySparkline(sparkDays);
    } catch (err) {
      console.error('fetchTreasury error:', err);
    }
  }

  async function fetchInventory(startStr: string) {
    try {
      let movQuery = supabase
        .from('stock_movements')
        .select().limit(500)
        .gte('created_at', startStr);
      if (movementTypeFilter !== 'all') movQuery = movQuery.eq('movement_type', movementTypeFilter);

      const [movRes, transferRes, stockRes, topTransRes] = await Promise.all([
        movQuery,
        supabase.from('stock_transfers').select().limit(500).gte('created_at', startStr),
        supabase.from('inventory_stock').select().limit(500),
        supabase
          .from('transfer_items')
          .select().limit(500)
          .gte('created_at', startStr),
      ]);

      const movMap = new Map<string, { total_qty: number; count: number }>();
      for (const m of (movRes.data || [])) {
        const key = m.movement_type || 'other';
        const existing = movMap.get(key) || { total_qty: 0, count: 0 };
        existing.total_qty += Math.abs(m.quantity || 0);
        existing.count += 1;
        movMap.set(key, existing);
      }
      setStockMovements(
        Array.from(movMap.entries()).map(([movement_type, v]) => ({ movement_type, ...v }))
      );

      const transferMap = new Map<string, number>();
      for (const t of (transferRes.data || [])) {
        const key = t.status || 'other';
        transferMap.set(key, (transferMap.get(key) || 0) + 1);
      }
      setTransferStats(
        Array.from(transferMap.entries()).map(([status, count]) => ({ status, count }))
      );

      const stockMap = new Map<string, number>();
      for (const s of (stockRes.data || [])) {
        const wid = s.warehouse_id || 'unknown';
        stockMap.set(wid, (stockMap.get(wid) || 0) + (s.quantity || 0));
      }

      const allWarehouses = [...new Set([...stockMap.keys(), ...warehouses.map(w => w.id)])];
      const stockList: WarehouseStockItem[] = [];
      for (const wid of allWarehouses) {
        const w = warehouses.find(x => x.id === wid);
        if (w) stockList.push({ warehouse_name: w.name_ar, total_qty: stockMap.get(wid) || 0 });
      }
      stockList.sort((a, b) => b.total_qty - a.total_qty);
      setWarehouseStock(stockList);

      const transProdMap = new Map<string, number>();
      for (const t of (topTransRes.data || [])) {
        const name = t.product_name || 'منتج';
        transProdMap.set(name, (transProdMap.get(name) || 0) + (t.requested_qty || 0));
      }
      setTopTransferred(
        Array.from(transProdMap.entries())
          .map(([product_name, total_qty]) => ({ product_name, total_qty }))
          .sort((a, b) => b.total_qty - a.total_qty)
          .slice(0, 10)
      );
    } catch (err) {
      console.error('fetchInventory error:', err);
    }
  }

  async function fetchLoans() {
    try {
      const { data: loanData } = await supabase
        .from('internal_loans')
        .select().limit(500)
        .in('status', ['active', 'partial'])
        .order('issue_date', { ascending: false });
      const loanList = (loanData || []) as LoanItem[];
      setLoans(loanList);

      const custodian: Record<string, { count: number; total: number }> = { cashier: { count: 0, total: 0 }, driver: { count: 0, total: 0 }, personal: { count: 0, total: 0 } };
      for (const l of loanList) {
        const key = l.loan_type === 'custodian_cashier' ? 'cashier' : l.loan_type === 'custodian_driver' ? 'driver' : 'personal';
        if (custodian[key]) {
          custodian[key].count += 1;
          custodian[key].total += l.remaining_amount;
        }
      }
      setCustodianTotals(custodian);
    } catch (err) {
      console.error('fetchLoans error:', err);
    }
  }

  async function fetchReconciliation(startStr: string) {
    try {
      const [sessionsRes, discRes] = await Promise.all([
        supabase.from('reconciliation_sessions').select().limit(500).gte('created_at', startStr).order('session_date', { ascending: false }),
        supabase.from('discrepancy_entries').select().limit(500).gte('created_at', startStr),
      ]);
      const sessions = (sessionsRes.data || []) as ReconSession[];
      setReconSessions(sessions);

      const discrepancies = discRes.data || [];
      setDiscrepancyCount(discrepancies.length);
      setDiscrepancyTotalDiff(discrepancies.reduce((s, d) => s + Math.abs(d.difference || 0), 0));
    } catch (err) {
      console.error('fetchReconciliation error:', err);
    }
  }

  const tabs = [
    { key: 'all' as const, label: 'الكل', icon: BarChart3 },
    { key: 'treasury' as const, label: 'الخزائن', icon: Wallet },
    { key: 'inventory' as const, label: 'المخازن', icon: Package },
    { key: 'loans' as const, label: 'السلف والعهد', icon: Wallet },
    { key: 'reconciliation' as const, label: 'فروقات المطابقة', icon: AlertTriangle },
  ];

  const SHOW_ALL = activeTab === 'all';
  const SHOW_TREASURY = activeTab === 'all' || activeTab === 'treasury';
  const SHOW_INVENTORY = activeTab === 'all' || activeTab === 'inventory';
  const SHOW_LOANS = activeTab === 'all' || activeTab === 'loans';
  const SHOW_RECONCILIATION = activeTab === 'all' || activeTab === 'reconciliation';

  function exportToExcel() {
    const lines: string[][] = [];

    if (SHOW_ALL) {
      lines.push(['الفترة', dateRangeLabel]);
      lines.push(['إجمالي الإيرادات', String(summary.totalRevenue)]);
      lines.push(['عدد الطلبات', String(summary.totalOrders)]);
      lines.push(['متوسط الطلب', String(summary.avgOrderValue)]);
      lines.push(['إجمالي المصروفات', String(summary.totalExpenses)]);
      lines.push(['صافي الربح', String(summary.netProfit)]);
      lines.push(['عدد العملاء الجدد', String(summary.newCustomers)]);
      lines.push([]);
      lines.push(['المنتجات الأكثر مبيعاً', '', '']);
      lines.push(['المنتج', 'الكمية', 'الإيراد']);
      for (const p of summary.topProducts) lines.push([p.name, String(p.qty), String(p.revenue)]);
      lines.push([]);
      lines.push(['المصروفات حسب الفئة', '']);
      for (const e of expenseCategories) lines.push([e.category, String(e.total)]);
      lines.push([]);
    }

    if (SHOW_TREASURY) {
      lines.push(['--- تقرير الخزائن ---']);
      lines.push(['الحساب', 'النوع', 'الرصيد الافتتاحي', 'الرصيد الحالي', 'إجمالي الإيداعات', 'إجمالي المسحوبات']);
      for (const a of treasuryAccounts) lines.push([a.name_ar, a.type, String(a.opening_balance), String(a.current_balance), String(a.deposits || 0), String(a.withdrawals || 0)]);
      lines.push([], []);
    }

    if (SHOW_INVENTORY) {
      lines.push(['--- تقرير المخازن ---']);
      lines.push(['نوع الحركة', 'الكمية', 'العدد']);
      for (const m of stockMovements) lines.push([m.movement_type, String(m.total_qty), String(m.count)]);
      lines.push([]);
      lines.push(['المستودع', 'المخزون']);
      for (const s of warehouseStock) lines.push([s.warehouse_name, String(s.total_qty)]);
      lines.push([], []);
    }

    if (SHOW_LOANS) {
      lines.push(['--- تقرير السلف والعهد ---']);
      lines.push(['المستلف', 'النوع', 'المبلغ', 'المتبقي', 'الحالة']);
      for (const l of loans) lines.push([l.borrower_name, LOAN_TYPE_LABELS[l.loan_type] || l.loan_type, String(l.amount), String(l.remaining_amount), l.status]);
      lines.push([], []);
    }

    if (SHOW_RECONCILIATION) {
      lines.push(['--- تقرير فروقات المطابقة ---']);
      lines.push(['التاريخ', 'الحالة', 'النظام', 'الفعلي', 'الفرق']);
      for (const s of reconSessions) lines.push([s.session_date, s.status, String(s.total_system_balance), String(s.total_actual_balance), String(s.total_difference)]);
    }

    const csv = lines.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير التقرير');
  }

  function exportToPDF() {
    const content = document.getElementById('report-content');
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html dir="rtl"><head><title>تقرير SAPKEY</title>
      <style>body{font-family:system-ui;padding:20px;direction:rtl}
      h1{color:#059669;font-size:24px}
      table{width:100%;border-collapse:collapse;margin:20px 0}
      th,td{padding:8px 12px;border:1px solid #ddd;text-align:right}
      th{background:#059669;color:white}
      .card{border:1px solid #ddd;border-radius:8px;padding:16px;margin:8px;display:inline-block;min-width:150px}
      .total{font-size:20px;font-weight:bold;color:#059669}
      .section-title{font-size:18px;color:#059669;margin-top:24px;padding-bottom:8px;border-bottom:2px solid #059669}
      .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px}
      .bg-green{background:#d1fae5;color:#065f46}
      .bg-red{background:#fee2e2;color:#991b1b}
      .bg-blue{background:#dbeafe;color:#1e40af}
      .bg-amber{background:#fef3c7;color:#92400e}
      .bg-gray{background:#f3f4f6;color:#374151}
      </style></head><body>
      <h1>تقرير SAPKEY</h1>
      <p>الفترة: ${dateRangeLabel} | التبويب: ${tabs.find(t => t.key === activeTab)?.label}</p>
      ${content.innerHTML}
      <p style="margin-top:40px;color:#999;font-size:12px">تم الإنشاء: ${new Date().toLocaleString('ar-EG')}</p>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
    toast.success('تم فتح التقرير للطباعة');
  }

  const maxDailyRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1);
  const maxExpense = Math.max(...expenseCategories.map(e => e.total), 1);
  const grandTotal = dailyRevenue.reduce((s, d) => s + d.revenue, 0);
  const SVG_BAR_MAX = 160;

  const movementTypeLabels: Record<string, string> = {
    purchase: 'مشتريات', sale: 'مبيعات', transfer: 'تحويل', adjustment: 'تسوية', return: 'مرتجع',
  };

  const transferStatusLabels: Record<string, string> = {
    draft: 'مسودة', pending_approval: 'بانتظار الاعتماد', approved: 'معتمد', in_transit: 'قيد النقل', received: 'تم الاستلام', cancelled: 'ملغي',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div id="report-content" className="space-y-6">

      {/* Tabs */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors',
                activeTab === key
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/[0.04] text-gray-400 border border-transparent hover:bg-white/[0.08]'
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range + Filters */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {([['today', 'اليوم'], ['week', 'أسبوع'], ['month', 'شهر'], ['custom', 'مخصص']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              className={cn(
                'flex-1 min-w-[60px] py-2 rounded-xl text-sm transition-colors',
                dateRange === key
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex gap-3 flex-wrap items-end">
          {SHOW_TREASURY && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500">نوع الخزينة</label>
              <select
                value={walletTypeFilter}
                onChange={e => { setWalletTypeFilter(e.target.value); fetchReportData(); }}
                className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-gray-300"
              >
                <option value="all">الكل</option>
                <option value="main">رئيسي</option>
                <option value="wallet">محفظة</option>
                <option value="private">خاص</option>
                <option value="branch">فرعي</option>
              </select>
            </div>
          )}
          {SHOW_LOANS && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500">الموظف</label>
                <select
                  value={employeeFilter}
                  onChange={e => setEmployeeFilter(e.target.value)}
                  className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-gray-300"
                >
                  <option value="all">الكل</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.full_name_ar}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          {SHOW_INVENTORY && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500">المستودع</label>
                <select
                  value={warehouseFilter}
                  onChange={e => setWarehouseFilter(e.target.value)}
                  className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-gray-300"
                >
                  <option value="all">الكل</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name_ar}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500">نوع الحركة</label>
                <select
                  value={movementTypeFilter}
                  onChange={e => { setMovementTypeFilter(e.target.value); fetchReportData(); }}
                  className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-gray-300"
                >
                  <option value="all">الكل</option>
                  <option value="purchase">مشتريات</option>
                  <option value="sale">مبيعات</option>
                  <option value="transfer">تحويل</option>
                  <option value="adjustment">تسوية</option>
                  <option value="return">مرتجع</option>
                </select>
              </div>
            </>
          )}
          <button
            onClick={() => fetchReportData()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 transition-colors"
          >
            <RefreshCw size={14} />
            تحديث
          </button>
        </div>
      </div>

      {/* === ALL / DEFAULT SECTION === */}
      {(SHOW_ALL) && (
        <>
          {/* Financial Summary - 6 Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <p className="text-xs text-emerald-400/70">إجمالي الإيرادات</p>
              <p className="text-lg font-bold mt-1 text-emerald-400">{summary.totalRevenue.toLocaleString('ar-EG')} <span className="text-xs">ج.م</span></p>
            </div>
            <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4">
              <p className="text-xs text-blue-400/70">عدد الطلبات</p>
              <p className="text-lg font-bold mt-1 text-blue-400">{summary.totalOrders}</p>
            </div>
            <div className="rounded-2xl bg-purple-500/10 border border-purple-500/20 p-4">
              <p className="text-xs text-purple-400/70">متوسط الطلب</p>
              <p className="text-lg font-bold mt-1 text-purple-400">{summary.avgOrderValue.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} <span className="text-xs">ج.م</span></p>
            </div>
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4">
              <p className="text-xs text-rose-400/70">إجمالي المصروفات</p>
              <p className="text-lg font-bold mt-1 text-rose-400">{summary.totalExpenses.toLocaleString('ar-EG')} <span className="text-xs">ج.م</span></p>
            </div>
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
              <p className="text-xs text-amber-400/70">صافي الربح</p>
              <p className="text-lg font-bold mt-1 text-amber-400">{summary.netProfit.toLocaleString('ar-EG')} <span className="text-xs">ج.م</span></p>
            </div>
            <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-4">
              <p className="text-xs text-cyan-400/70">عدد العملاء الجدد</p>
              <p className="text-lg font-bold mt-1 text-cyan-400">{summary.newCustomers}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Chart */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
              <h3 className="text-lg font-semibold mb-4">الإيرادات اليومية</h3>
              {dailyRevenue.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                  <div className="text-center"><BarChart3 size={32} className="mx-auto mb-2 opacity-30" /><p>لا توجد بيانات</p></div>
                </div>
              ) : (
                <div className="relative" style={{ height: SVG_BAR_MAX + 60 }}>
                  <svg viewBox={`0 0 ${Math.max(dailyRevenue.length * 50, 200)} ${SVG_BAR_MAX + 60}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    {dailyRevenue.map((d, i) => {
                      const barH = (d.revenue / maxDailyRevenue) * SVG_BAR_MAX;
                      const x = i * 50 + 10;
                      const y = SVG_BAR_MAX - barH;
                      const w = 30;
                      return (
                        <g key={d.date}>
                          <rect x={x} y={y} width={w} height={barH} rx={4} className="fill-emerald-500/80 hover:fill-emerald-400 transition-colors">
                            <title>{`${d.date}: ${d.revenue.toLocaleString('ar-EG')} ج.م`}</title>
                          </rect>
                          <text x={x + w / 2} y={SVG_BAR_MAX + 16} textAnchor="middle" className="fill-gray-400 text-[10px]" fontSize="10">{d.date.slice(5)}</text>
                          <text x={x + w / 2} y={y - 6} textAnchor="middle" className="fill-emerald-400 text-[10px]" fontSize="10">{d.revenue.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>

            {/* Top Products */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
              <h3 className="text-lg font-semibold mb-4">أعلى المنتجات مبيعاً</h3>
              {summary.topProducts.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                  <div className="text-center"><Package size={32} className="mx-auto mb-2 opacity-30" /><p>لا توجد بيانات</p></div>
                </div>
              ) : (
                <div className="space-y-1">
                  {summary.topProducts.map((p, i) => {
                    const pct = grandTotal > 0 ? (p.revenue / grandTotal) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                        <span className="text-xs text-gray-500 w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{p.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{p.qty} قطعة</span>
                            <span>|</span>
                            <span>{p.revenue.toLocaleString('ar-EG')} ج.م</span>
                            <span className="text-emerald-400">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Expenses Breakdown */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <h3 className="text-lg font-semibold mb-4">المصروفات حسب الفئة</h3>
            {expenseCategories.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
                <div className="text-center"><FileText size={28} className="mx-auto mb-2 opacity-30" /><p>لا توجد مصروفات معتمدة</p></div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-right py-2 px-3 text-gray-400 font-medium">الفئة</th>
                        <th className="text-right py-2 px-3 text-gray-400 font-medium">المبلغ</th>
                        <th className="text-right py-2 px-3 text-gray-400 font-medium">النسبة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseCategories.map((e, i) => {
                        const pct = summary.totalExpenses > 0 ? (e.total / summary.totalExpenses) * 100 : 0;
                        return (
                          <tr key={i} className="border-b border-white/[0.03]">
                            <td className="py-2 px-3">{e.category}</td>
                            <td className="py-2 px-3 text-rose-400">{e.total.toLocaleString('ar-EG')} ج.م</td>
                            <td className="py-2 px-3 text-gray-400">{pct.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                      <tr className="font-medium">
                        <td className="py-2 px-3 text-gray-300">الإجمالي</td>
                        <td className="py-2 px-3 text-rose-400">{summary.totalExpenses.toLocaleString('ar-EG')} ج.م</td>
                        <td className="py-2 px-3 text-gray-400">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex items-end gap-2" style={{ height: 120 }}>
                  {expenseCategories.map((e, i) => {
                    const barH = (e.total / maxExpense) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-400">{e.total.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}</span>
                        <div className="w-full rounded-t-md bg-rose-500/60 hover:bg-rose-400 transition-colors" style={{ height: barH, maxWidth: 40 }} />
                        <span className="text-[10px] text-gray-500 truncate w-full text-center">{e.category}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* === TREASURY SECTION === */}
      {SHOW_TREASURY && (
        <>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Wallet size={20} className="text-emerald-400" /> تقرير الخزائن</h3>
              <div className="text-sm">
                <span className="text-gray-400">إجمالي الأرصدة: </span>
                <span className="text-emerald-400 font-bold">{treasuryTotalBal.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="flex justify-center mb-6">
              <PieChart
                data={treasuryAccounts.map((a, i) => ({
                  label: a.name_ar,
                  value: a.current_balance,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
                size={140}
              />
            </div>

            {/* Sparkline */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-2">اتجاه الرصيد (آخر 7 أيام)</p>
              <Sparkline data={treasurySparkline} color="#10b981" height={60} width={300} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">الحساب</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">النوع</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">الرصيد الافتتاحي</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">الرصيد الحالي</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">إجمالي الإيداعات</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">إجمالي المسحوبات</th>
                  </tr>
                </thead>
                <tbody>
                  {treasuryAccounts.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-500">لا توجد حسابات خزينة</td></tr>
                  ) : treasuryAccounts.map((a, i) => (
                    <tr key={a.id} className="border-b border-white/[0.03]">
                      <td className="py-2 px-3">{a.name_ar}</td>
                      <td className="py-2 px-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px]',
                          a.type === 'main' ? 'bg-emerald-500/20 text-emerald-400' :
                          a.type === 'wallet' ? 'bg-blue-500/20 text-blue-400' :
                          a.type === 'private' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-amber-500/20 text-amber-400'
                        )}>{a.type}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-300">{a.opening_balance.toLocaleString('ar-EG')}</td>
                      <td className="py-2 px-3 text-emerald-400 font-medium">{a.current_balance.toLocaleString('ar-EG')}</td>
                      <td className="py-2 px-3 text-green-400">{(a.deposits || 0).toLocaleString('ar-EG')}</td>
                      <td className="py-2 px-3 text-rose-400">{(a.withdrawals || 0).toLocaleString('ar-EG')}</td>
                    </tr>
                  ))}
                  <tr className="font-medium bg-white/[0.02]">
                    <td className="py-2 px-3 text-gray-200">الإجمالي</td>
                    <td />
                    <td className="py-2 px-3 text-gray-300">{treasuryAccounts.reduce((s, a) => s + a.opening_balance, 0).toLocaleString('ar-EG')}</td>
                    <td className="py-2 px-3 text-emerald-400">{treasuryTotalBal.toLocaleString('ar-EG')}</td>
                    <td className="py-2 px-3 text-green-400">{treasuryAccounts.reduce((s, a) => s + (a.deposits || 0), 0).toLocaleString('ar-EG')}</td>
                    <td className="py-2 px-3 text-rose-400">{treasuryAccounts.reduce((s, a) => s + (a.withdrawals || 0), 0).toLocaleString('ar-EG')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* === INVENTORY SECTION === */}
      {SHOW_INVENTORY && (
        <>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Package size={20} className="text-emerald-400" /> حركات المخزون</h3>
            {stockMovements.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-gray-500 text-sm">لا توجد حركات مخزون</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {stockMovements.map((m, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">{m.total_qty.toLocaleString('ar-EG')}</p>
                    <p className="text-xs text-gray-400">{movementTypeLabels[m.movement_type] || m.movement_type}</p>
                    <p className="text-[10px] text-gray-500">{m.count} عملية</p>
                  </div>
                ))}
              </div>
            )}

            {/* Stock Movement Bar Chart */}
            {stockMovements.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-400 mb-2">مقارنة حركات المخزون</p>
                <div className="flex items-end gap-3" style={{ height: 100 }}>
                  {stockMovements.map((m, i) => {
                    const maxQty = Math.max(...stockMovements.map(x => x.total_qty), 1);
                    const barH = (m.total_qty / maxQty) * 80;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-400">{m.count}</span>
                        <div
                          className="w-full rounded-t-md transition-colors"
                          style={{ height: barH, maxWidth: 36, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '99' }}
                        />
                        <span className="text-[10px] text-gray-500 truncate w-full text-center">{movementTypeLabels[m.movement_type] || m.movement_type}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Transfer Summary */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ArrowRightLeft size={18} className="text-emerald-400" /> ملخص التحويلات</h3>
            {transferStats.length === 0 ? (
              <div className="h-20 flex items-center justify-center text-gray-500 text-sm">لا توجد تحويلات في هذه الفترة</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {transferStats.map((t, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                    <p className="text-lg font-bold text-blue-400">{t.count}</p>
                    <p className="text-xs text-gray-400">{transferStatusLabels[t.status] || t.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warehouse Stock Comparison */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Building2 size={18} className="text-emerald-400" /> مقارنة مخزون المستودعات</h3>
            {warehouseStock.length === 0 ? (
              <div className="h-20 flex items-center justify-center text-gray-500 text-sm">لا توجد بيانات مخزون</div>
            ) : (
              <div className="flex items-end gap-3" style={{ height: 120 }}>
                {warehouseStock.slice(0, 8).map((s, i) => {
                  const maxStock = Math.max(...warehouseStock.map(x => x.total_qty), 1);
                  const barH = (s.total_qty / maxStock) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-400">{s.total_qty.toLocaleString('ar-EG')}</span>
                      <div className="w-full rounded-t-md bg-blue-500/60 hover:bg-blue-400 transition-colors" style={{ height: barH, maxWidth: 36 }} />
                      <span className="text-[10px] text-gray-500 truncate w-full text-center" title={s.warehouse_name}>{s.warehouse_name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Transferred Products */}
          {topTransferred.length > 0 && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
              <h3 className="text-lg font-semibold mb-4">أعلى المنتجات تحويلاً</h3>
              <div className="space-y-1">
                {topTransferred.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                    <span className="text-xs text-gray-500 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p.product_name}</p>
                    </div>
                    <span className="text-xs text-emerald-400">{p.total_qty} قطعة</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* === LOANS & CUSTODIAN SECTION === */}
      {SHOW_LOANS && (
        <>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Wallet size={20} className="text-emerald-400" /> تقرير السلف والعهد</h3>

            {/* Custodian Totals */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-center">
                <p className="text-xs text-blue-400/70">عهدة كاشير</p>
                <p className="text-lg font-bold text-blue-400">{custodianTotals.cashier?.total.toLocaleString('ar-EG')} <span className="text-xs">ج.م</span></p>
                <p className="text-[10px] text-gray-500">{custodianTotals.cashier?.count || 0} قرض</p>
              </div>
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-center">
                <p className="text-xs text-amber-400/70">عهدة سائق</p>
                <p className="text-lg font-bold text-amber-400">{custodianTotals.driver?.total.toLocaleString('ar-EG')} <span className="text-xs">ج.م</span></p>
                <p className="text-[10px] text-gray-500">{custodianTotals.driver?.count || 0} قرض</p>
              </div>
              <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 text-center">
                <p className="text-xs text-purple-400/70">سلف شخصية</p>
                <p className="text-lg font-bold text-purple-400">{custodianTotals.personal?.total.toLocaleString('ar-EG')} <span className="text-xs">ج.م</span></p>
                <p className="text-[10px] text-gray-500">{custodianTotals.personal?.count || 0} قرض</p>
              </div>
            </div>

            {/* Loans by Type Pie Chart */}
            {(() => {
              const typeMap = new Map<string, number>();
              loans.forEach(l => {
                const key = LOAN_TYPE_LABELS[l.loan_type] || l.loan_type;
                typeMap.set(key, (typeMap.get(key) || 0) + l.remaining_amount);
              });
              const loanPieData = Array.from(typeMap.entries()).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
              return loanPieData.length > 0 ? (
                <div className="flex justify-center mb-6">
                  <div className="flex items-center gap-6">
                    <PieChart data={loanPieData} size={120} />
                    <div className="space-y-1">
                      {loanPieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                          <span className="text-gray-400">{d.label}</span>
                          <span className="text-gray-200">{d.value.toLocaleString('ar-EG')} ج.م</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Loans Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">المستلف</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">النوع</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">المبلغ</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">المتبقي</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">الحالة</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-500">لا توجد سلف أو عهد نشطة</td></tr>
                  ) : loans.map((l, i) => (
                    <tr key={l.id} className="border-b border-white/[0.03]">
                      <td className="py-2 px-3">{l.borrower_name}</td>
                      <td className="py-2 px-3">
                        <span className="text-xs text-gray-400">{LOAN_TYPE_LABELS[l.loan_type] || l.loan_type}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-200">{l.amount.toLocaleString('ar-EG')}</td>
                      <td className={cn('py-2 px-3', l.remaining_amount > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                        {l.remaining_amount.toLocaleString('ar-EG')}
                      </td>
                      <td className="py-2 px-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px]',
                          l.status === 'active' ? 'bg-amber-500/20 text-amber-400' :
                          l.status === 'partial' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        )}>
                          {l.status === 'active' ? 'نشط' : l.status === 'partial' ? 'مسدد جزئياً' : 'مسدد'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{l.issue_date?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* === RECONCILIATION SECTION === */}
      {SHOW_RECONCILIATION && (
        <>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle size={20} className="text-emerald-400" /> تقرير فروقات المطابقة</h3>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">عدد الفروقات</p>
                  <p className={cn('text-lg font-bold', discrepancyCount > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                    {discrepancyCount}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">إجمالي الفرق</p>
                  <p className={cn('text-lg font-bold', discrepancyTotalDiff > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                    {discrepancyTotalDiff.toLocaleString('ar-EG')}
                  </p>
                </div>
              </div>
            </div>

            {reconSessions.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
                <div className="text-center"><CheckCircle size={32} className="mx-auto mb-2 opacity-30" /><p>لا توجد جلسات مطابقة</p></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-right py-2 px-3 text-gray-400 font-medium">التاريخ</th>
                      <th className="text-right py-2 px-3 text-gray-400 font-medium">الحالة</th>
                      <th className="text-right py-2 px-3 text-gray-400 font-medium">رصيد النظام</th>
                      <th className="text-right py-2 px-3 text-gray-400 font-medium">الرصيد الفعلي</th>
                      <th className="text-right py-2 px-3 text-gray-400 font-medium">الفرق</th>
                      <th className="text-right py-2 px-3 text-gray-400 font-medium">معلقة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconSessions.map((s, i) => {
                      const diff = s.total_difference;
                      const matched = diff === 0;
                      return (
                        <tr key={s.id} className="border-b border-white/[0.03]">
                          <td className="py-2 px-3">{s.session_date?.slice(0, 10)}</td>
                          <td className="py-2 px-3">
                            <span className={cn(
                              'px-2 py-0.5 rounded text-[10px]',
                              s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                              s.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            )}>
                              {s.status === 'completed' ? 'مكتملة' : s.status === 'in_progress' ? 'قيد المطابقة' : 'مفتوحة'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-300">{s.total_system_balance.toLocaleString('ar-EG')}</td>
                          <td className="py-2 px-3 text-gray-300">{s.total_actual_balance.toLocaleString('ar-EG')}</td>
                          <td className="py-2 px-3 flex items-center gap-1">
                            {matched ? (
                              <CheckCircle size={14} className="text-emerald-400" />
                            ) : (
                              <XCircle size={14} className="text-rose-400" />
                            )}
                            <span className={matched ? 'text-emerald-400' : 'text-rose-400'}>
                              {diff.toLocaleString('ar-EG')}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-400">
                            <span className="text-xs">{s.pending_operations_count} عمليات</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Status Distribution Bar */}
            {reconSessions.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-gray-400 mb-2">توزيع حالات جلسات المطابقة</p>
                <div className="flex gap-3">
                  {(() => {
                    const statusMap = new Map<string, number>();
                    reconSessions.forEach(s => {
                      const key = s.status === 'completed' ? 'مكتملة' : s.status === 'in_progress' ? 'قيد المطابقة' : 'مفتوحة';
                      statusMap.set(key, (statusMap.get(key) || 0) + 1);
                    });
                    const total = reconSessions.length;
                    return Array.from(statusMap.entries()).map(([label, count], i) => {
                      const pct = (count / total) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-medium">{count}</span>
                          <div
                            className="w-full h-2 rounded-full transition-colors"
                            style={{
                              backgroundColor: label === 'مكتملة' ? '#10b98166' : label === 'قيد المطابقة' ? '#f59e0b66' : '#3b82f666',
                            }}
                          />
                          <span className="text-[10px] text-gray-500">{label} ({pct.toFixed(0)}%)</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Export */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h3 className="text-lg font-semibold mb-4">تصدير التقرير</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            تصدير Excel ({tabs.find(t => t.key === activeTab)?.label})
          </button>
          <button
            onClick={exportToPDF}
            className="px-4 py-2 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors flex items-center gap-2"
          >
            <Printer size={16} />
            طباعة PDF ({tabs.find(t => t.key === activeTab)?.label})
          </button>
          <button
            onClick={() => fetchReportData()}
            className="px-4 py-2 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            تحديث البيانات
          </button>
        </div>
      </div>
    </div>
  );
}
