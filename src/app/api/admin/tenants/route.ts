import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: logs, error: logsError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'tenant')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) {
      return NextResponse.json({ error: logsError.message, fallback: true, tenants: [] }, { status: 200 });
    }

    const tenantMap = new Map<string, any>();
    for (const log of logs || []) {
      const tid = log.entity_id;
      if (!tenantMap.has(tid)) {
        const nv = log.new_values || {};
        tenantMap.set(tid, {
          id: tid,
          tenantId: nv.tenantId || tid,
          planId: nv.planId || 'professional',
          status: nv.status || 'trial',
          startDate: nv.startDate || Date.now(),
          endDate: nv.endDate || Date.now(),
          customFeatures: nv.customFeatures || [],
          disabledFeatures: nv.disabledFeatures || [],
          managerName: nv.managerName || '',
          managerPhone: nv.managerPhone || '',
          managerEmail: nv.managerEmail || '',
          lastAction: log.action,
          lastUpdated: log.created_at,
        });
      }
    }

    return NextResponse.json({ tenants: Array.from(tenantMap.values()), source: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, fallback: true, tenants: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, tenantId, planId, durationDays, features, disabled, managerName, managerPhone, managerEmail } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId مطلوب' }, { status: 400 });
    }

    const supabase = createAdminClient();

    switch (action) {
      case 'assign':
      case 'upgrade': {
        const now = Date.now();
        const endDate = now + 86400000 * (durationDays || 30);
        const { error } = await supabase.from('audit_logs').insert({
          entity_type: 'tenant',
          entity_id: tenantId,
          action: action === 'upgrade' ? 'subscription_upgraded' : 'subscription_assigned',
          new_values: {
            tenantId,
            planId: planId || 'professional',
            status: 'active',
            startDate: now,
            endDate,
            durationDays: durationDays || 30,
            customFeatures: features || [],
            disabledFeatures: disabled || [],
            managerName: managerName || '',
            managerPhone: managerPhone || '',
            managerEmail: managerEmail || '',
          },
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({
          success: true,
          action: action === 'upgrade' ? 'upgraded' : 'assigned',
          planId, endDate,
          message: `تم ${action === 'upgrade' ? 'ترقية' : 'تعيين'} الباقة بنجاح`,
        });
      }

      case 'suspend': {
        const { error } = await supabase.from('audit_logs').insert({
          entity_type: 'tenant',
          entity_id: tenantId,
          action: 'subscription_suspended',
          new_values: { tenantId, status: 'cancelled' },
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, action: 'suspended', message: 'تم إيقاف الباقة' });
      }

      case 'renew': {
        const now = Date.now();
        const endDate = now + 86400000 * (durationDays || 30);
        const { error } = await supabase.from('audit_logs').insert({
          entity_type: 'tenant',
          entity_id: tenantId,
          action: 'subscription_renewed',
          new_values: {
            tenantId,
            planId: planId || undefined,
            status: 'active',
            startDate: now,
            endDate,
            durationDays: durationDays || 30,
          },
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, action: 'renewed', endDate, message: 'تم تجديد الباقة' });
      }

      case 'update_features': {
        const { error } = await supabase.from('audit_logs').insert({
          entity_type: 'tenant',
          entity_id: tenantId,
          action: 'features_updated',
          new_values: {
            tenantId,
            customFeatures: features || [],
            disabledFeatures: disabled || [],
          },
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, action: 'features_updated', message: 'تم تحديث المميزات' });
      }

      default:
        return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
