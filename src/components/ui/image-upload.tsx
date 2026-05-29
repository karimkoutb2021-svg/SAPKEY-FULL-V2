'use client';

import { useState, useRef } from 'react';
import { Image, Upload, X, Link as LinkIcon, Loader2, Check } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  width?: number;
  height?: number;
  maxSizeMB?: number;
  previewSize?: string;
}

export function ImageUpload({ value, onChange, label, width, height, maxSizeMB = 2, previewSize = 'h-16 w-16' }: ImageUploadProps) {
  const [mode, setMode] = useState<'url' | 'upload'>(value && !value.startsWith('data:') ? 'url' : 'upload');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`الحجم الأقصى ${maxSizeMB}MB`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('الملف يجب أن يكون صورة');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        onChange(result);
        setUploading(false);
      };
      reader.onerror = () => {
        setError('فشل قراءة الملف');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('فشل رفع الصورة');
      setUploading(false);
    }
  };

  const sizeText = width && height ? `${width}×${height}px` : width ? `عرض ${width}px` : height ? `ارتفاع ${height}px` : '';
  const formatHint = 'PNG, JPG, SVG, WebP';

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block mb-1.5">{label}</label>

      {/* Mode Toggle */}
      <div className="flex items-center gap-1 mb-2">
        <button onClick={() => setMode('url')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${mode === 'url' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}>
          <LinkIcon className="h-3 w-3 inline ml-1" /> رابط
        </button>
        <button onClick={() => setMode('upload')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${mode === 'upload' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}>
          <Upload className="h-3 w-3 inline ml-1" /> رفع
        </button>
      </div>

      {/* Size & Format Info */}
      {(sizeText || formatHint) && (
        <div className="flex items-center gap-2 mb-2 text-[9px] text-gray-400">
          {sizeText && <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800">{sizeText}</span>}
          {formatHint && <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800">{formatHint}</span>}
          <span>الحد الأقصى: {maxSizeMB}MB</span>
        </div>
      )}

      {mode === 'url' ? (
        <div className="flex items-center gap-2">
          <input value={value} onChange={(e) => { onChange(e.target.value); setError(''); }} placeholder="https://..." dir="ltr"
            className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 dark:text-white font-mono" />
          {value && (
            <button onClick={() => onChange('')} className="h-10 w-10 rounded-xl border border-gray-200 dark:border-slate-700 text-red-500 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="h-10 px-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 text-gray-500 text-xs flex items-center gap-2 hover:border-gray-400 dark:hover:border-slate-500 transition-all disabled:opacity-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'جاري الرفع...' : 'اختر صورة'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

          {value && (
            <div className="flex items-center gap-2">
              <div className={`${previewSize} rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-50 dark:bg-slate-800 flex items-center justify-center`}>
                <img loading="lazy" src={value} alt={label} className="max-h-full max-w-full object-contain" />
              </div>
              <button onClick={() => onChange('')} className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
