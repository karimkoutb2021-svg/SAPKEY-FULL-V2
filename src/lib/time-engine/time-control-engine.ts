import { createClient } from '@/lib/supabase/client';
import { notificationService } from '@/lib/supabase/services/notifications';

const supabase = createClient();

export interface TimeControlSettings {
  id: string;
  total_delivery_minutes: number;
  pending_minutes: number;
  preparing_minutes: number;
  ready_minutes: number;
  delivery_minutes: number;
  auto_escalate: boolean;
  alert_blink_threshold_seconds: number;
}

export interface StageTimer {
  id: string;
  order_id: string;
  stage: string;
  started_at: string;
  completed_at: string | null;
  sla_seconds: number;
  is_overdue: boolean;
  assigned_user_id: string | null;
}

export interface SLAPerformance {
  id: string;
  order_id: string;
  user_id: string;
  stage: string;
  sla_seconds: number;
  actual_seconds: number;
  variance_seconds: number;
  met_sla: boolean;
}

export const STAGE_LABELS: Record<string, { ar: string; en: string; color: string; icon: string }> = {
  pending: { ar: 'قيد التأكيد', en: 'Pending', color: 'text-yellow-400', icon: '⏳' },
  preparing: { ar: 'قيد التحضير', en: 'Preparing', color: 'text-blue-400', icon: '⚙️' },
  ready: { ar: 'جاهز للتسلم', en: 'Ready', color: 'text-emerald-400', icon: '📦' },
  delivery: { ar: 'قيد التوصيل', en: 'Delivery', color: 'text-violet-400', icon: '🚴' },
};

export const DEFAULT_TIME_SETTINGS: TimeControlSettings = {
  id: '',
  total_delivery_minutes: 60,
  pending_minutes: 5,
  preparing_minutes: 20,
  ready_minutes: 5,
  delivery_minutes: 30,
  auto_escalate: true,
  alert_blink_threshold_seconds: 30,
};

