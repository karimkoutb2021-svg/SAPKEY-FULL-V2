'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { BarChart3, TrendingDown, TrendingUp, Download, FileText, Printer, Calendar, Package, Wallet, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useTableSync } from '@/hooks/use-realtime-sync';

const reports = [
  { title: 'تقرير المخزون الشامل', titleEn: 'Full Inventory Report', description: 'جميع المنتجات مع الكميات والمواقع', icon: Package, color: 'bg-blue-100 text-blue-600' },
  { title: 'المنتجات منخفضة المخزون', titleEn: 'Low Stock Report', description: 'منتجات تحت الحد الأدنى', icon: AlertTriangle, color: 'bg-amber-100 text-amber-600' },
  { title: 'حركة المخزون', titleEn: 'Stock Movement Report', description: 'سجل جميع الحركات (وارد/صادر/تحويل)', icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600' },
  { title: 'انتهاء الصلاحية', titleEn: 'Expiry Report', description: 'المنتجات المنتهية أو وشيكة الانتهاء', icon: Calendar, color: 'bg-red-100 text-red-600' },
  { title: 'قيمة المخزون', titleEn: 'Inventory Value Report', description: 'القيمة الإجمالية للمخزون', icon: Wallet, color: 'bg-purple-100 text-purple-600' },
  { title: 'الفروقات والتسويات', titleEn: 'Discrepancies Report', description: 'فروقات الجرد والتسويات', icon: TrendingDown, color: 'bg-orange-100 text-orange-600' },
];

export default function InventoryReportsPage() {
  const { data: stockItems, loading } = useTableSync<any>('stock_items');
  const [selected, setSelected] = useState<string | null>(null);

  const totalValue = useMemo(() => {
    if (!stockItems) return 0;
    return stockItems.reduce((sum: number, item: any) => {
      return sum + ((item.price || item.cost || 0) * (item.quantity || 0));
    }, 0);
  }, [stockItems]);

  const totalUnits = useMemo(() => {
    if (!stockItems) return 0;
    return stockItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  }, [stockItems]);

  const lowStockCount = useMemo(() => {
    if (!stockItems) return 0;
    return stockItems.filter((item: any) => {
      const qty = item.quantity || 0;
      const min = item.min_stock || 0;
      return min > 0 && qty <= min;
    }).length;
  }, [stockItems]);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">تقارير المخزون</h1>
            <p className="text-muted-foreground">تقارير متقدمة لتحليل وإدارة المخزون</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline"><Download className="h-4 w-4 ml-1" /> تصدير</Button>
            <Button variant="outline"><Printer className="h-4 w-4 ml-1" /> طباعة</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-muted-foreground">القيمة الإجمالية للمخزون</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{totalUnits.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">إجمالي الوحدات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{lowStockCount}</p>
              <p className="text-xs text-muted-foreground">SKU منخفضة المخزون</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stockItems?.length || 0}</p>
              <p className="text-xs text-muted-foreground">إجمالي SKU</p>
            </CardContent>
          </Card>
        </div>

        {stockItems?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">لا توجد بيانات</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.title}
                onClick={() => setSelected(report.title)}
                className={`p-5 rounded-xl border text-right transition-all hover:shadow-md ${
                  selected === report.title ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${report.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{report.title}</h3>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline">{formatDate(Date.now())}</Badge>
                      <Button variant="ghost" size="sm" className="h-7">
                        <FileText className="h-3 w-3 ml-1" /> عرض
                      </Button>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{selected}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground text-sm">
                سيتم عرض التقرير هنا مع مخططات بيانية وجداول تفصيلية
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}

