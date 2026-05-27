'use client';

import { useState } from 'react';
import { Phone, Mail, MapPin, Send, MessageCircle, Home } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { PageHeader } from '@/components/layout/page-header';
import toast from 'react-hot-toast';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';

export default function ContactPage() {
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.message) {
      toast.error('من فضلك املأ الاسم والرسالة');
      return;
    }
    toast.success('تم إرسال رسالتك - هنرد عليك قريباً');
    setForm({ name: '', email: '', phone: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">
      <PageHeader title="اتصل بنا" subtitle="نحن هنا لمساعدتك" icon={<Mail className="h-8 w-8" />} />

      <div className="max-w-4xl mx-auto px-4 py-2">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <Home className="h-4 w-4" /> العودة للرئيسية
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">بيانات التواصل</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Phone className="h-5 w-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">الهاتف</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white" dir="ltr">{branding.phone || '19XXX'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Mail className="h-5 w-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">واتساب</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{branding.whatsapp || 'واتساب'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                    <MapPin className="h-5 w-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">العنوان</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">القاهرة، مصر</p>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => window.open(`https://wa.me/${branding.whatsapp || '201000000000'}`, '_blank')} className="w-full h-12 rounded-2xl bg-green-500 text-white font-bold flex items-center justify-center gap-2">
              <MessageCircle className="h-5 w-5" /> تواصل عبر واتساب
            </button>
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">أرسل رسالة</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">الاسم *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" placeholder="اسمك" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">البريد الإلكتروني</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">رقم الهاتف</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" placeholder="01xxxxxxxxx" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">الرسالة *</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" placeholder="اكتب رسالتك هنا..." />
              </div>
              <button type="submit" className="w-full h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2" style={{ backgroundColor: primaryColor }}>
                <Send className="h-4 w-4" /> إرسال
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
