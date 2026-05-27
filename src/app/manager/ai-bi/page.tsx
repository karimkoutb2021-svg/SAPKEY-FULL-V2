'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn, formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { parseBIQuery, getIntentLabel, type BIQuery } from '@/lib/ai-voice/bi-query-parser';
import {
  Mic, MicOff, Send, Loader2, Brain, Wallet, TrendingUp, TrendingDown,
  Receipt, Package, ShoppingCart, AlertTriangle, Download, Printer,
  FileText, BarChart3, CheckCircle, XCircle, Clock,
  CreditCard, Smartphone, Building2, ArrowUpRight, ArrowDownLeft,
  ArrowRightLeft, Shield, Lock, Plus, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient();

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  card?: ResponseCardType;
  timestamp: Date;
}

type ResponseCardType = 'treasury' | 'profit' | 'expense' | 'product' | 'stock' | 'pending' | 'error';

interface TreasuryResponse {
  accounts: { name_ar: string; type: string; current_balance: number }[];
  totalBalance: number;
  recentMovements: { type: string; amount: number; description: string; performed_at: string }[];
}

interface ProfitResponse {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalExpenses: number;
  netProfit: number;
  revenueTrend: number[];
  dateLabel: string;
  topProduct?: { name: string; qty: number; revenue: number };
}

interface ExpenseResponse {
  totalExpenses: number;
  categories: { name: string; amount: number; percentage: number }[];
  count: number;
  dateLabel: string;
}

interface ProductResponse {
  name: string;
  sku: string;
  current_stock: number;
  main_stock: number;
  branch_stock: number;
  selling_price: number;
  cost_price: number;
  total_sold: number;
  total_revenue: number;
}

interface StockResponse {
  items: { name: string; current_qty: number; min_qty: number; unit: string }[];
  count: number;
}

interface PendingResponse {
  pendingOrders: number;
  pendingTransfers: number;
  pendingApprovals: number;
}

interface ProductInfo {
  id: string;
  name_ar: string;
  sku: string;
  current_stock: number;
  sale_price: number;
}

async function fetchTreasuryData(dateRange: BIQuery['dateRange']): Promise<TreasuryResponse> {
  const { data: accounts } = await supabase.from('treasury_accounts').select('name_ar, type, current_balance').eq('is_active', true);
  const { data: movements } = await supabase.from('treasury_transactions').select('type, amount, description, performed_at').order('created_at', { ascending: false }).limit(10);
  const totalBalance = (accounts || []).reduce((s, a) => s + (a.current_balance || 0), 0);
  return {
    accounts: (accounts || []).map(a => ({ name_ar: a.name_ar, type: a.type, current_balance: a.current_balance || 0 })),
    totalBalance,
    recentMovements: (movements || []).map(m => ({ type: m.type, amount: m.amount || 0, description: m.description || '', performed_at: m.performed_at })),
  };
}

function getDateRange(dateRange: BIQuery['dateRange'], month?: number, year?: number): { start: Date; label: string } {
  const now = new Date();
  let start = new Date();
  switch (dateRange) {
    case 'today': start.setHours(0, 0, 0, 0); return { start, label: 'اليوم' };
    case 'week': start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0); return { start, label: 'هذا الأسبوع' };
    case 'month': {
      if (month) {
        start = new Date(year || now.getFullYear(), month - 1, 1);
        const end = new Date(year || now.getFullYear(), month, 0);
        return { start, label: `${monthNames[month - 1]} ${year || now.getFullYear()}` };
      }
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, label: 'هذا الشهر' };
    }
    default:
      start.setHours(0, 0, 0, 0);
      return { start, label: 'اليوم' };
  }
}

const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

