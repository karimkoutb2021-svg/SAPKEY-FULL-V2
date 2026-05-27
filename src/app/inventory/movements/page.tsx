'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { Search, Filter, ArrowDown, ArrowUp, ArrowRightLeft, RotateCcw, Plus, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useTableSync } from '@/hooks/use-realtime-sync';

const typeConfig: Record<string, { labelAr: string; color: string; icon: any }> = {
  in: { labelAr: 'وارد', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', icon: ArrowDown },
  out: { labelAr: 'صادر', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: ArrowUp },
  transfer: { labelAr: 'تحويل', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: ArrowRightLeft },
  adjustment: { labelAr: 'تسوية', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: RotateCcw },
  return: { labelAr: 'إرجاع', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', icon: Plus },
};

export default function MovementsPage() {
  const { data: movements, loading } = useTableSync<any>('product_history');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = (movements || []).filter((m: any) => {
    const product = m.product_name || m.name_ar || m.name || '';
    const reference = m.reference || '';
    const notes = m.notes || '';
    const matchesSearch = product.includes(search) || reference.includes(search) || notes.includes(search);
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

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
        <div>
          <h1 className="text-2xl font-bold">حركة المخزون</h1>
          <p className="text-muted-foreground">سجل جميع حركات المخزون (وارد، صادر، تحويل، تسوية، إرجاع)</p>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="بحث..." className="h-10 w-full rounded-lg border border-input bg-background pr-10 pl-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1">
            {['all', 'in', 'out', 'transfer', 'adjustment', 'return'].map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all ${typeFilter === t ? 'bg-foreground text-background' : 'hover:bg-accent'}`}>
                {t === 'all' ? 'الكل' : typeConfig[t]?.labelAr || t}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">لا توجد بيانات</div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">النوع</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">المنتج</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">الكمية</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">المرجع</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">المستودع</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">بواسطة</th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">ملاحظات</th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m: any) => {
                      const config = typeConfig[m.type];
                      if (!config) return null;
                      const Icon = config.icon;
                      const product = m.product_name || m.name_ar || m.name || '';
                      const qty = m.quantity ?? 0;
                      return (
                        <tr key={m.id} className="border-b hover:bg-accent/50 transition-colors">
                          <td className="p-3">
                            <Badge className={config.color}>
                              <Icon className="h-3 w-3 ml-1" /> {config.labelAr}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium">{product}</td>
                          <td className="p-3">
                            <span className={`font-bold tabular-nums ${m.type === 'in' || m.type === 'return' ? 'text-emerald-600' : m.type === 'out' ? 'text-red-600' : ''}`}>
                              {m.type === 'in' || m.type === 'return' ? '+' : m.type === 'out' ? '-' : ''}{qty}
                            </span>
                          </td>
                          <td className="p-3 text-xs font-mono text-muted-foreground">{m.reference || ''}</td>
                          <td className="p-3 text-sm">{m.warehouse || ''}</td>
                          <td className="p-3 text-sm text-muted-foreground">{m.user || ''}</td>
                          <td className="p-3 text-sm text-muted-foreground">{m.notes || ''}</td>
                          <td className="p-3 text-xs text-muted-foreground text-left">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(m.created_at || m.date, 'short')}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
