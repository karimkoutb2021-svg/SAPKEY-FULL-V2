'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { Users, Plus, Search, Download, Calendar, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function PayrollPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const ch = supabase.channel('acct-employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadData() {
    try {
      const { data: emps } = await supabase.from('employees').select('*');
      if (emps && emps.length > 0) {
        setEmployees(emps);
      } else {
        // Fallback demo
        setEmployees([
          { id: '1', name: 'أحمد محمد', role: 'مدير', base_salary: 8000, allowances: 1500, deductions: 500, net_salary: 9000, department: 'إدارة', status: 'active' },
          { id: '2', name: 'محمد علي', role: 'كاشير', base_salary: 3500, allowances: 500, deductions: 200, net_salary: 3800, department: 'مبيعات', status: 'active' },
          { id: '3', name: 'خالد السلمي', role: 'مخازن', base_salary: 4000, allowances: 500, deductions: 250, net_salary: 4250, department: 'مستودعات', status: 'active' },
          { id: '4', name: 'سارة أحمد', role: 'محاسبة', base_salary: 5500, allowances: 1000, deductions: 300, net_salary: 6200, department: 'مالية', status: 'active' },
        ]);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const departments = [...new Set(employees.map((e: any) => e.department || 'أخرى'))];
  const filtered = employees.filter((e: any) => {
    const ms = !search || (e.name || '').includes(search) || (e.role || '').includes(search) || (e.department || '').includes(search);
    const md = deptFilter === 'all' || e.department === deptFilter;
    return ms && md;
  });

  const activeEmps = employees.filter((e: any) => e.status === 'active');
  const totalPayroll = activeEmps.reduce((s: number, e: any) => s + (e.net_salary || e.netSalary || 0), 0);

  return (
    <PageTransition>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-4" dir="rtl">
        <div className="flex items-center flex-wrap gap-2 justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="text-lg md:text-2xl font-bold">الرواتب</h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">إدارة رواتب الموظفين</p>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <button onClick={() => toast.success('تم التصدير')}
              className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg border text-[10px] md:text-xs flex items-center gap-1 hover:bg-accent transition-colors">
              <Download className="h-3 w-3 md:h-3.5 md:w-3.5" /> تصدير
            </button>
            <button onClick={() => toast.success('تم صرف الرواتب')}
              className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg text-white text-[10px] md:text-xs flex items-center gap-1"
              style={{ backgroundColor: 'var(--primary, #22C55E)' }}>
              <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" /> صرف الرواتب
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">إجمالي الموظفين</p><p className="text-sm md:text-2xl font-bold">{activeEmps.length}</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">إجمالي الرواتب</p><p className="text-sm md:text-2xl font-bold text-primary tabular-nums">{formatCurrency(totalPayroll)}</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">متوسط الراتب</p><p className="text-sm md:text-2xl font-bold tabular-nums">{formatCurrency(activeEmps.length > 0 ? Math.round(totalPayroll / activeEmps.length) : 0)}</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">تاريخ الصرف القادم</p><p className="text-xs md:text-lg font-bold">{formatDate(Date.now() + 86400000 * 15)}</p></CardContent></Card>
            </div>

            <div className="flex gap-1.5 md:gap-2 flex-wrap">
              <div className="flex-1 relative min-w-[120px]">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                <input type="text" placeholder="بحث..." className="w-full h-8 md:h-10 rounded-lg border pr-8 pl-2.5 text-[10px] md:text-sm"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-1 overflow-x-auto">
                <button onClick={() => setDeptFilter('all')}
                  className={`h-8 md:h-10 px-2 md:px-3 rounded-lg text-[9px] md:text-xs border shrink-0 transition-all ${
                    deptFilter === 'all' ? 'bg-foreground text-background' : 'hover:bg-accent'
                  }`}>الكل</button>
                {departments.map((d) => (
                  <button key={d} onClick={() => setDeptFilter(d)}
                    className={`h-8 md:h-10 px-2 md:px-3 rounded-lg text-[9px] md:text-xs border shrink-0 transition-all ${
                      deptFilter === d ? 'bg-foreground text-background' : 'hover:bg-accent'
                    }`}>{d}</button>
                ))}
              </div>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] md:text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">الموظف</th>
                        <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">القسم</th>
                        <th className="text-left p-2 md:p-3 font-medium text-muted-foreground">الأساسي</th>
                        <th className="text-left p-2 md:p-3 font-medium text-muted-foreground">البدلات</th>
                        <th className="text-left p-2 md:p-3 font-medium text-muted-foreground">الخصم</th>
                        <th className="text-left p-2 md:p-3 font-medium text-muted-foreground">الصافي</th>
                        <th className="text-center p-2 md:p-3 font-medium text-muted-foreground">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">لا يوجد موظفين</td></tr>
                      )}
                      {filtered.map((emp: any) => (
                        <tr key={emp.id} className="border-b hover:bg-accent/50 transition-colors">
                          <td className="p-2 md:p-3">
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-primary/10 flex items-center justify-center text-[9px] md:text-xs font-bold text-primary">
                                {(emp.name || '?')[0]}
                              </div>
                              <div>
                                <p className="text-[10px] md:text-sm font-medium">{emp.name}</p>
                                <p className="text-[8px] md:text-xs text-muted-foreground">{emp.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 md:p-3 text-[10px] md:text-sm">{emp.department || '-'}</td>
                          <td className="p-2 md:p-3 text-left font-medium tabular-nums">{formatCurrency(emp.base_salary || emp.baseSalary || 0)}</td>
                          <td className="p-2 md:p-3 text-left font-medium tabular-nums text-emerald-600">{formatCurrency(emp.allowances || 0)}</td>
                          <td className="p-2 md:p-3 text-left font-medium tabular-nums text-red-600">{formatCurrency(emp.deductions || 0)}</td>
                          <td className="p-2 md:p-3 text-left font-bold tabular-nums">{formatCurrency(emp.net_salary || emp.netSalary || 0)}</td>
                          <td className="p-2 md:p-3 text-center">
                            <Badge className={`${emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'} border-0 text-[9px] md:text-xs`}>
                              {emp.status === 'active' ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-muted/30">
                        <td colSpan={5} className="p-2 md:p-3 text-left font-bold text-[10px] md:text-sm">الإجمالي</td>
                        <td className="p-2 md:p-3 text-left font-bold tabular-nums">
                          {formatCurrency(filtered.reduce((s: number, e: any) => s + (e.net_salary || e.netSalary || 0), 0))}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTransition>
  );
}
