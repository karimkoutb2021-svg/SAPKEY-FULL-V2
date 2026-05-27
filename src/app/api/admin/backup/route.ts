import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: Export all data as JSON backup
// Only accessible from server-side (protected by admin route)
export async function GET() {
  try {
    const supabase = createAdminClient();
    const backup: Record<string, any> = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      source: 'SAPKEY SOLUTIONS',
    };

    // 1. Fetch audit logs (contains subscription data)
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    backup.auditLogs = auditLogs || [];

    // 2. Fetch users (tenant info)
    const { data: users } = await supabase
      .from('users')
      .select('email, full_name_ar, full_name_en, phone, role, is_active');
    backup.users = users || [];

    // 3. Get all tenant subscriptions from audit logs
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
    let imported = { auditLogs: 0, skipped: 0, errors: 0 };

    // 1. Import audit logs (subscription data)
    if (backup.auditLogs?.length > 0) {
      // Only import tenant-related logs to avoid conflicts
      const tenantLogs = backup.auditLogs.filter((log: any) => log.entity_type === 'tenant');
      for (const log of tenantLogs) {
        const { error } = await supabase.from('audit_logs').insert({
          entity_type: log.entity_type || 'tenant',
          entity_id: log.entity_id,
          action: log.action || 'restored',
          new_values: log.new_values || {},
          old_values: log.old_values || null,
        });
        if (error) {
          imported.errors++;
        } else {
          imported.auditLogs++;
        }
      }
      // Non-tenant logs are skipped (already in DB or auto-generated)
      imported.skipped = backup.auditLogs.length - tenantLogs.length;
    }

    return NextResponse.json({
      success: true,
      message: `تم استيراد ${imported.auditLogs} سجل, تخطي ${imported.skipped}, أخطاء ${imported.errors}`,
      imported,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
