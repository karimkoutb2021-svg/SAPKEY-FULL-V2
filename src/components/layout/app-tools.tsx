'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Download, Upload, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

export function RefreshButton() {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleRefresh = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.update());
      });
    }
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={handleRefresh}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all"
        title="تحديث التطبيق"
      >
        <RefreshCw className="h-4 w-4 text-gray-500" />
      </button>
      <AnimatePresence>
        {showTooltip && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-full mt-1 right-1/2 translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-50 shadow-lg"
          >
            تحديث التطبيق
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BackupButton() {
  const handleBackup = () => {
    try {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try { data[key] = JSON.parse(localStorage.getItem(key) || '{}'); }
          catch { data[key] = localStorage.getItem(key); }
        }
      }
      const sessionData: Record<string, any> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          try { sessionData[key] = JSON.parse(sessionStorage.getItem(key) || '{}'); }
          catch { sessionData[key] = sessionStorage.getItem(key); }
        }
      }

      const backup = {
        version: '2.0',
        date: new Date().toISOString(),
        data,
        sessionData,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toLocaleString('ar-EG').replace(/[/,:]/g, '-').replace(/\s/g, '_');
      a.href = url;
      a.download = `supermarket_backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم حفظ النسخة الاحتياطية');
    } catch {
      toast.error('فشل إنشاء النسخة الاحتياطية');
    }
  };

  return (
    <button
      onClick={handleBackup}
      className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all"
      title="نسخ احتياطي"
    >
      <Download className="h-4 w-4 text-gray-500" />
    </button>
  );
}

export function RestoreButton() {
  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const backup = JSON.parse(ev.target?.result as string);
          if (!backup.version || !backup.data) {
            toast.error('ملف غير صالح');
            return;
          }
          Object.entries(backup.data).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
          });
          toast.success('تم استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة');
          setTimeout(() => window.location.reload(), 1500);
        } catch {
          toast.error('فشل استعادة البيانات');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <button
      onClick={handleRestore}
      className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all"
      title="استيراد نسخة احتياطية"
    >
      <Upload className="h-4 w-4 text-gray-500" />
    </button>
  );
}

export function OnlineIndicator() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {isOnline ? 'متصل' : 'غير متصل'}
    </div>
  );
}
