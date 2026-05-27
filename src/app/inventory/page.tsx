'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge';
import { StockIndicator } from '@/components/warehouse/stock-indicator';
import { PageTransition } from '@/components/ui/page-transition';
import { useTableSync } from '@/hooks/use-realtime-sync';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, Search, ArrowRightLeft, CalendarDays, Clock, Plus, BarChart3, ScrollText } from 'lucide-react';

export default function InventoryPage() {
  const { data: stockItems, loading } = useTableSync<any>('stock_items');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'over'>('all');

  const filtered = (stockItems || []).filter((item: any) => {
    const name = item.name_ar || item.name || item.product_name || '';
    const sku = item.sku || '';
    const matchesSearch = name.includes(search) || sku.includes(search);
    if (filter === 'low') return matchesSearch && item.current_qty <= item.min_qty && item.current_qty > 0;
    if (filter === 'out') return matchesSearch && item.current_qty <= 0;
    if (filter === 'over') return matchesSearch && item.current_qty > item.max_qty;
    return matchesSearch;
  });

  const lowStock = (stockItems || []).filter((i: any) => i.current_qty <= i.min_qty && i.current_qty > 0).length;
  const outOfStock = (stockItems || []).filter((i: any) => i.current_qty <= 0).length;
  const overStock = (stockItems || []).filter((i: any) => i.current_qty > i.max_qty).length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة المخزون</h1>
            <p className="text-muted-foreground">تتبع المخزون في جميع المستودعات — بيانات حية ولحظية</p>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory/reports"><Button variant="outline"><BarChart3 className="h-4 w-4 ml-1" /> تقارير</Button></Link>
            <Link href="/inventory/transfer"><Button variant="outline"><ArrowRightLeft className="h-4 w-4 ml-1" /> تحويل</Button></Link>
            <Button><Plus className="h-4 w-4 ml-1" /> جرد جديد</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-primary">{(stockItems || []).length}</p><p className="text-xs text-muted-foreground">إجمالي المنتجات</p></CardContent></Card>
          <Card className="border-amber-200"><CardContent className="p-4"><p className="text-2xl font-bold text-amber-600">{lowStock}</p><p className="text-xs text-muted-foreground">مخزون منخفض</p></CardContent></Card>
          <Card className="border-red-200"><CardContent className="p-4"><p className="text-2xl font-bold text-red-600">{outOfStock}</p><p className="text-xs text-muted-foreground">نفذ من المخزون</p></CardContent></Card>
          <Card className="border-purple-200"><CardContent className="p-4"><p className="text-2xl font-bold text-purple-600">{overStock}</p><p className="text-xs text-muted-foreground">مخزون زائد</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{loading ? '...' : '0'}</p><p className="text-xs text-muted-foreground">منتهي الصلاحية</p></CardContent></Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="بحث باسم المنتج أو SKU..." className="h-11 w-full rounded-xl border border-input bg-background pr-10 pl-3 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {([
              { key: 'all' as const, label: 'الكل', color: '' },
              { key: 'low' as const, label: 'منخفض', color: 'text-amber-600 border-amber-200' },
              { key: 'out' as const, label: 'نفذ', color: 'text-red-600 border-red-200' },
              { key: 'over' as const, label: 'زائد', color: 'text-purple-600 border-purple-200' },
            ]).map(({ key, label, color }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg border text-sm whitespace-nowrap transition-all ${filter === key ? `bg-foreground text-background ${color}` : 'hover:bg-accent'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">المنتج</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">SKU</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">المستودع</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">الموقع</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">المخزون</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">الحالة</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">آخر تحديث</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">جاري تحميل البيانات...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">لا توجد منتجات مطابقة</td></tr>
                  ) : filtered.map((item: any) => {
                    const qty = item.current_qty || 0;
                    const minQty = item.min_qty || 0;
                    const maxQty = item.max_qty || 999;
                    const isLow = qty <= minQty && qty > 0;
                    const isOut = qty <= 0;
                    return (
                      <motion.tr key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-3"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground shrink-0" /><span className="font-medium text-sm">{item.name_ar || item.name || item.product_name}</span></div></td>
                        <td className="p-3 text-xs font-mono text-muted-foreground">{item.sku || '-'}</td>
                        <td className="p-3 text-sm">{item.warehouse_name || item.warehouse_id || 'رئيسي'}</td>
                        <td className="p-3 text-xs font-mono text-muted-foreground">{item.location || '-'}</td>
                        <td className="p-3 min-w-[140px]"><StockIndicator current={qty} min={minQty} max={maxQty} /></td>
                        <td className="p-3"><Badge variant={isOut ? 'destructive' : isLow ? 'warning' : 'success'}>{isOut ? 'نفذ' : isLow ? 'منخفض' : 'متوفر'}</Badge></td>
                        <td className="p-3 text-xs text-muted-foreground"><div className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.updated_at ? Math.round((Date.now() - new Date(item.updated_at).getTime()) / 3600000) : '-'} ساعة</div></td>
                        <td className="p-3 text-center"><div className="flex items-center justify-center gap-1">
                          <Link href={`/inventory/transfer?from=${item.warehouse_id}&product=${item.id}`}><Button variant="ghost" size="icon"><ArrowRightLeft className="h-3.5 w-3.5" /></Button></Link>
                          <Link href={`/inventory/movements?product=${item.id}`}><Button variant="ghost" size="icon"><ScrollText className="h-3.5 w-3.5" /></Button></Link>
                          <Link href={`/inventory/expiry?product=${item.id}`}><Button variant="ghost" size="icon"><CalendarDays className="h-3.5 w-3.5" /></Button></Link>
                        </div></td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t text-sm text-muted-foreground">
              إجمالي {filtered.length} منتج
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
