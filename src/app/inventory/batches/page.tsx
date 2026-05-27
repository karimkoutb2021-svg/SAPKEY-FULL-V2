'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';
import { useTableSync } from '@/hooks/use-realtime-sync';
import { Search, Plus, Package, CalendarDays, Clock } from 'lucide-react';

export default function BatchesPage() {
  const { data: stockItems, loading } = useTableSync<any>('stock_items');
  const [search, setSearch] = useState('');

  const filtered = (stockItems || []).filter((b: any) =>
    (b.batch_no || b.batch || '').includes(search) ||
    (b.name_ar || b.name || b.product_name || '').includes(search) ||
    (b.supplier || '').includes(search)
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">تتبع الباتشات</h1>
            <p className="text-muted-foreground">إدارة ومتابعة الباتشات وأرقام التشغيلات — بيانات حية</p>
          </div>
          <Button><Plus className="h-4 w-4 ml-1" /> باتش جديد</Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="ابحث برقم الباتش أو المنتج أو المورد..." className="h-10 w-full rounded-lg border border-input bg-background pr-10 pl-3 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">الباتش</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">المنتج</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">الكمية</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">المستودع</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">المورد</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">تاريخ الإنتاج</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">تاريخ الانتهاء</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">جاري تحميل البيانات...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">لا توجد باتشات مسجلة</td></tr>
                  ) : filtered.map((b: any) => (
                    <tr key={b.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-3 font-mono text-sm font-medium">{b.batch_no || b.batch || '-'}</td>
                      <td className="p-3">{b.name_ar || b.name || b.product_name}</td>
                      <td className="p-3 font-bold tabular-nums">{b.current_qty || b.quantity || 0}</td>
                      <td className="p-3 text-sm">{b.warehouse_name || b.warehouse_id || '-'}</td>
                      <td className="p-3 text-sm">{b.supplier || '-'}</td>
                      <td className="p-3 text-sm">{b.manufacture_date ? new Date(b.manufacture_date).toLocaleDateString('ar-EG') : '-'}</td>
                      <td className="p-3 text-sm">{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('ar-EG') : '-'}</td>
                      <td className="p-3 text-center">
                        {b.expiry_date && new Date(b.expiry_date) < new Date() ?
                          <Badge variant="destructive">منتهي</Badge> :
                          <Badge variant="success">نشط</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
