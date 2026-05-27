'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, Mic, Printer, FileText, BarChart3, CheckCircle, X, Code, Camera } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { normalizeArabic } from '@/lib/arabic-normalize';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  keywords: string[];
  roles: string[];
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (commandId: string) => void;
  extraCommands?: Command[];
}

const baseCommands: Command[] = [
  {
    id: 'coding',
    label: 'تكويد صنف',
    description: 'إضافة صنف جديد بالصوت — خطوة بخطوة',
    icon: Code,
    keywords: ['كود', 'تكويد', 'اضافة', 'جديد', 'صنف', 'منتج', 'تكود', 'كودينج', 'باركود'],
    roles: ['admin', 'manager', 'cashier'],
    action: () => {},
  },
  {
    id: 'audit',
    label: 'جرد صنف',
    description: 'بحث صوتي أو يدوي — إدخال الكمية الفعلية والمطابقة',
    icon: BarChart3,
    keywords: ['جرد', 'عده', 'مخزون', 'audit', 'تسوية', 'كشف', 'رصيد'],
    roles: ['admin', 'manager', 'cashier'],
    action: () => {},
  },
  {
    id: 'label',
    label: 'طباعة لاصقة',
    description: 'طباعة باركود ولاصقة سعر لمنتج',
    icon: Printer,
    keywords: ['طباعة', 'لاصقة', 'باركود', 'ليبل', 'ملصق', 'سعر', 'برنت', 'label', 'print'],
    roles: ['admin', 'manager', 'cashier'],
    action: () => {},
  },
  {
    id: 'productcard',
    label: 'بطاقة المنتج',
    description: 'عرض كشف شامل لصنف — أرصدة، أسعار، دوران',
    icon: FileText,
    keywords: ['بطاقة', 'كشف', 'product', 'passport', 'معلومات', 'تفاصيل', 'تقرير'],
    roles: ['admin', 'manager', 'cashier'],
    action: () => {},
  },
  {
    id: 'approve',
    label: 'اعتماد التسويات',
    description: 'مراجعة واعتماد مسودات التكويد والتسويات المخزنية',
    icon: CheckCircle,
    keywords: ['اعتماد', 'تسوية', 'مسودة', 'موافقة', 'approve', 'منتظر', 'تفعيل'],
    roles: ['admin', 'manager'],
    action: () => {},
  },
  {
    id: 'ocr',
    label: 'مسح كشف جرد',
    description: 'تصوير كشف جرد مكتوب بخط اليد ومعالجته',
    icon: Camera,
    keywords: ['مسح', 'تصوير', 'كشف', 'ocr', 'كاميرا', 'جرد', 'ورق', 'scan'],
    roles: ['admin', 'manager', 'cashier'],
    action: () => {},
  },
];

export function CommandPalette({ isOpen, onClose, onCommand, extraCommands }: CommandPaletteProps) {
  const user = useAuthStore((s) => s.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  const allCommands = [...baseCommands, ...(extraCommands || [])];

  const availableCommands = allCommands.filter(
    (cmd) => user && (cmd.roles.includes(user.role) || user.role === 'admin')
  );

  const filtered = query.trim()
    ? availableCommands.filter((cmd) => {
        const q = normalizeArabic(query);
        return (
          normalizeArabic(cmd.label).includes(q) ||
          cmd.keywords.some((k) => normalizeArabic(k).includes(q))
        );
      })
    : availableCommands;

  const display = filtered.slice(0, 8);

  const handleSelect = useCallback(
    (cmd: Command) => {
      setRecentCommands((prev) => {
        const next = [cmd.id, ...prev.filter((id) => id !== cmd.id)].slice(0, 5);
        return next;
      });
      onCommand(cmd.id);
      setQuery('');
      onClose();
    },
    [onCommand, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, display.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && display[selectedIndex]) {
      handleSelect(display[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const recentCommandsList = availableCommands.filter((cmd) => recentCommands.includes(cmd.id));

  return (
    <div className="fixed inset-0 z-[400] flex items-start justify-center pt-[15vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-lg mx-4 bg-[#0A0A0C] border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden backdrop-blur-[25px] shadow-2xl"
        style={{ backgroundColor: 'rgba(10,10,12,0.98)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <Search size={18} className="text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ابحث عن أمر... (كود، جرد، طباعة، اعتماد)"
            className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-gray-600"
            dir="auto"
          />
          {query && (
            <button onClick={() => setQuery('')} className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
              <X size={12} className="text-gray-400" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 h-6 rounded-md bg-white/[0.06] text-[10px] text-gray-500 font-mono">
            <span>ESC</span>
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto p-2">
          {display.length > 0 ? (
            <div className="space-y-0.5">
              {display.map((cmd, i) => (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-right',
                    i === selectedIndex
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'hover:bg-white/[0.04] border border-transparent'
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                    i === selectedIndex ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.06] text-gray-400'
                  )}>
                    <cmd.icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className={cn(
                      'text-sm font-medium transition-colors',
                      i === selectedIndex ? 'text-emerald-300' : 'text-white'
                    )}>
                      {cmd.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{cmd.description}</p>
                  </div>
                  {cmd.roles.length === 1 && cmd.roles[0] !== user?.role && (
                    <span className="text-[10px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-md">
                      {cmd.roles[0]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <Search size={24} className="text-gray-600" />
              </div>
              <p className="text-sm text-gray-500">لا توجد نتائج لـ "{query}"</p>
            </div>
          )}
        </div>

        {/* Recent commands */}
        {!query && recentCommandsList.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-[10px] text-gray-600 mb-2 px-1">الأكثر استخداماً</p>
            <div className="flex flex-wrap gap-1.5">
              {recentCommandsList.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-white/[0.06] text-xs text-gray-400 hover:bg-white/[0.1] hover:text-white transition-colors"
                >
                  <cmd.icon size={12} />
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-white/[0.04]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <kbd className="inline-flex items-center px-1.5 h-5 rounded bg-white/[0.06] text-[10px] text-gray-500 font-mono">↑↓</kbd>
              <span className="text-[10px] text-gray-600">للتحرك</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="inline-flex items-center px-1.5 h-5 rounded bg-white/[0.06] text-[10px] text-gray-500 font-mono">↵</kbd>
              <span className="text-[10px] text-gray-600">للاختيار</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="inline-flex items-center px-1.5 h-5 rounded bg-white/[0.06] text-[10px] text-gray-500 font-mono">ESC</kbd>
              <span className="text-[10px] text-gray-600">للإغلاق</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
