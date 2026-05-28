'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { employeeService, Employee } from '@/lib/supabase/services/employees';
import { leaveService, Leave } from '@/lib/supabase/services/leaves';

const supabase = createClient();

const roleOptions = ['كاشير', 'مخزني', 'محاسب', 'مندوب توصيل', 'مشرف', 'عامل'];
const deptOptions = ['مبيعات', 'مخازن', 'محاسبة', 'توصيل', 'إداري'];

const leaveTypeConfig = {
  permission: { label: 'إذن', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  vacation: { label: 'إجازة', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  sick: { label: 'مرضي', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const leaveStatusConfig = {
  pending: { label: 'معلق', color: 'text-amber-400 border-amber-500/30' },
  approved: { label: 'موافق', color: 'text-emerald-400 border-emerald-500/30' },
  rejected: { label: 'مرفوض', color: 'text-red-400 border-red-500/30' },
};

export default function ManagerEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'employees' | 'leaves'>('employees');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    employee_code: '', full_name_ar: '', full_name_en: '', phone: '',
    role: '', department: '', salary: '', hire_date: '',
  });
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '', employee_name: '', type: 'permission' as Leave['type'],
    reason: '', from_date: '', to_date: '',
  });

  async function fetchData() {
    const [empRes, leaveRes] = await Promise.all([
      employeeService.getAll(),
      leaveService.getAll(),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (leaveRes.data) setLeaves(leaveRes.data);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('employees-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.is_active).length;
  const pendingLeaves = leaves.filter((l) => l.status === 'pending').length;
  const today = new Date().toISOString().slice(0, 10);
  const onLeaveToday = leaves.filter(
    (l) => l.status === 'approved' && l.from_date <= today && l.to_date >= today
  ).length;

  async function handleSaveEmployee() {
    const { data, error } = await employeeService.create({
      employee_code: employeeForm.employee_code,
      full_name_ar: employeeForm.full_name_ar,
      full_name_en: employeeForm.full_name_en || undefined,
      phone: employeeForm.phone,
      role: employeeForm.role,
      department: employeeForm.department,
      salary: parseFloat(employeeForm.salary),
      hire_date: employeeForm.hire_date,
    });
    if (!error) {
      setShowEmployeeModal(false);
      setEmployeeForm({ employee_code: '', full_name_ar: '', full_name_en: '', phone: '', role: '', department: '', salary: '', hire_date: '' });
    }
  }

  async function handleToggleActive(emp: Employee) {
    await employeeService.toggleActive(emp.id, !emp.is_active);
  }

  async function handleLeaveAction(id: string, status: 'approved' | 'rejected') {
    await leaveService.updateStatus(id, status);
  }

  async function handleSaveLeave() {
    const { data, error } = await leaveService.create(leaveForm);
    if (!error) {
      setShowLeaveModal(false);
      setLeaveForm({ employee_id: '', employee_name: '', type: 'permission', reason: '', from_date: '', to_date: '' });
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-white/[0.06] p-6 shadow-2xl backdrop-blur-3xl transition-transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">👥</span>
            <p className="text-4xl font-black text-white">{totalEmployees.toLocaleString('ar-EG')}</p>
          </div>
          <p className="text-sm font-bold text-gray-400">إجمالي الموظفين</p>
        </div>
        <div className="rounded-[2rem] bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 p-6 shadow-2xl shadow-emerald-500/10 backdrop-blur-3xl transition-transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">✅</span>
            <p className="text-4xl font-black text-emerald-400">{activeEmployees.toLocaleString('ar-EG')}</p>
          </div>
          <p className="text-sm font-bold text-gray-300">النشطين حالياً</p>
        </div>
        <div className="rounded-[2rem] bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 p-6 shadow-2xl shadow-amber-500/10 backdrop-blur-3xl transition-transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">⏳</span>
            <p className="text-4xl font-black text-amber-400">{pendingLeaves.toLocaleString('ar-EG')}</p>
          </div>
          <p className="text-sm font-bold text-gray-300">طلبات إذن معلقة</p>
        </div>
        <div className="rounded-[2rem] bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur-3xl transition-transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">🏖️</span>
            <p className="text-4xl font-black text-blue-400">{onLeaveToday.toLocaleString('ar-EG')}</p>
          </div>
          <p className="text-sm font-bold text-gray-300">في إجازة اليوم</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tabs */}
        <div className="flex md:flex-col gap-2 shrink-0 md:w-64 bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-4 rounded-[2rem] shadow-2xl h-fit overflow-x-auto md:overflow-visible">
          {[
            { key: 'employees' as const, label: 'إدارة الموظفين', icon: '👨‍💼', desc: 'قائمة فريق العمل' },
            { key: 'leaves' as const, label: 'الأذونات والإجازات', icon: '📅', desc: 'طلبات الإجازات' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 w-full whitespace-nowrap md:whitespace-normal shrink-0 md:shrink',
                tab === t.key
                  ? 'bg-emerald-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                  : 'bg-white/[0.02] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              <span className="text-2xl">{t.icon}</span>
              <div className="text-right">
                <p className={cn("text-base font-bold", tab === t.key ? "text-emerald-400" : "")}>{t.label}</p>
                <p className="text-xs text-gray-500 hidden md:block">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1">
          {/* Employees Tab */}
          {tab === 'employees' && (
            <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl overflow-hidden">
              <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-white">فريق العمل</h2>
                  <p className="text-sm text-gray-400 mt-1 font-medium">إدارة بيانات موظفي الفرع</p>
                </div>
                <button
                  onClick={() => setShowEmployeeModal(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
                >
                  <span>+</span>
                  إضافة موظف جديد
                </button>
              </div>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-emerald-500/50">
                  <span className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-400 font-medium">جاري تحميل البيانات...</p>
                </div>
              ) : employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <p className="text-lg font-medium">لا يوجد موظفون مضافون</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-8 px-8">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-gray-400 text-xs">
                        <th className="text-right py-4 px-4 font-bold whitespace-nowrap">كود الموظف</th>
                        <th className="text-right py-4 px-4 font-bold whitespace-nowrap">الاسم</th>
                        <th className="text-right py-4 px-4 font-bold whitespace-nowrap">الوظيفة</th>
                        <th className="text-right py-4 px-4 font-bold whitespace-nowrap">القسم</th>
                        <th className="text-right py-4 px-4 font-bold whitespace-nowrap">رقم الهاتف</th>
                        <th className="text-center py-4 px-4 font-bold whitespace-nowrap">الحالة</th>
                        <th className="text-center py-4 px-4 font-bold whitespace-nowrap">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                          <td className="py-4 px-4 font-mono font-bold text-gray-400 whitespace-nowrap">
                            <span className="bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">{emp.employee_code}</span>
                          </td>
                          <td className="py-4 px-4 font-bold text-white whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm text-white/50 border border-white/[0.1]">
                                {emp.full_name_ar.substring(0, 2)}
                              </div>
                              {emp.full_name_ar}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-300 font-medium whitespace-nowrap">{emp.role}</td>
                          <td className="py-4 px-4 text-gray-300 font-medium whitespace-nowrap">
                            <span className="bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/[0.06] text-xs">{emp.department}</span>
                          </td>
                          <td className="py-4 px-4 text-gray-300 font-mono whitespace-nowrap dir-ltr text-right">{emp.phone}</td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <span className={cn(
                              'text-xs px-4 py-1.5 rounded-xl font-bold border inline-block',
                              emp.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            )}>
                              {emp.is_active ? 'نشط' : 'غير نشط'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleToggleActive(emp)}
                              className={cn(
                                'px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg opacity-0 group-hover:opacity-100',
                                emp.is_active
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white shadow-transparent hover:shadow-red-500/25'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white shadow-transparent hover:shadow-emerald-500/25'
                              )}
                            >
                              {emp.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Leaves Tab */}
          {tab === 'leaves' && (
            <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl">
              <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-white">الأذونات والإجازات</h2>
                  <p className="text-sm text-gray-400 mt-1 font-medium">سجل طلبات الإجازات والغياب</p>
                </div>
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-l from-amber-600 to-amber-500 text-white font-bold hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2"
                >
                  <span>+</span>
                  إضافة إذن أو إجازة
                </button>
              </div>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-emerald-500/50">
                  <span className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-400 font-medium">جاري تحميل البيانات...</p>
                </div>
              ) : leaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <p className="text-lg font-medium">لا توجد طلبات مسجلة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaves.map((lv) => {
                    const typeCfg = leaveTypeConfig[lv.type];
                    const statusCfg = leaveStatusConfig[lv.status];
                    return (
                      <div key={lv.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.04] transition-colors group">
                        <div className="flex items-start gap-5">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm text-white/50 border border-white/[0.1] shrink-0">
                            {lv.employee_name?.substring(0, 2) || 'م'}
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-bold text-white text-lg">{lv.employee_name}</span>
                              <span className={cn('text-xs px-3 py-1.5 rounded-xl border font-bold', typeCfg.color)}>
                                {typeCfg.label}
                              </span>
                              <span className={cn('text-xs px-3 py-1.5 rounded-xl border font-bold', statusCfg.color, lv.status !== 'pending' ? 'bg-white/[0.04]' : 'bg-amber-500/10')}>
                                {statusCfg.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 bg-white/[0.02] px-4 py-2 rounded-xl border border-white/[0.02]">{lv.reason}</p>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-[#111114] w-fit px-3 py-1.5 rounded-lg border border-white/[0.04]">
                              <span>📅</span>
                              <span className="font-mono">{new Date(lv.from_date).toLocaleDateString('ar-EG')}</span>
                              <span className="text-gray-600">←</span>
                              <span className="font-mono">{new Date(lv.to_date).toLocaleDateString('ar-EG')}</span>
                            </div>
                          </div>
                        </div>
                        {lv.status === 'pending' && (
                          <div className="flex flex-wrap gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleLeaveAction(lv.id, 'approved')}
                              className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all text-sm font-bold shadow-lg shadow-transparent hover:shadow-emerald-500/25"
                            >
                              موافقة
                            </button>
                            <button
                              onClick={() => handleLeaveAction(lv.id, 'rejected')}
                              className="px-5 py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all text-sm font-bold shadow-lg shadow-transparent hover:shadow-red-500/25"
                            >
                              رفض
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0A0A0C]/80 backdrop-blur-sm" onClick={() => setShowEmployeeModal(false)} />
          <div className="relative w-full max-w-lg rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] shadow-2xl shadow-emerald-500/10 overflow-hidden" dir="rtl">
            <div className="px-8 py-6 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">إضافة موظف جديد</h3>
                  <p className="text-sm text-gray-400">إدخال بيانات الموظف الأساسية</p>
                </div>
              </div>
              <button onClick={() => setShowEmployeeModal(false)} className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">كود الموظف</label>
                  <input
                    type="text" placeholder="مثال: EMP-001"
                    value={employeeForm.employee_code}
                    onChange={(e) => setEmployeeForm((f) => ({ ...f, employee_code: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">رقم الهاتف</label>
                  <input
                    type="text" placeholder="01X XXXX XXXX" dir="ltr"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">الاسم بالعربية</label>
                <input
                  type="text" placeholder="الاسم الرباعي"
                  value={employeeForm.full_name_ar}
                  onChange={(e) => setEmployeeForm((f) => ({ ...f, full_name_ar: e.target.value }))}
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">الاسم بالإنجليزية (اختياري)</label>
                <input
                  type="text" placeholder="Full Name" dir="ltr"
                  value={employeeForm.full_name_en}
                  onChange={(e) => setEmployeeForm((f) => ({ ...f, full_name_en: e.target.value }))}
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">الوظيفة</label>
                  <select
                    value={employeeForm.role}
                    onChange={(e) => setEmployeeForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all [&>option]:bg-[#111114]"
                  >
                    <option value="">اختر الوظيفة...</option>
                    {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">القسم</label>
                  <select
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm((f) => ({ ...f, department: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all [&>option]:bg-[#111114]"
                  >
                    <option value="">اختر القسم...</option>
                    {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">الراتب الأساسي</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">ج.م</span>
                    <input
                      type="number" placeholder="0.00"
                      value={employeeForm.salary}
                      onChange={(e) => setEmployeeForm((f) => ({ ...f, salary: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">تاريخ التعيين</label>
                  <input
                    type="date"
                    value={employeeForm.hire_date}
                    onChange={(e) => setEmployeeForm((f) => ({ ...f, hire_date: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-8 pt-4 flex gap-3 border-t border-white/[0.06] bg-white/[0.02]">
              <button onClick={() => setShowEmployeeModal(false)} className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold">إلغاء الأمر</button>
              <button onClick={handleSaveEmployee} className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/25">حفظ بيانات الموظف</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0A0A0C]/80 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)} />
          <div className="relative w-full max-w-md rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] shadow-2xl shadow-amber-500/10 overflow-hidden" dir="rtl">
            <div className="px-8 py-6 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">تسجيل إذن أو إجازة</h3>
                  <p className="text-sm text-gray-400">طلب اعتماد إجازة للموظف</p>
                </div>
              </div>
              <button onClick={() => setShowLeaveModal(false)} className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">اسم الموظف</label>
                <input
                  type="text" placeholder="اسم الموظف"
                  value={leaveForm.employee_name}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, employee_name: e.target.value }))}
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">نوع الطلب</label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, type: e.target.value as Leave['type'] }))}
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all [&>option]:bg-[#111114]"
                >
                  <option value="permission">إذن تأخير / انصراف</option>
                  <option value="vacation">إجازة اعتيادية</option>
                  <option value="sick">إجازة مرضية</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">من تاريخ</label>
                  <input
                    type="date"
                    value={leaveForm.from_date}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, from_date: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">إلى تاريخ</label>
                  <input
                    type="date"
                    value={leaveForm.to_date}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, to_date: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">السبب أو ملاحظات</label>
                <input
                  type="text" placeholder="سبب الإجازة..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>
            
            <div className="p-8 pt-4 flex gap-3 border-t border-white/[0.06] bg-white/[0.02]">
              <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold">إلغاء الأمر</button>
              <button onClick={handleSaveLeave} className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-amber-600 to-amber-500 text-white font-bold hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25">حفظ وإرسال للاعتماد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
