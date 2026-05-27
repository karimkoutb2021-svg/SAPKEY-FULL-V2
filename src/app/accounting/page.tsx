'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';
import { BackButton } from '@/components/layout/back-button';
import { motion } from 'framer-motion';
import { demoAction } from '@/components/demo-handler';
import {
  Calculator, TrendingUp, TrendingDown, BookOpen, Receipt, Wallet,
  Building2, BarChart3, Percent, Users, ArrowRight,
  FileText, ScrollText} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

import { useAuthStore } from '@/lib/store/auth-store';

const allModules = [
  { title: 'شجرة الحسابات', titleAr: 'شجرة الحسابات', href: '/accounting/chart', icon: BookOpen, desc: 'دليل الحسابات المحاسبي', color: 'bg-blue-100 text-blue-600', count: '50+ حساب' },
  { title: 'اليومية', titleAr: 'اليومية', href: '/accounting/journal', icon: ScrollText, desc: 'قيود اليومية والحسابات', color: 'bg-indigo-100 text-indigo-600', count: '125 قيد' },
  { title: 'المصروفات', titleAr: 'المصروفات', href: '/accounting/expenses', icon: TrendingDown, desc: 'تسجيل وتتبع المصروفات', color: 'bg-red-100 text-red-600', count: '32 معاملة' },
  { title: 'المصروفات النثرية', titleAr: 'المصروفات النثرية', href: '/accounting/petty-cash', icon: Wallet, desc: 'مصروفات صغيرة وطارئة', color: 'bg-amber-100 text-amber-600', count: '15 طلب' },
  { title: 'الخزينة', titleAr: 'الخزينة', href: '/accounting/treasury', icon: Wallet, desc: 'إدارة النقد والخزينة', color: 'bg-emerald-100 text-emerald-600', count: '28,500 ج.م' },
  { title: 'البنوك', titleAr: 'البنوك', href: '/accounting/banks', icon: Building2, desc: 'الحسابات البنكية والتسوية', color: 'bg-cyan-100 text-cyan-600', count: '3 بنوك' },
  { title: 'الأرباح والخسائر', titleAr: 'الأرباح والخسائر', href: '/accounting/profit-loss', icon: TrendingUp, desc: 'قائمة الدخل', color: 'bg-purple-100 text-purple-600', count: '+12.5%' },
  { title: 'الضرائب', titleAr: 'الضرائب', href: '/accounting/taxes', icon: Percent, desc: 'إدارة ضريبة القيمة المضافة', color: 'bg-orange-100 text-orange-600', count: '15% VAT' },
  { title: 'التقارير المالية', titleAr: 'التقارير المالية', href: '/accounting/reports', icon: BarChart3, desc: 'ميزانية، دخل، تدفقات نقدية', color: 'bg-teal-100 text-teal-600', count: '6 تقارير' },
  { title: 'الرواتب', titleAr: 'الرواتب', href: '/accounting/payroll', icon: Users, desc: 'إدارة رواتب الموظفين', color: 'bg-rose-100 text-rose-600', count: '12 موظف' },
];

export default function AccountingPage() {
  const auth = useAuthStore();
  const isPurchase = auth.isRole('purchase');
  const modules = isPurchase
    ? allModules.filter((m) => ['/accounting/chart', '/accounting/petty-cash', '/accounting/expenses'].includes(m.href))
    : allModules;
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">النظام المحاسبي</h1>
            <p className="text-muted-foreground">النظام المحاسبي المتكامل - قيود، ميزانية، تقارير مالية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <div><p className="text-xl font-bold">{formatCurrency(452300)}</p><p className="text-xs text-muted-foreground">إيرادات هذا الشهر</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <div><p className="text-xl font-bold">{formatCurrency(128500)}</p><p className="text-xs text-muted-foreground">مصروفات هذا الشهر</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-blue-500" />
                <div><p className="text-xl font-bold">{formatCurrency(323800)}</p><p className="text-xs text-muted-foreground">صافي الربح</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Percent className="h-5 w-5 text-amber-500" />
                <div><p className="text-xl font-bold">15%</p><p className="text-xs text-muted-foreground">نسبة ضريبة القيمة المضافة</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href}>
                <motion.div whileHover={{ y: -2 }} className="p-5 rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${mod.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold">{mod.titleAr}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{mod.desc}</p>
                  <p className="text-xs text-muted-foreground mt-2">{mod.count}</p>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