async function fetchProfitData(dateRange: BIQuery['dateRange'], month?: number, year?: number): Promise<ProfitResponse> {
  const { start, label } = getDateRange(dateRange, month, year);
  const startStr = start.toISOString();
  const [ordersRes, expensesRes] = await Promise.all([
    supabase.from('orders').select('id, total, items, created_at').gte('created_at', startStr),
    supabase.from('expenses').select('amount').eq('status', 'approved').gte('created_at', startStr),
  ]);
  const orders = ordersRes.data || [];
  const expenses = expensesRes.data || [];
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalOrders = orders.length;
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const netProfit = totalRevenue - totalExpenses;

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
  const sorted = Array.from(productMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  const topProduct = sorted.length > 0 ? { name: sorted[0][0], qty: sorted[0][1].qty, revenue: sorted[0][1].revenue } : undefined;

  const dailyMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const order of orders) {
    const day = new Date(order.created_at).toISOString().slice(0, 10);
    if (dailyMap.has(day)) dailyMap.set(day, dailyMap.get(day)! + (order.total || 0));
  }
  const revenueTrend = Array.from(dailyMap.values());

  return { totalRevenue, totalOrders, avgOrderValue, totalExpenses, netProfit, revenueTrend, dateLabel: label, topProduct };
}

async function fetchExpenseData(dateRange: BIQuery['dateRange'], month?: number, year?: number): Promise<ExpenseResponse> {
  const { start, label } = getDateRange(dateRange, month, year);
  const { data } = await supabase.from('expenses').select('amount, category').eq('status', 'approved').gte('created_at', start.toISOString());
  const expenses = data || [];
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const catMap = new Map<string, number>();
  for (const e of expenses) {
    const cat = e.category || 'أخرى';
    catMap.set(cat, (catMap.get(cat) || 0) + (e.amount || 0));
  }
  const categories = Array.from(catMap.entries()).map(([name, amount]) => ({
    name, amount, percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
  })).sort((a, b) => b.amount - a.amount);
  return { totalExpenses, categories, count: expenses.length, dateLabel: label };
}

async function fetchLowStock(): Promise<StockResponse> {
  const { data } = await supabase.from('stock_items').select('product_name, current_qty, min_qty, unit');
  const all = data || [];
  const low = all.filter(item => item.current_qty <= item.min_qty);
  return {
    items: low.map(i => ({ name: i.product_name, current_qty: i.current_qty || 0, min_qty: i.min_qty || 0, unit: i.unit || 'قطعة' })),
    count: low.length,
  };
}

async function fetchPendingData(): Promise<PendingResponse> {
  const [ordersRes, transfersRes, codingRes] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('stock_transfers').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
    supabase.from('coding_drafts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  return {
    pendingOrders: ordersRes.count || 0,
    pendingTransfers: transfersRes.count || 0,
    pendingApprovals: codingRes.count || 0,
  };
}

