import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: Export all data as JSON backup
export async function GET() {
  try {
    const supabase = createAdminClient();
    const backup: Record<string, any> = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      source: 'SAPKEY SOLUTIONS',
    };

    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    backup.auditLogs = auditLogs || [];

    const { data: users } = await supabase
      .from('users')
      .select('*');
    backup.users = users || [];

    const subscriptions = (auditLogs || [])
      .filter((log: any) => log.entity_type === 'tenant')
      .reduce((acc: any, log: any) => {
        const tid = log.entity_id;
        if (!acc[tid] || new Date(log.created_at) > new Date(acc[tid].created_at)) {
          acc[tid] = {
            tenantId: tid,
            ...(log.new_values || {}),
            lastAction: log.action,
            created_at: log.created_at,
          };
        }
        return acc;
      }, {});
    backup.subscriptions = Object.values(subscriptions);

    return NextResponse.json({
      success: true,
      backup,
      summary: {
        auditLogs: backup.auditLogs.length,
        users: backup.users.length,
        subscriptions: backup.subscriptions.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Import backup data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { backup } = body;

    if (!backup || !backup.version) {
      return NextResponse.json({ error: 'ملف النسخة الاحتياطية غير صالح' }, { status: 400 });
    }

    const supabase = createAdminClient();
    let imported = { auditLogs: 0, users: 0, errors: 0 };

    // 1. Import audit logs
    if (backup.auditLogs?.length > 0) {
      for (const log of backup.auditLogs) {
        const { error } = await supabase.from('audit_logs').insert({
          id: log.id,
          user_id: log.user_id,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          action: log.action,
          new_values: log.new_values || {},
          old_values: log.old_values || null,
          created_at: log.created_at,
        }).select();
        
        // If conflict occurs, it's already there
        if (error && error.code !== '23505') {
          imported.errors++;
        } else if (!error) {
          imported.auditLogs++;
        }
      }
    }

    // 2. Import users (Careful with passwords/auth, this just updates public profiles if needed)
    if (backup.users?.length > 0) {
      for (const user of backup.users) {
        const { error } = await supabase.from('users').upsert({
          id: user.id,
          email: user.email,
          full_name_ar: user.full_name_ar,
          full_name_en: user.full_name_en,
          phone: user.phone,
          role: user.role,
          is_active: user.is_active,
        });
        
        if (error) {
          imported.errors++;
        } else {
          imported.users++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم استيراد ${imported.auditLogs} سجل مراجعة, ${imported.users} مستخدم. الأخطاء: ${imported.errors}`,
      imported,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
