'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { taskService, Task } from '@/lib/supabase/services/tasks';

const supabase = createClient();

const priorityConfig = {
  urgent: { label: 'عاجل', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  normal: { label: 'عادي', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  low: { label: 'بسيط', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

const statusLabels: Record<string, string> = {
  pending: 'لم تبدأ',
  in_progress: 'قيد التنفيذ',
  completed: 'تمت',
};

const statusColumns = [
  { key: 'pending' as const, title: 'لم تبدأ' },
  { key: 'in_progress' as const, title: 'قيد التنفيذ' },
  { key: 'completed' as const, title: 'تمت' },
];

const filterPills = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'معلقة' },
  { key: 'in_progress', label: 'قيد التنفيذ' },
  { key: 'completed', label: 'مكتملة' },
];

function getNextStatus(status: Task['status']): Task['status'] | null {
  if (status === 'pending') return 'in_progress';
  if (status === 'in_progress') return 'completed';
  return null;
}

export default function ManagerTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    assigned_to: '', assigned_to_name: '', title: '', description: '',
    priority: 'normal' as Task['priority'], due_date: '',
  });

  async function fetchTasks() {
    const { data } = await taskService.getAll();
    if (data) setTasks(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchTasks();
    const channel = supabase
      .channel('tasks-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const totalTasks = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const now = new Date();
  const overdueCount = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed'
  ).length;

  async function handleCreate() {
    const { error } = await taskService.create({
      assigned_to: form.assigned_to,
      assigned_to_name: form.assigned_to_name,
      assigned_by: 'manager',
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      due_date: form.due_date || undefined,
    });
    if (!error) {
      setShowModal(false);
      setForm({ assigned_to: '', assigned_to_name: '', title: '', description: '', priority: 'normal', due_date: '' });
    }
  }

  async function handleAdvance(task: Task) {
    const next = getNextStatus(task.status);
    if (next) await taskService.updateStatus(task.id, next);
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <p className="text-sm text-gray-400">إجمالي المهام</p>
          <p className="text-2xl font-bold mt-1">{totalTasks.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <p className="text-sm text-gray-400">قيد التنفيذ</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{inProgressCount.toLocaleString('ar-EG')}</p>
        </div>
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5">
          <p className="text-sm text-red-400/70">متأخرة</p>
          <p className="text-2xl font-bold mt-1 text-red-400">{overdueCount.toLocaleString('ar-EG')}</p>
        </div>
      </div>

      {/* Actions + Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm"
        >
          إضافة مهمة
        </button>
        <div className="flex gap-2 flex-wrap">
          {filterPills.map((p) => (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm transition-colors',
                filter === p.key
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task Columns */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusColumns.map((col) => {
            const columnTasks = filtered.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 pb-3 border-b border-white/[0.06]">
                  {col.title} ({columnTasks.length.toLocaleString('ar-EG')})
                </h3>
                <div className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <p className="text-center py-6 text-gray-500 text-sm">لا توجد مهام</p>
                  ) : (
                    columnTasks.map((task) => {
                      const priCfg = priorityConfig[task.priority];
                      const isOverdue = task.due_date && new Date(task.due_date) < now && task.status !== 'completed';
                      return (
                        <div key={task.id} className="rounded-xl bg-white/[0.04] p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm">{task.title}</p>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full border shrink-0', priCfg.color)}>
                              {priCfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">إلى: {task.assigned_to_name}</p>
                          {task.due_date && (
                            <p className={cn('text-xs', isOverdue ? 'text-red-400' : 'text-gray-500')}>
                              {isOverdue ? 'متأخرة - ' : ''}
                              {new Date(task.due_date).toLocaleDateString('ar-EG')}
                            </p>
                          )}
                          {getNextStatus(task.status) && (
                            <button
                              onClick={() => handleAdvance(task)}
                              className="w-full mt-1 py-2 rounded-lg bg-white/[0.06] text-xs text-gray-300 hover:bg-white/[0.1] transition-colors"
                            >
                              نقل إلى {statusLabels[getNextStatus(task.status)!]}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">إضافة مهمة</h3>
            <input
              type="text" placeholder="الموظف المسؤول"
              value={form.assigned_to_name}
              onChange={(e) => setForm((f) => ({ ...f, assigned_to_name: e.target.value, assigned_to: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <input
              type="text" placeholder="عنوان المهمة"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <textarea
              placeholder="وصف المهمة (اختياري)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm min-h-[80px]"
            />
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Task['priority'] }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            >
              <option value="urgent">عاجل</option>
              <option value="normal">عادي</option>
              <option value="low">بسيط</option>
            </select>
            <input
              type="date" placeholder="تاريخ التسليم"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
              <button onClick={handleCreate} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium">حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
