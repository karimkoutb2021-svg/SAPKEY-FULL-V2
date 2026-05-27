'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPasswordUser } from '@/lib/supabase/auth';
import { useBrandingStore } from '@/lib/store/branding-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const branding = useBrandingStore((s) => s.branding);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('يرجى إدخال البريد الإلكتروني'); return; }
    setLoading(true);
    try {
      await resetPasswordUser(email);
      setSent(true);
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('user-not-found')) toast.error('لا يوجد حساب بهذا البريد الإلكتروني');
      else toast.error('فشل إرسال رابط إعادة التعيين');
    } finally { setLoading(false); }
  };

  return (
    <Card className="border-none shadow-2xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">
          {sent ? 'تم إرسال الرابط' : 'نسيت كلمة المرور'}
        </CardTitle>
        <CardDescription>
          {sent
            ? 'تحقق من بريدك الإلكتروني للحصول على رابط إعادة تعيين كلمة المرور'
            : 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
            </div>
            <p className="text-sm text-muted-foreground">
              تم إرسال رابط إعادة تعيين كلمة المرور إلى <strong dir="ltr">{email}</strong>
            </p>
            <Link href="/login" className="inline-flex items-center gap-1 text-sm hover:underline" style={{ color: branding.primaryColor }}>
              <ArrowRight className="h-4 w-4" /> العودة إلى تسجيل الدخول
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="البريد الإلكتروني"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              icon={<Mail className="h-4 w-4" />}
            />
            <Button type="submit" className="w-full h-11 text-base" disabled={loading} style={{ backgroundColor: branding.primaryColor }}>
              {loading ? <><Loader2 className="h-4 w-4 ml-1 animate-spin" /> جاري الإرسال...</> : 'إرسال رابط إعادة التعيين'}
            </Button>
            <div className="text-center">
              <Link href="/login" className="text-sm hover:underline" style={{ color: branding.primaryColor }}>
                العودة إلى تسجيل الدخول
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
