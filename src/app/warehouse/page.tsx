'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'
import { demoAction } from '@/components/demo-handler';
import { BackButton } from '@/components/layout/back-button';;
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { FadeIn } from '@/components/ui/stagger';
import { Warehouse, Plus, Package, ArrowRightLeft, AlertTriangle, Building2, MapPin, User, Clock, Edit, Trash2, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useTableSync } from '@/hooks/use-realtime-sync';

export default function WarehousePage() {
  const { data: warehouses, loading } = useTableSync<any>('warehouses');
  const [search, setSearch] = useState('');

  const filtered = (warehouses || []).filter((w: any) =>
    (w.name || '').includes(search) || (w.location || '').includes(search) || (w.manager || '').includes(search)
  );

  const totalCapacity = (warehouses || []).reduce((s: number, w: any) => s + (w.capacity || 0), 0);
  const totalUsed = (warehouses || []).reduce((s: number, w: any) => s + (w.used || 0), 0);
  const totalItems = (warehouses || []).reduce((s: number, w: any) => s + (w.items_count ?? w.items ?? 0), 0);

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
            <h1 className="text-2xl font-bold">إدارة المستودعات</h1>
            <p className="text-muted-foreground">إدارة المستودعات المتعددة وتحويل المخزون</p>
          </div>
          <Link href="/warehouse/new">
            <Button><Plus className="h-4 w-4 ml-1" /> إضافة مستودع</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div><p className="text-2xl font-bold">{(warehouses || []).length}</p><p className="text-xs text-muted-foreground">إجمالي المستودعات</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-blue-500" />
                <div><p className="text-2xl font-bold">{totalItems.toLocaleString()}</p><p className="text-xs text-muted-foreground">إجمالي المنتجات</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Warehouse className="h-5 w-5 text-emerald-500" />
                <div><p className="text-2xl font-bold">{Math.round((totalUsed / totalCapacity) * 100)}%</p><p className="text-xs text-muted-foreground">السعة المستخدمة</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div><p className="text-2xl font-bold">23</p><p className="text-xs text-muted-foreground">منتجات منخفضة المخزون</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text" placeholder="ابحث عن مستودع..."
            className="h-10 w-full rounded-lg border border-input bg-background pr-10 pl-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">لا توجد بيانات</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((wh: any) => {
            const used = wh.used || 0;
            const capacity = wh.capacity || 1;
            const itemsCount = wh.items_count ?? wh.items ?? 0;
            const created = wh.created_at ? new Date(wh.created_at).getTime() : Date.now();
            return (
            <motion.div key={wh.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Warehouse className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{wh.name}</h3>
                          <Badge variant={wh.status === 'active' ? 'success' : 'secondary'}>
                            {wh.status === 'active' ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" /> {wh.location || ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/warehouse/${wh.id}`}>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>

                  {/* Storage capacity bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>سعة التخزين</span>
                      <span>{used} / {capacity} وحدة</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(used / capacity) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-muted/50 text-center">
                      <p className="font-bold">{itemsCount}</p>
                      <p className="text-xs text-muted-foreground">منتج</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium">{wh.manager || ''}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">المسؤول</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 text-center">
                      <Clock className="h-4 w-4 mx-auto" />
                      <p className="text-xs text-muted-foreground">منذ {Math.round((Date.now() - created) / 86400000)} يوم</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Link href="/inventory/transfer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full"><ArrowRightLeft className="h-3 w-3 ml-1" /> تحويل مخزون</Button>
                    </Link>
                    <Link href={`/warehouse/${wh.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full"><Package className="h-3 w-3 ml-1" /> تفاصيل</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            );
          })}
        </div>
        )}
      </div>
    </PageTransition>
  );
}



