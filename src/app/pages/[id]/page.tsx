'use client';

import { useBrandingStore } from '@/lib/store/branding-store';
import { notFound, useParams } from 'next/navigation';
import { Store } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DynamicPage() {
  const { id } = useParams();
  const { branding, loadFromSupabase } = useBrandingStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadFromSupabase().then(() => setMounted(true));
  }, [loadFromSupabase]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-slate-800" />
          <div className="w-32 h-4 rounded bg-gray-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  // Look for a link that has an href matching /pages/[id] OR id matching [id]
  const pageData = branding.footerLinks.find(
    link => link.href === `/pages/${id}` || link.id === id
  );

  if (!pageData || !pageData.content) {
    notFound();
  }

  const primaryColor = branding.primaryColor || '#22C55E';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white pb-24" dir="rtl">
      {/* Header Area */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 pt-8 pb-12 mb-8">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 opacity-70 hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
              <Store className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold">{branding.storeName || 'SAPKEY'}</span>
          </Link>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            {pageData.label}
          </h1>
          {pageData.description && (
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl">
              {pageData.description}
            </p>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="p-8 md:p-12 rounded-3xl bg-white dark:bg-slate-900 shadow-xl border border-gray-100 dark:border-slate-800">
          <div 
            className="prose prose-lg dark:prose-invert max-w-none 
              prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl 
              prose-a:text-blue-600 dark:prose-a:text-blue-400
              prose-p:leading-relaxed prose-p:text-gray-600 dark:prose-p:text-gray-300
              prose-li:text-gray-600 dark:prose-li:text-gray-300"
            dangerouslySetInnerHTML={{ __html: pageData.content.replace(/\n/g, '<br />') }}
          />
        </div>
      </div>
    </div>
  );
}
