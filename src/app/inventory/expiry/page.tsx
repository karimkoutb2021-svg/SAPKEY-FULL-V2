'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';
import { FadeIn } from '@/components/ui/stagger';
import { motion } from 'framer-motion';
import { CalendarDays, AlertTriangle, Skull, CheckCircle, Search, Filter, Package, Clock, Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useTableSync } from '@/hooks/use-realtime-sync';

const statusConfig = {
  active: { label: 'ساري', color: 'bg-emerald-100 text-emerald-800' },
  expiring: { label: 'سينتهي قريباً', color: 'bg-amber-100 text-amber-800' },
  expired: { label: 'منتهي', color: 'bg-red-100 text-red-800' },
  disposed: { label: 'تم التخلص', color: 'bg-gray-100 text-gray-800' },
};

function computeStatus(expiryDate: string | number | null) {
  if (!expiryDate) return 'active';
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  if (expiry < now) return 'expired';
  if (expiry - now <= 86400000 * 7) return 'expiring';
  return 'active';
}

function normalizeDate(d: string | number | null) {
  if (!d) return Date.now();
  const t = new Date(d).getTime();
  return isNaN(t) ? Date.now() : t;
}

export default function ExpiryPage() {
  const { data: stockItems, loading } = useTableSync<any>('stock_items');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const expiryRecords = useMemo(() => (stockItems || []).filter((item: any) => item.expiry_date), [stockItems]);

  const filtered = expiryRecords.filter((r: any) => {
    const name = r.name_ar || r.name || '';
    const batch = r.batch || '';
    const status = computeStatus(r.expiry_date);
    const matchesSearch = name.includes(search) || batch.includes(search);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const expired = expiryRecords.filter((r: any) => computeStatus(r.expiry_date) === 'expired').length;
  const expiring = expiryRecords.filter((r: any) => computeStatus(r.expiry_date) === 'expiring').length;
  const active = expiryRecords.filter((r: any) => computeStatus(r.expiry_date) === 'active').length;

  const getDaysLeft = (date: number) => Math.ceil((date - Date.now()) / 86400000);

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
            <h1 className="text-2xl font-bold">تتبع تواريخ انتهاء الصلاحية</h1>
            <p className="text-muted-foreground">إدارة تواريخ صلاحية المنتجات وتنبيهات الانتهاء</p>
          </div>
          <Button><Plus className="h-4 w-4 ml-1" /> إضافة صلاحية</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-primary" />
                <div><p className="text-2xl font-bold">{expiryRecords.length}</p><p className="text-xs text-muted-foreground">إجمالي السجلات</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <div><p className="text-2xl font-bold text-emerald-600">{active}</p><p className="text-xs text-muted-foreground">ساري</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div><p className="text-2xl font-bold text-amber-600">{expiring}</p><p className="text-xs text-muted-foreground">سينتهي قريباً</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skull className="h-5 w-5 text-red-600" />
                <div><p className="text-2xl font-bold text-red-600">{expired}</p><p className="text-xs text-muted-foreground">منتهي الصلاحية</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="بحث..." className="h-10 w-full rounded-lg border border-input bg-background pr-10 pl-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {['all', 'expired', 'expiring', 'active', 'disposed'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${statusFilter === s ? 'bg-foreground text-background' : 'hover:bg-accent'}`}>
              {s === 'all' ? 'الكل' : statusConfig[s as keyof typeof statusConfig]?.label || s}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">لا توجد بيانات</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((record: any) => {
              const status = computeStatus(record.expiry_date);
              const config = statusConfig[status];
              const expiryDate = normalizeDate(record.expiry_date);
              const manufactureDate = normalizeDate(record.manufacture_date);
              const daysLeft = getDaysLeft(expiryDate);
              const name = record.name_ar || record.name || '';
              const batch = record.batch || '';
              const quantity = record.quantity ?? 0;
              const warehouse = record.warehouse_name || record.warehouse || '';
              return (
                <motion.div key={record.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={`hover:shadow-md transition-all ${
                    status === 'expired' ? 'border-red-200 bg-red-50/30 dark:bg-red-950/10' :
                    status === 'expiring' ? 'border-amber-200 bg-amber-50/30 dark:bg-amber-950/10' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            status === 'expired' ? 'bg-red-100' : status === 'expiring' ? 'bg-amber-100' : 'bg-emerald-100'
                          }`}>
                            {status === 'expired' ? <Skull className="h-5 w-5 text-red-600" /> :
                             status === 'expiring' ? <AlertTriangle className="h-5 w-5 text-amber-600" /> :
                             <CalendarDays className="h-5 w-5 text-emerald-600" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{name}</h3>
                              <Badge className={config.color}>{config.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">Batch: {batch}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-lg font-bold">{quantity} وحدة</p>
                          <p className="text-xs text-muted-foreground">{warehouse}</p>
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>تاريخ الإنتاج: {formatDate(manufactureDate)}</span>
                          <span>تاريخ الانتهاء: {formatDate(expiryDate)}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${
                            status === 'expired' ? 'bg-red-500' : status === 'expiring' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} style={{ width: `${Math.min(100, Math.max(0, ((expiryDate - Date.now()) / (expiryDate - manufactureDate)) * 100))}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        {status === 'expired' ? (
                          <span className="text-red-600 font-medium">منتهي منذ {Math.abs(daysLeft)} يوم</span>
                        ) : status === 'expiring' ? (
                          <span className="text-amber-600 font-medium">ينتهي بعد {daysLeft} أيام</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">متبقي {daysLeft} يوم</span>
                        )}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="text-xs">تعديل</Button>
                          {status === 'expired' && <Button variant="ghost" size="sm" className="text-xs text-red-500">تخلص</Button>}
                        </div>
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
