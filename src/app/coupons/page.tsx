'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { Percent, Plus, Copy, Search, Filter } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useTableSync } from '@/hooks/use-realtime-sync';

export default function CouponsPage() {
  const { data: coupons, loading } = useTableSync<any>('coupons');

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
            <h1 className="text-2xl font-bold">كوبونات الخصم</h1>
            <p className="text-muted-foreground">إدارة أكواد الخصم والعروض الترويجية</p>
          </div>
          <Button><Plus className="h-4 w-4 ml-1" /> إضافة كوبون</Button>
        </div>

        {(!coupons || coupons.length === 0) ? (
          <div className="text-center py-12 text-muted-foreground">لا توجد بيانات</div>
        ) : (
          <div className="space-y-3">
            {(coupons || []).map((coupon: any) => {
              const isActive = coupon.is_active ?? coupon.active ?? true;
              const name = coupon.name_ar || coupon.name || '';
              const minPurchase = coupon.min_purchase ?? coupon.minPurchase ?? 0;
              const maxDiscount = coupon.max_discount ?? coupon.maxDiscount ?? 0;
              const usageCount = coupon.usage_count ?? coupon.usage ?? 0;
              const usageLimit = coupon.usage_limit ?? coupon.limit ?? 0;
              return (
              <Card key={coupon.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <Percent className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 rounded bg-muted font-mono text-sm font-bold tracking-wider">{coupon.code}</code>
                          <Badge variant={isActive ? 'success' : 'secondary'}>{isActive ? 'نشط' : 'منتهي'}</Badge>
                        </div>
                        <p className="text-sm mt-1">{name} • {coupon.type === 'percentage' ? `${coupon.value}%` : formatCurrency(coupon.value)} خصم</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {minPurchase > 0 && <span>الحد الأدنى: {formatCurrency(minPurchase)}</span>}
                          {maxDiscount > 0 && <span>الحد الأقصى: {formatCurrency(maxDiscount)}</span>}
                          <span>استخدام: {usageCount}/{usageLimit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm"><Copy className="h-3 w-3 ml-1" /> نسخ</Button>
                      <Button variant="outline" size="sm">تعديل</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