export const timeControlSettingsService = {
  async get(): Promise<TimeControlSettings> {
    const { data, error } = await supabase
      .from('time_control_settings')
      .select('id, total_delivery_minutes, pending_minutes, preparing_minutes, ready_minutes, delivery_minutes, auto_escalate, alert_blink_threshold_seconds')
      .limit(1)
      .maybeSingle();

    if (error || !data) return DEFAULT_TIME_SETTINGS;
    return data as TimeControlSettings;
  },

  async upsert(settings: Partial<TimeControlSettings>) {
    const existing = await this.get();
    if (existing.id) {
      const { data, error } = await supabase
        .from('time_control_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data as TimeControlSettings;
    } else {
      const { data, error } = await supabase
        .from('time_control_settings')
        .insert(settings)
        .select()
        .single();
      if (error) throw error;
      return data as TimeControlSettings;
    }
  },
};

export const stageTimerService = {
  async getByOrder(orderId: string): Promise<StageTimer[]> {
    const { data, error } = await supabase
      .from('order_stage_timers')
      .select('id, order_id, stage, started_at, completed_at, sla_seconds, is_overdue, assigned_user_id')
      .eq('order_id', orderId)
      .order('started_at');
    if (error) throw error;
    return (data || []) as StageTimer[];
  },

  async startStage(orderId: string, stage: string, slaSeconds: number, userId?: string) {
    const { data, error } = await supabase
      .from('order_stage_timers')
      .insert({
        order_id: orderId,
        stage,
        sla_seconds: slaSeconds,
        started_at: new Date().toISOString(),
        assigned_user_id: userId || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as StageTimer;
  },

  async completeStage(stageTimerId: string) {
    const { data, error } = await supabase
      .from('order_stage_timers')
      .update({
        completed_at: new Date().toISOString(),
        is_overdue: false,
      })
      .eq('id', stageTimerId)
      .select()
      .single();
    if (error) throw error;
    return data as StageTimer;
  },

  async markOverdue(stageTimerId: string) {
    const { data, error } = await supabase
      .from('order_stage_timers')
      .update({ is_overdue: true })
      .eq('id', stageTimerId)
      .select()
      .single();
    if (error) throw error;
    return data as StageTimer;
  },

  async getActiveStages(): Promise<StageTimer[]> {
    const { data, error } = await supabase
      .from('order_stage_timers')
      .select('id, order_id, stage, started_at, completed_at, sla_seconds, is_overdue, assigned_user_id')
      .is('completed_at', null)
      .order('started_at');
    if (error) throw error;
    return (data || []) as StageTimer[];
  },
};

export const slaPerformanceService = {
  async record(entry: Omit<SLAPerformance, 'id'>) {
    const { data, error } = await supabase
      .from('sla_performance_log')
      .insert(entry)
      .select()
      .single();
    if (error) throw error;
    return data as SLAPerformance;
  },

  async getByUser(userId: string): Promise<SLAPerformance[]> {
    const { data, error } = await supabase
      .from('sla_performance_log')
      .select('id, order_id, user_id, stage, sla_seconds, actual_seconds, variance_seconds, met_sla')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    return (data || []) as SLAPerformance[];
  },

  async getDailyReport(date?: string): Promise<{
    employeeStats: Record<string, { total: number; met: number; missed: number; avgVariance: number }>;
    stageBreakdown: Record<string, { total: number; met: number; missed: number; avgActual: number }>;
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('sla_performance_log')
      .select('id, order_id, user_id, stage, sla_seconds, actual_seconds, variance_seconds, met_sla')
      .gte('recorded_at', `${targetDate}T00:00:00Z`)
      .lte('recorded_at', `${targetDate}T23:59:59Z`);

    if (error) throw error;
    const records = (data || []) as SLAPerformance[];

    const employeeStats: Record<string, { total: number; met: number; missed: number; avgVariance: number }> = {};
    const stageBreakdown: Record<string, { total: number; met: number; missed: number; avgActual: number }> = {};

    for (const r of records) {
      if (!employeeStats[r.user_id]) {
        employeeStats[r.user_id] = { total: 0, met: 0, missed: 0, avgVariance: 0 };
      }
      employeeStats[r.user_id].total++;
      if (r.met_sla) employeeStats[r.user_id].met++;
      else employeeStats[r.user_id].missed++;
      employeeStats[r.user_id].avgVariance += r.variance_seconds;

      if (!stageBreakdown[r.stage]) {
        stageBreakdown[r.stage] = { total: 0, met: 0, missed: 0, avgActual: 0 };
      }
      stageBreakdown[r.stage].total++;
      if (r.met_sla) stageBreakdown[r.stage].met++;
      else stageBreakdown[r.stage].missed++;
      stageBreakdown[r.stage].avgActual += r.actual_seconds;
    }

    for (const k of Object.keys(employeeStats)) {
      employeeStats[k].avgVariance = Math.round(employeeStats[k].avgVariance / employeeStats[k].total);
    }
    for (const k of Object.keys(stageBreakdown)) {
      stageBreakdown[k].avgActual = Math.round(stageBreakdown[k].avgActual / stageBreakdown[k].total);
    }

    return { employeeStats, stageBreakdown };
  },
};

export const timeAutoEngine = {
  async processOrderStatusChange(orderId: string, newStatus: string, settings: TimeControlSettings, userId?: string) {
    const completed = await stageTimerService.getByOrder(orderId);
    const lastActive = completed.filter(t => !t.completed_at);

    // Complete current stage if active
    for (const timer of lastActive) {
      const startedAt = new Date(timer.started_at).getTime();
      const actualSeconds = Math.round((Date.now() - startedAt) / 1000);
      await stageTimerService.completeStage(timer.id);

      await slaPerformanceService.record({
        order_id: orderId,
        user_id: userId || timer.assigned_user_id || '',
        stage: timer.stage,
        sla_seconds: timer.sla_seconds,
        actual_seconds: actualSeconds,
        variance_seconds: actualSeconds - timer.sla_seconds,
        met_sla: actualSeconds <= timer.sla_seconds,
      });
    }

    // Start next stage
    const slaMap: Record<string, number> = {
      pending: settings.pending_minutes * 60,
      preparing: settings.preparing_minutes * 60,
      ready: settings.ready_minutes * 60,
    };

    if (newStatus !== 'delivered' && newStatus !== 'cancelled') {
      const stageMap: Record<string, string> = {
        pending: 'pending',
        confirmed: 'pending',
        preparing: 'preparing',
        ready: 'ready',
      };
      const stage = stageMap[newStatus];
      if (stage && slaMap[stage]) {
        await stageTimerService.startStage(orderId, stage, slaMap[stage], userId);
      }
    }
  },

  async checkOverdueAndAutoEscalate(settings: TimeControlSettings) {
    const activeStages = await stageTimerService.getActiveStages();
    const now = Date.now();
    const escalatedOrders: string[] = [];

    for (const timer of activeStages) {
      const startedAt = new Date(timer.started_at).getTime();
      const elapsed = (now - startedAt) / 1000;

      if (elapsed > timer.sla_seconds && !timer.is_overdue) {
        await stageTimerService.markOverdue(timer.id);

        // Auto-escalate to next stage
        if (settings.auto_escalate) {
          const orderId = timer.order_id;
          const stageOrder = ['pending', 'preparing', 'ready', 'delivery'];
          const currentIdx = stageOrder.indexOf(timer.stage);
          if (currentIdx >= 0 && currentIdx < stageOrder.length - 1) {
            const nextStage = stageOrder[currentIdx + 1];
            const statusMap: Record<string, string> = {
              pending: 'confirmed',
              preparing: 'ready',
              ready: 'delivered',
            };
            const nextStatus = statusMap[timer.stage] || 'confirmed';

            // Update order status automatically
            await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId);

            // Complete current, start next
            await stageTimerService.completeStage(timer.id);
            const slaMap: Record<string, number> = {
              pending: settings.pending_minutes * 60,
              preparing: settings.preparing_minutes * 60,
              ready: settings.ready_minutes * 60,
            };
            if (slaMap[nextStage]) {
              await stageTimerService.startStage(orderId, nextStage, slaMap[nextStage]);
            }

            // Create notification
            await notificationService.create({
              type: 'system_alert',
              title: 'تسلسل تلقائي - تجاوز الوقت',
              message: `الطلب ${orderId.slice(0, 8)} تم ترقيته تلقائياً إلى "${nextStage}" بعد تجاوز الوقت المحدد لـ"${timer.stage}"`,
              action_url: `/manager/orders?order=${orderId}`,
              metadata: { order_id: orderId, from_stage: timer.stage, to_stage: nextStage, elapsed_seconds: Math.round(elapsed) },
            });

            escalatedOrders.push(orderId);
          }
        } else {
          // Just send overdue alert
          await notificationService.create({
            type: 'transfer_alert',
            title: '⚠️ تجاوز الوقت - الطلب متأخر',
            message: `الطلب في مرحلة "${timer.stage}" تجاوز الوقت المحدد ب ${Math.round((elapsed - timer.sla_seconds) / 60)} دقيقة`,
            action_url: `/manager/orders?order=${timer.order_id}`,
            metadata: { order_id: timer.order_id, stage: timer.stage, elapsed_seconds: Math.round(elapsed), sla_seconds: timer.sla_seconds },
          });
        }
      }
    }

    return escalatedOrders;
  },
};
