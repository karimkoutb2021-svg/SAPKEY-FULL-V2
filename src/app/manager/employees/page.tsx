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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <p className="text-sm text-gray-400">إجمالي الموظفين</p>
          <p className="text-2xl font-bold mt-1">{totalEmployees.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <p className="text-sm text-gray-400">النشطين حالياً</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{activeEmployees.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <p className="text-sm text-gray-400">طلبات إذن معلقة</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{pendingLeaves.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <p className="text-sm text-gray-400">في إجازة اليوم</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{onLeaveToday.toLocaleString('ar-EG')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'employees' as const, label: 'الموظفين' },
          { key: 'leaves' as const, label: 'الأذونات والإجازات' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-5 py-2 rounded-xl text-sm transition-colors',
              tab === t.key
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Employees Tab */}
      {tab === 'employees' && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">الموظفين</h2>
            <button
              onClick={() => setShowEmployeeModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm"
            >
              إضافة موظف
            </button>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا يوجد موظفون</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-gray-400">
                    <th className="text-right py-3 px-2 font-medium">الكود</th>
                    <th className="text-right py-3 px-2 font-medium">الاسم</th>
                    <th className="text-right py-3 px-2 font-medium">الوظيفة</th>
                    <th className="text-right py-3 px-2 font-medium">القسم</th>
                    <th className="text-right py-3 px-2 font-medium">الهاتف</th>
                    <th className="text-center py-3 px-2 font-medium">الحالة</th>
                    <th className="text-center py-3 px-2 font-medium">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-2 font-mono text-xs text-gray-400">{emp.employee_code}</td>
                      <td className="py-3 px-2 font-medium">{emp.full_name_ar}</td>
                      <td className="py-3 px-2 text-gray-400">{emp.role}</td>
                      <td className="py-3 px-2 text-gray-400">{emp.department}</td>
                      <td className="py-3 px-2 text-gray-400">{emp.phone}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full border',
                          emp.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        )}>
                          {emp.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => handleToggleActive(emp)}
                          className={cn(
                            'px-3 py-1 rounded-lg text-xs transition-colors',
                            emp.is_active
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          )}
                        >
                          {emp.is_active ? 'تعطيل' : 'تفعيل'}
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
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">الأذونات والإجازات</h2>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm"
            >
              إضافة إذن
            </button>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد طلبات</div>
          ) : (
            <div className="space-y-3">
              {leaves.map((lv) => {
                const typeCfg = leaveTypeConfig[lv.type];
                const statusCfg = leaveStatusConfig[lv.status];
                return (
                  <div key={lv.id} className="rounded-xl bg-white/[0.04] p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{lv.employee_name}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', typeCfg.color)}>
                          {typeCfg.label}
                        </span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{lv.reason}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(lv.from_date).toLocaleDateString('ar-EG')} → {new Date(lv.to_date).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    {lv.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleLeaveAction(lv.id, 'approved')}
                          className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm"
                        >
                          موافقة
                        </button>
                        <button
                          onClick={() => handleLeaveAction(lv.id, 'rejected')}
                          className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
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

      {/* Add Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">إضافة موظف</h3>
            <input
              type="text" placeholder="كود الموظف"
              value={employeeForm.employee_code}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, employee_code: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <input
              type="text" placeholder="الاسم بالعربية"
              value={employeeForm.full_name_ar}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, full_name_ar: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <input
              type="text" placeholder="الاسم بالإنجليزية (اختياري)"
              value={employeeForm.full_name_en}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, full_name_en: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <input
              type="text" placeholder="رقم الهاتف"
              value={employeeForm.phone}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <select
              value={employeeForm.role}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            >
              <option value="">الوظيفة</option>
              {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={employeeForm.department}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            >
              <option value="">القسم</option>
              {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              type="number" placeholder="الراتب"
              value={employeeForm.salary}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, salary: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <input
              type="date" placeholder="تاريخ التعيين"
              value={employeeForm.hire_date}
              onChange={(e) => setEmployeeForm((f) => ({ ...f, hire_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowEmployeeModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={handleSaveEmployee} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">إضافة إذن</h3>
            <input
              type="text" placeholder="اسم الموظف"
              value={leaveForm.employee_name}
              onChange={(e) => setLeaveForm((f) => ({ ...f, employee_name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <select
              value={leaveForm.type}
              onChange={(e) => setLeaveForm((f) => ({ ...f, type: e.target.value as Leave['type'] }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            >
              <option value="permission">إذن</option>
              <option value="vacation">إجازة</option>
              <option value="sick">مرضي</option>
            </select>
            <input
              type="text" placeholder="السبب"
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <input
              type="date" placeholder="من تاريخ"
              value={leaveForm.from_date}
              onChange={(e) => setLeaveForm((f) => ({ ...f, from_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <input
              type="date" placeholder="إلى تاريخ"
              value={leaveForm.to_date}
              onChange={(e) => setLeaveForm((f) => ({ ...f, to_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={handleSaveLeave} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium">حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
