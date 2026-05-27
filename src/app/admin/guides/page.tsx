'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  BookOpen, Save, Plus, Trash2, GripVertical, Loader2, Search,
  ChevronUp, ChevronDown, Eye, Pencil, Check, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface GuideSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface GuideData {
  title: string;
  titleEn: string;
  version: string;
  lastUpdated: string;
  sections: GuideSection[];
}

const ROLES = [
  { value: 'cashier', label: 'الكاشير', color: '#F59E0B' },
  { value: 'customer', label: 'العميل', color: '#22C55E' },
  { value: 'manager', label: 'المدير', color: '#3B82F6' },
  { value: 'developer', label: 'المطور', color: '#EF4444' },
];

export default function AdminGuidesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [guides, setGuides] = useState<Record<string, GuideData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState('cashier');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const [editTitle, setEditTitle] = useState('');
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editSectionTitle, setEditSectionTitle] = useState('');
  const [editSectionContent, setEditSectionContent] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role !== 'admin') { toast.error('هذه الصفحة متاحة للمطور فقط'); router.replace('/admin'); }
  }, [isAuthenticated, user, router]);

  useEffect(() => { loadGuides(); }, []);

  const loadGuides = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/guides');
      const data = await res.json();
      if (data.success) setGuides(data.guides || {});
    } catch { toast.error('فشل تحميل الأدلة'); }
    setLoading(false);
  };

  const currentGuide = guides[selectedRole];
  const roleColor = ROLES.find(r => r.value === selectedRole)?.color || '#6B7280';

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEditSection = (section: GuideSection) => {
    setEditingSection(section.id);
    setEditSectionTitle(section.title);
    setEditSectionContent(section.content);
  };

  const saveSection = () => {
    if (!editingSection || !editSectionTitle) return;
    setGuides(prev => {
      const guide = { ...prev[selectedRole] };
      guide.sections = guide.sections.map(s =>
        s.id === editingSection ? { ...s, title: editSectionTitle, content: editSectionContent } : s
      );
      return { ...prev, [selectedRole]: guide };
    });
    setEditingSection(null);
    toast.success('تم تحديث القسم');
  };

  const addSection = () => {
    setGuides(prev => {
      const guide = { ...prev[selectedRole] };
      const newSection: GuideSection = {
        id: `section-${Date.now()}`,
        title: 'قسم جديد',
        content: 'أضف محتوى القسم هنا...',
        order: guide.sections.length,
      };
      guide.sections = [...guide.sections, newSection];
      return { ...prev, [selectedRole]: guide };
    });
    toast.success('تم إضافة القسم');
  };

  const removeSection = (id: string) => {
    setGuides(prev => {
      const guide = { ...prev[selectedRole] };
      guide.sections = guide.sections.filter(s => s.id !== id);
      guide.sections = guide.sections.map((s, i) => ({ ...s, order: i }));
      return { ...prev, [selectedRole]: guide };
    });
    toast.success('تم حذف القسم');
  };

  const saveToSupabase = async () => {
    setSaving(true);
    try {
      const guide = guides[selectedRole];
      const res = await fetch('/api/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          content: {
            ...guide,
            lastUpdated: new Date().toISOString(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('تم حفظ الدليل ومزامنته مع Supabase');
      loadGuides();
    } catch (err: any) {
      toast.error(err.message || 'فشل الحفظ');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">إدارة الأدلة</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">تحرير ومزامنة أدلة المستخدمين</p>
          </div>
        </div>
        <button onClick={saveToSupabase} disabled={saving}
          className="h-9 px-4 rounded-xl text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
          style={{ backgroundColor: roleColor }}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? 'جاري المزامنة...' : 'مزامنة مع Supabase'}
        </button>
      </div>

      {/* Role Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {ROLES.map(r => (
          <button key={r.value} onClick={() => setSelectedRole(r.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              selectedRole === r.value
                ? 'text-white shadow-lg'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
            style={selectedRole === r.value ? { backgroundColor: r.color } : {}}>
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedRole === r.value ? 'white' : r.color }} />
            {r.label}
          </button>
        ))}
      </div>

      {/* Guide Info */}
      {currentGuide && (
        <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">العنوان (عربي)</label>
              <input value={currentGuide.title} onChange={(e) => setGuides(prev => ({ ...prev, [selectedRole]: { ...prev[selectedRole], title: e.target.value } }))}
                className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-3 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">العنوان (إنجليزي)</label>
              <input value={currentGuide.titleEn} onChange={(e) => setGuides(prev => ({ ...prev, [selectedRole]: { ...prev[selectedRole], titleEn: e.target.value } }))}
                className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-3 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">الإصدار</label>
              <input value={currentGuide.version} onChange={(e) => setGuides(prev => ({ ...prev, [selectedRole]: { ...prev[selectedRole], version: e.target.value } }))}
                className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-3 dark:text-white" />
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> الأقسام ({currentGuide.sections.length})
              </h3>
              <button onClick={addSection}
                className="h-8 px-3 rounded-lg text-white text-xs font-medium flex items-center gap-1.5"
                style={{ backgroundColor: roleColor }}>
                <Plus className="h-3 w-3" /> قسم جديد
              </button>
            </div>

            {currentGuide.sections.sort((a, b) => a.order - b.order).map((section, i) => (
              <div key={section.id} className="rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50">
                  <button onClick={() => toggleSection(section.id)} className="flex items-center gap-2 flex-1 text-right">
                    <GripVertical className="h-4 w-4 text-gray-300" />
                    <div className="h-6 w-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: roleColor }}>
                      {i + 1}
                    </div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{section.title}</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEditSection(section)}
                      className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => removeSection(section.id)}
                      className="h-7 w-7 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center">
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <button onClick={() => toggleSection(section.id)}
                      className="h-7 w-7 rounded-lg text-gray-400 flex items-center justify-center">
                      {expandedSections.has(section.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {expandedSections.has(section.id) && (
                  <div className="p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line">{section.content}</p>
                  </div>
                )}

                {editingSection === section.id && (
                  <div className="p-3 border-t border-gray-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 block mb-1">عنوان القسم</label>
                      <input value={editSectionTitle} onChange={(e) => setEditSectionTitle(e.target.value)}
                        className="w-full h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-2 dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 block mb-1">المحتوى</label>
                      <textarea value={editSectionContent} onChange={(e) => setEditSectionContent(e.target.value)} rows={4}
                        className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-2 py-1.5 dark:text-white resize-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveSection}
                        className="h-8 px-4 rounded-lg bg-emerald-500 text-white text-xs font-medium flex items-center gap-1">
                        <Check className="h-3 w-3" /> حفظ
                      </button>
                      <button onClick={() => setEditingSection(null)}
                        className="h-8 px-4 rounded-lg border border-gray-200 dark:border-slate-700 text-xs flex items-center gap-1">
                        <X className="h-3 w-3" /> إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync Status */}
      <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
        <div>
          <p className="text-xs font-bold text-green-700 dark:text-green-300">مزامنة لحظية مع Supabase</p>
          <p className="text-[10px] text-green-600 dark:text-green-400">عند الضغط على "مزامنة"، يتم تحديث جميع الأدلة فورًا لجميع المستخدمين</p>
        </div>
      </div>
    </div>
  );
}
