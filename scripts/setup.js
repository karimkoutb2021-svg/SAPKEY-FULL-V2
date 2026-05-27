console.log(`
╔══════════════════════════════════════════════════════════════╗
║           SAPKEY ERP - إعداد قاعدة البيانات                ║
╚══════════════════════════════════════════════════════════════╝

📋 خطوات تشغيل النظام:

1️⃣  إنشاء جداول قاعدة البيانات:
   • اذهب إلى: https://supabase.com/dashboard/project/fpcpqgpbznbsmeqqxmhx/sql
   • افتح ملف: supabase/migrations/setup_all.sql
   • انسخ المحتوى بالكامل وألصقه في SQL Editor
   • اضغط "Run" أو Ctrl+Enter

2️⃣  تشغيل التطبيق:
   • npm run dev

3️⃣  فتح المتصفح:
   • http://localhost:3000

4️⃣  اختبار النظام:
   • اذهب إلى صفحة POS (نقطة البيع)
   • أضف منتجات
   • أكمل الطلب
   • تأكد من ظهوره في صفحة الطلبات

5️⃣  النشر على الإنترنت (Vercel):
   • اربط المستودع بـ Vercel.com
   • أضف المتغيرات البيئية من .env.local
   • انشر

📁 ملفات مهمة:
   • .env.local      - إعدادات Supabase
   • supabase/migrations/  - ملفات SQL
   • src/lib/supabase/    - كود Supabase

`);