async function fetchTopProduct(dateRange: BIQuery['dateRange'], month?: number, year?: number): Promise<ProductResponse | null> {
  const { start, label } = getDateRange(dateRange, month, year);
  const { data: orders } = await supabase.from('orders').select('id, total, items').gte('created_at', start.toISOString());
  const productMap = new Map<string, { qty: number; revenue: number; name: string }>();
  for (const order of orders || []) {
    if (!order.items || !Array.isArray(order.items)) continue;
    for (const item of order.items) {
      const name = item.name || item.product_name || 'منتج';
      const qty = item.quantity || item.qty || 1;
      const price = item.price || item.total || 0;
      const existing = productMap.get(name) || { qty: 0, revenue: 0, name };
      existing.qty += qty;
      existing.revenue += price * qty;
      productMap.set(name, existing);
    }
  }
  const sorted = Array.from(productMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  if (sorted.length === 0) return null;
  const top = sorted[0][1];
  const { data: prod } = await supabase.from('products').select('sku, current_stock, sale_price, cost_price').eq('name_ar', top.name).maybeSingle();
  const { data: stockItems } = await supabase.from('stock_items').select('current_qty').eq('product_name', top.name);
  const totalStock = stockItems?.reduce((s, i) => s + (i.current_qty || 0), 0) || 0;
  return {
    name: top.name,
    sku: prod?.sku || '',
    current_stock: prod?.current_stock || 0,
    main_stock: totalStock,
    branch_stock: 0,
    selling_price: prod?.sale_price || 0,
    cost_price: prod?.cost_price || 0,
    total_sold: top.qty,
    total_revenue: top.revenue,
  };
}

function TreasuryCard({ data }: { data: string }) {
  let parsed: TreasuryResponse;
  try { parsed = JSON.parse(data); } catch { return <div className="text-red-400">خطأ في قراءة البيانات</div>; }
  const typeColors: Record<string, string> = { main: 'bg-emerald-500/20 text-emerald-400', private: 'bg-violet-500/20 text-violet-400', branch: 'bg-blue-500/20 text-blue-400', wallet: 'bg-amber-500/20 text-amber-400' };
  const typeLabels: Record<string, string> = { main: 'رئيسي', private: 'خاص', branch: 'فرع', wallet: 'محفظة' };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-blue-900/40 via-blue-800/20 to-indigo-900/40 border border-blue-500/20 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-blue-400" />
          <span className="text-sm font-medium text-blue-300">الخزينة والحسابات</span>
        </div>
        <Shield size={16} className="text-blue-400/60" />
      </div>
      <div className="text-3xl font-bold text-white mb-5 tracking-tight">{formatCurrency(parsed.totalBalance)}</div>
      {parsed.accounts.length > 0 && (
        <div className="space-y-2 mb-4">
          {parsed.accounts.map((a, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-200">{a.name_ar}</span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full', typeColors[a.type] || 'bg-gray-500/20 text-gray-400')}>{typeLabels[a.type] || a.type}</span>
              </div>
              <span className="text-sm font-medium text-white">{formatCurrency(a.current_balance)}</span>
            </div>
          ))}
        </div>
      )}
      {parsed.recentMovements.length > 0 && (
        <>
          <div className="text-xs text-gray-500 mb-2 font-medium">آخر الحركات</div>
          <div className="space-y-1.5">
            {parsed.recentMovements.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {m.type === 'deposit' ? <ArrowUpRight size={12} className="text-emerald-400" /> : <ArrowDownLeft size={12} className="text-red-400" />}
                  <span className="text-gray-400 truncate max-w-[180px]">{m.description || (m.type === 'deposit' ? 'إيداع' : 'سحب')}</span>
                </div>
                <span className={cn('font-medium', m.type === 'deposit' ? 'text-emerald-400' : 'text-red-400')}>
                  {m.type === 'deposit' ? '+' : '-'}{formatCurrency(Math.abs(m.amount))}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProfitCard({ data, isTopProduct }: { data: string; isTopProduct?: boolean }) {
  let parsed: ProfitResponse;
  try { parsed = JSON.parse(data); } catch { return <div className="text-red-400">خطأ في قراءة البيانات</div>; }
  const maxTrend = Math.max(...parsed.revenueTrend, 1);

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-emerald-900/40 via-emerald-800/20 to-teal-900/40 border border-emerald-500/20 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-emerald-400" />
          <span className="text-sm font-medium text-emerald-300">الأرباح والمبيعات</span>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.06] text-gray-400">{parsed.dateLabel}</span>
      </div>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-3xl font-bold text-white">{formatCurrency(parsed.netProfit)}</span>
        {parsed.netProfit >= 0 ? <TrendingUp size={20} className="text-emerald-400" /> : <TrendingDown size={20} className="text-red-400" />}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'الإيرادات', value: formatCurrency(parsed.totalRevenue), icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'الطلبات', value: parsed.totalOrders.toLocaleString('ar-EG'), icon: ShoppingCart, color: 'text-blue-400' },
          { label: 'متوسط الفاتورة', value: formatCurrency(parsed.avgOrderValue), icon: Wallet, color: 'text-amber-400' },
          { label: 'المصروفات', value: formatCurrency(parsed.totalExpenses), icon: Receipt, color: 'text-red-400' },
        ].map((s, i) => (
          <div key={i} className="p-2.5 rounded-xl bg-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
              <s.icon size={10} className={s.color} />
              <span>{s.label}</span>
            </div>
            <div className="text-sm font-semibold text-white">{s.value}</div>
          </div>
        ))}
      </div>
      {parsed.revenueTrend.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 mb-1.5">اتجاه الإيرادات (آخر 7 أيام)</div>
          <div className="flex items-end gap-1" style={{ height: 36 }}>
            {parsed.revenueTrend.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end">
                <div className="w-full rounded-t-sm bg-emerald-500/50 transition-all" style={{ height: `${(v / maxTrend) * 100}%`, minHeight: v > 0 ? 4 : 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}
      {isTopProduct && parsed.topProduct && (
        <div className="rounded-xl bg-white/[0.06] p-3 mt-3">
          <div className="text-[10px] text-gray-500 mb-1">المنتج الأكثر مبيعاً</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">{parsed.topProduct.name}</span>
            <span className="text-xs text-gray-400">{parsed.topProduct.qty} قطعة - {formatCurrency(parsed.topProduct.revenue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ data }: { data: string }) {
  let parsed: ProductResponse;
  try { parsed = JSON.parse(data); } catch { return <div className="text-red-400">خطأ في قراءة البيانات</div>; }

  const handleCreatePR = () => {
    toast.success(`تم تحويل طلب شراء لـ ${parsed.name}`);
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-purple-900/40 via-purple-800/20 to-pink-900/40 border border-purple-500/20 p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Package size={20} className="text-purple-400" />
        <span className="text-sm font-medium text-purple-300">المنتج الأكثر مبيعاً</span>
      </div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-lg font-bold text-white mb-1">{parsed.name}</div>
          <div className="text-xs text-gray-500">كود: {parsed.sku || '—'}</div>
        </div>
        <button onClick={handleCreatePR} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/20 text-violet-300 text-xs hover:bg-violet-500/30 transition-colors">
          <Plus size={14} />
          إنشاء طلب شراء
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: 'سعر البيع', value: formatCurrency(parsed.selling_price) },
          { label: 'سعر التكلفة', value: formatCurrency(parsed.cost_price) },
          { label: 'المخزون الحالي', value: parsed.current_stock.toLocaleString('ar-EG') },
          { label: 'المباع', value: `${parsed.total_sold} قطعة` },
        ].map((s, i) => (
          <div key={i} className="p-2 rounded-xl bg-white/[0.04]">
            <div className="text-[10px] text-gray-500 mb-0.5">{s.label}</div>
            <div className="text-sm font-semibold text-white">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04]">
        <span className="text-xs text-gray-400">إجمالي الإيرادات</span>
        <span className="text-sm font-bold text-emerald-400">{formatCurrency(parsed.total_revenue)}</span>
      </div>
    </div>
  );
}

function ExpenseCard({ data }: { data: string }) {
  let parsed: ExpenseResponse;
  try { parsed = JSON.parse(data); } catch { return <div className="text-red-400">خطأ في قراءة البيانات</div>; }
  const barColors = ['bg-orange-500', 'bg-red-500', 'bg-amber-500', 'bg-yellow-500', 'bg-rose-500'];

  const handleDownloadPDF = () => {
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <html dir="rtl"><head><meta charset="utf-8"><title>تقرير المصروفات</title>
      <style>body{font-family:sans-serif;padding:40px;direction:rtl}h1{color:#333;border-bottom:2px solid #f59e0b;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;text-align:right;border-bottom:1px solid #eee}th{background:#f59e0b;color:#fff;font-weight:600}.total{font-size:24px;font-weight:bold;color:#d97706;margin:20px 0}</style></head>
      <body><h1>تقرير المصروفات - ${parsed.dateLabel}</h1>
      <div class="total">الإجمالي: ${formatCurrency(parsed.totalExpenses)}</div>
      <table><tr><th>التصنيف</th><th>المبلغ</th><th>النسبة</th></tr>
      ${parsed.categories.map(c => `<tr><td>${c.name}</td><td>${formatCurrency(c.amount)}</td><td>${c.percentage.toFixed(1)}%</td></tr>`).join('')}</table>
      <p style="margin-top:30px;color:#999;font-size:12px">إجمالي المعاملات: ${parsed.count}</p></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(printContent.innerHTML); win.document.close(); win.print(); }
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-orange-900/40 via-orange-800/20 to-amber-900/40 border border-orange-500/20 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt size={20} className="text-orange-400" />
          <span className="text-sm font-medium text-orange-300">المصروفات والنثريات</span>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.06] text-gray-400">{parsed.dateLabel}</span>
      </div>
      <div className="text-3xl font-bold text-white mb-5">{formatCurrency(parsed.totalExpenses)}</div>
      <div className="space-y-2.5 mb-4">
        {parsed.categories.slice(0, 8).map((cat, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-300">{cat.name}</span>
              <span className="text-gray-400">{formatCurrency(cat.amount)} ({cat.percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', barColors[i % barColors.length])} style={{ width: `${Math.min(cat.percentage, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleDownloadPDF} className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl bg-white/[0.06] text-sm text-gray-300 hover:bg-white/[0.1] transition-colors">
        <Download size={16} />
        تحميل PDF
      </button>
    </div>
  );
}

function StockCard({ data }: { data: string }) {
  let parsed: StockResponse;
  try { parsed = JSON.parse(data); } catch { return <div className="text-red-400">خطأ في قراءة البيانات</div>; }

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-amber-900/40 via-amber-800/20 to-yellow-900/40 border border-amber-500/20 p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} className="text-amber-400" />
        <span className="text-sm font-medium text-amber-300">المخزون المنخفض</span>
        {parsed.count > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{parsed.count} أصناف</span>}
      </div>
      {parsed.count === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <CheckCircle size={16} className="text-emerald-400" />
          لا توجد أصناف منخفضة المخزون
        </div>
      ) : (
        <div className="space-y-2">
          {parsed.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04]">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', item.current_qty === 0 ? 'bg-red-500' : 'bg-amber-400')} />
                <span className="text-sm text-gray-200">{item.name}</span>
              </div>
              <div className="text-xs text-gray-400">{item.current_qty} / {item.min_qty} {item.unit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingCard({ data }: { data: string }) {
  let parsed: PendingResponse;
  try { parsed = JSON.parse(data); } catch { return <div className="text-red-400">خطأ في قراءة البيانات</div>; }

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-blue-900/40 via-blue-800/20 to-indigo-900/40 border border-blue-500/20 p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-5">
        <Clock size={20} className="text-blue-400" />
        <span className="text-sm font-medium text-blue-300">الطلبات المعلقة</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'طلبات معلقة', value: parsed.pendingOrders, icon: ShoppingCart, color: 'text-amber-400' },
          { label: 'تحويلات معلقة', value: parsed.pendingTransfers, icon: ArrowRightLeft, color: 'text-blue-400' },
          { label: 'موافقات الترميز', value: parsed.pendingApprovals, icon: FileText, color: 'text-violet-400' },
        ].map((s, i) => (
          <div key={i} className="p-3 rounded-xl bg-white/[0.04] text-center">
            <s.icon size={16} className={cn(s.color, 'mx-auto mb-1.5')} />
            <div className="text-xl font-bold text-white mb-0.5">{s.value.toLocaleString('ar-EG')}</div>
            <div className="text-[10px] text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-red-900/40 via-red-800/20 to-rose-900/40 border border-red-500/20 p-5">
      <div className="flex items-center gap-2 mb-2">
        <XCircle size={20} className="text-red-400" />
        <span className="text-sm font-medium text-red-300">خطأ</span>
      </div>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

function ResponseCard({ type, data }: { type: ResponseCardType; data: string }) {
  switch (type) {
    case 'treasury': return <TreasuryCard data={data} />;
    case 'profit': return <ProfitCard data={data} />;
    case 'product': return <ProductCard data={data} />;
    case 'expense': return <ExpenseCard data={data} />;
    case 'stock': return <StockCard data={data} />;
    case 'pending': return <PendingCard data={data} />;
    case 'error': return <ErrorCard message={data} />;
    default: return <ErrorCard message="نوع البطاقة غير معروف" />;
  }
}

export default function AIBIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAuthIntent, setPendingAuthIntent] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.lang = 'ar-EG';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        setInterimText(interim || final);
        if (final) {
          handleUserQuery(final);
          setIsListening(false);
        }
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    const ch = supabase.channel('sync-bi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        window.location.reload();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInterimText('');
      try { recognitionRef.current?.start(); setIsListening(true); }
      catch { toast.error('تعذر بدء التعرف الصوتي'); }
    }
  };

  const requestBiometricAuth = async (): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            allowCredentials: [],
            userVerification: 'required',
            timeout: 30000,
          },
        } as any);
        if (credential) {
          setIsAuthenticated(true);
          return true;
        }
      }
    } catch {}

    return new Promise((resolve) => {
      setShowAuthModal(true);
      setPendingAuthIntent('awaiting_pin');
      const originalResolve = resolve;
      const interval = setInterval(() => {
        if (!showAuthModal) {
          clearInterval(interval);
          originalResolve(false);
        }
      }, 500);
    });
  };

  const confirmPin = () => {
    if (pinInput === '1234' || pinInput === '0000') {
      setIsAuthenticated(true);
      setShowAuthModal(false);
      setPinInput('');
      toast.success('تم تأكيد الهوية');
      if (pendingAuthIntent) {
        handleProcessQuery(pendingAuthIntent);
        setPendingAuthIntent(null);
      }
    } else {
      toast.error('رمز التحقق خطأ');
    }
  };

  const handleProcessQuery = async (text: string) => {
    const parsed = parseBIQuery(text);

    try {
      switch (parsed.intent) {
        case 'treasury_balance': {
          const data = await fetchTreasuryData(parsed.dateRange);
          const msg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', card: 'treasury', content: JSON.stringify(data), timestamp: new Date() };
          setMessages(prev => [...prev, msg]);
          break;
        }
        case 'profit_summary': {
          const data = await fetchProfitData(parsed.dateRange, parsed.dateMonth, parsed.dateYear);
          const msg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', card: 'profit', content: JSON.stringify(data), timestamp: new Date() };
          setMessages(prev => [...prev, msg]);
          break;
        }
        case 'top_product': {
          const data = await fetchTopProduct(parsed.dateRange, parsed.dateMonth, parsed.dateYear);
          if (data) {
            const msg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', card: 'product', content: JSON.stringify(data), timestamp: new Date() };
            setMessages(prev => [...prev, msg]);
          } else {
            const msg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'لم يتم العثور على مبيعات في هذه الفترة.', timestamp: new Date() };
            setMessages(prev => [...prev, msg]);
          }
          break;
        }
        case 'expense_summary': {
          const data = await fetchExpenseData(parsed.dateRange, parsed.dateMonth, parsed.dateYear);
          const msg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', card: 'expense', content: JSON.stringify(data), timestamp: new Date() };
          setMessages(prev => [...prev, msg]);
          break;
        }
        case 'low_stock': {
          const data = await fetchLowStock();
          const msg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', card: 'stock', content: JSON.stringify(data), timestamp: new Date() };
          setMessages(prev => [...prev, msg]);
          break;
        }
        case 'pending_orders': {
          const data = await fetchPendingData();
          const msg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', card: 'pending', content: JSON.stringify(data), timestamp: new Date() };
          setMessages(prev => [...prev, msg]);
          break;
        }
        case 'unknown':
        default: {
          const msg: ChatMessage = {
            id: (Date.now() + 1).toString(), role: 'assistant',
            content: 'آسف، مش فاهم الاستفسار ده. جرب تسأل عن: الخزينة, الأرباح, المصروفات, المخزون, أو الطلبات.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, msg]);
        }
      }
    } catch (e) {
      const msg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: 'حصل خطأ في جلب البيانات. تأكد من اتصال قاعدة البيانات.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, msg]);
    }
  };

  const handleUserQuery = async (text: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    const parsed = parseBIQuery(text);

    if (parsed.intent === 'treasury_balance' && !isAuthenticated) {
      const authSuccess = await requestBiometricAuth();
      if (!authSuccess) {
        setIsProcessing(false);
        return;
      }
    }

    await handleProcessQuery(text);
    setIsProcessing(false);
  };

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;
    handleUserQuery(input.trim());
  };

  const quickQueries = [
    { label: 'قولي رصيد الخزينة كام', query: 'قولي رصيد الخزينة كام' },
    { label: 'عايز أرباح الشهر ده', query: 'عايز أرباح الشهر ده' },
    { label: 'طلعلي مصروفات الشهر', query: 'طلعلي مصروفات الشهر' },
    { label: 'ايه المنتج الأكثر مبيعاً', query: 'ايه المنتج الأكثر مبيعاً' },
    { label: 'الأصناف الناقصة في المخزون', query: 'الأصناف الناقصة في المخزون' },
    { label: 'الطلبات المعلقة', query: 'الطلبات المعلقة' },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Brain size={22} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">مساعد ذكاء الأعمال الصوتي</h2>
            <p className="text-xs text-gray-500">اسأل بالعامية المصرية — هتلاقي رد فوري</p>
          </div>
        </div>
      </div>

      {/* Quick Queries */}
      {messages.length === 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 mb-4">
          <h3 className="text-xs font-medium text-gray-500 mb-3">استفسارات سريعة</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {quickQueries.map((q, i) => (
              <button key={i} onClick={() => handleUserQuery(q.query)} disabled={isProcessing}
                className="p-2.5 rounded-xl bg-white/[0.04] text-xs text-gray-400 hover:bg-white/[0.08] hover:text-gray-200 transition-all duration-200 text-right disabled:opacity-40"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <Brain size={40} className="mx-auto mb-3 text-gray-600" />
              <p className="text-sm">اسأل بصوتك أو اكتب عن أي حاجة في النظام</p>
              <p className="text-xs text-gray-600 mt-1.5">جرب: "عايز أرباح النهارده" أو "المخزون الناقص"</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                  className={cn('flex', msg.role === 'user' ? 'justify-start' : 'justify-end')}
                >
                  {msg.card ? (
                    <div className="w-full max-w-lg">
                      <ResponseCard type={msg.card} data={msg.content || '{}'} />
                      <p className="text-[10px] text-gray-600 mt-1.5 text-left">{msg.timestamp.toLocaleTimeString('ar-EG')}</p>
                    </div>
                  ) : (
                    <div className={cn('max-w-[80%] rounded-2xl p-3.5',
                      msg.role === 'user' ? 'bg-white/[0.06] text-white' : 'bg-violet-500/20 text-violet-100'
                    )}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <p className="text-[10px] text-gray-600 mt-1.5">{msg.timestamp.toLocaleTimeString('ar-EG')}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {isProcessing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                <div className="bg-violet-500/20 rounded-2xl p-4">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-3 items-center">
        <button onClick={toggleListening} disabled={isProcessing}
          className={cn('w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0',
            isListening ? 'bg-red-500/20 border-2 border-red-500 animate-pulse shadow-lg shadow-red-500/20' : 'bg-white/[0.06] hover:bg-white/[0.1]'
          )}
        >
          {isListening ? <MicOff size={18} className="text-red-400" /> : <Mic size={18} className="text-gray-400" />}
        </button>
        <div className="flex-1 relative">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? (interimText || 'جاري الاستماع...') : 'اسأل بالعامية المصرية...'}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-violet-500/50 placeholder-gray-600 disabled:opacity-50"
            disabled={isProcessing || isListening}
          />
          {isListening && interimText && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-red-400/70 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {interimText}
            </div>
          )}
        </div>
        <button onClick={handleSend} disabled={isProcessing || !input.trim()}
          className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center hover:bg-violet-600 transition-colors disabled:opacity-40 shrink-0"
        >
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowAuthModal(false); setPinInput(''); }}
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0F0F12] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                  <Shield size={32} className="text-violet-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-center mb-1">تأكيد الهوية</h3>
              <p className="text-xs text-gray-500 text-center mb-5">للمتابعة، أدخل رمز التحقق</p>
              <div className="relative mb-4">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="password" value={pinInput} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setPinInput(v); }}
                  onKeyDown={(e) => e.key === 'Enter' && pinInput.length === 4 && confirmPin()}
                  placeholder="****" maxLength={4}
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-center text-lg tracking-[0.5em] focus:outline-none focus:border-violet-500/50"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowAuthModal(false); setPinInput(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm text-gray-400 hover:bg-white/[0.1] transition-colors"
                >
                  إلغاء
                </button>
                <button onClick={confirmPin} disabled={pinInput.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-violet-500 text-sm font-medium hover:bg-violet-600 transition-colors disabled:opacity-40"
                >
                  تأكيد
                </button>
              </div>
              <div className="mt-4 text-center">
                <button onClick={async () => { const ok = await requestBiometricAuth(); if (ok) { setShowAuthModal(false); } }}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  أو استخدم بصمة الوجه/الإصبع
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
