import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface TrackingSession {
  id: string;
  order_id: string;
  current_stage: 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered';
  stage_started_at: string;
  total_delivery_minutes: number;
  elapsed_minutes: number;
  progress_pct: number;
  driver_name?: string;
  driver_phone?: string;
  driver_lat?: number;
  driver_lng?: number;
  store_lat: number;
  store_lng: number;
  customer_lat?: number;
  customer_lng?: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

const STORE_LOCATION = { lat: 30.0444, lng: 31.2357 };
const CUSTOMER_LOCATION = { lat: 30.0544, lng: 31.2457 };

export const trackingService = {
  async getOrCreateSession(orderId: string, totalMinutes?: number): Promise<TrackingSession> {
    let { data } = await supabase.from('tracking_sessions').select('*').eq('order_id', orderId).maybeSingle();

    if (!data) {
      const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
      const totalMins = totalMinutes || 60;

      // Calculate driver position (simulate halfway)
      const midLat = (STORE_LOCATION.lat + CUSTOMER_LOCATION.lat) / 2;
      const midLng = (STORE_LOCATION.lng + CUSTOMER_LOCATION.lng) / 2;

      const { data: newSession } = await supabase.from('tracking_sessions').insert({
        order_id: orderId,
        current_stage: order?.status === 'delivered' ? 'delivered' : order?.status === 'ready' ? 'ready' : 'confirmed',
        total_delivery_minutes: totalMins,
        store_lat: STORE_LOCATION.lat,
        store_lng: STORE_LOCATION.lng,
        customer_lat: CUSTOMER_LOCATION.lat,
        customer_lng: CUSTOMER_LOCATION.lng,
        driver_name: 'أحمد',
        driver_phone: '01000000000',
        driver_lat: midLat,
        driver_lng: midLng,
        is_completed: order?.status === 'delivered',
      }).select().single();

      return newSession as TrackingSession;
    }

    return data as TrackingSession;
  },

  async calculateProgress(session: TrackingSession): Promise<{
    progressPct: number;
    elapsedMinutes: number;
    remainingMinutes: number;
    driverLat: number;
    driverLng: number;
    currentStage: string;
  }> {
    const now = Date.now();
    const startedAt = new Date(session.created_at).getTime();
    const totalMs = session.total_delivery_minutes * 60000;
    const elapsed = Math.max(0, now - startedAt);
    const progressPct = Math.min(100, (elapsed / totalMs) * 100);
    const remainingMinutes = Math.max(0, Math.round((totalMs - elapsed) / 60000));
    const elapsedMinutes = Math.min(session.total_delivery_minutes, Math.round(elapsed / 60000));

    // Simulate driver movement along the path (0 to 1)
    const t = Math.min(1, elapsed / totalMs);
    const custLat = session.customer_lat || session.store_lat + 0.01;
    const custLng = session.customer_lng || session.store_lng + 0.01;
    const driverLat = session.store_lat + (custLat - session.store_lat) * t;
    const driverLng = session.store_lng + (custLng - session.store_lng) * t;

    // Determine stage based on progress
    let currentStage = 'confirmed';
    if (progressPct >= 75) currentStage = 'out_for_delivery';
    else if (progressPct >= 50) currentStage = 'ready';
    else if (progressPct >= 25) currentStage = 'preparing';

    return { progressPct, elapsedMinutes, remainingMinutes, driverLat, driverLng, currentStage };
  },

  async updateSession(sessionId: string, updates: Partial<TrackingSession>) {
    await supabase.from('tracking_sessions').update(updates).eq('id', sessionId);
  },

  async completeSession(sessionId: string) {
    await supabase.from('tracking_sessions').update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      current_stage: 'delivered',
      progress_pct: 100,
    }).eq('id', sessionId);
  },

  // Simulate driver call
  getDriverInfo(session: TrackingSession) {
    return {
      name: session.driver_name || 'أحمد',
      phone: session.driver_phone || '01000000000',
    };
  },

  getRoutePath(session: TrackingSession) {
    const storeLat = session.store_lat;
    const storeLng = session.store_lng;
    const custLat = session.customer_lat || storeLat + 0.01;
    const custLng = session.customer_lng || storeLng + 0.01;
    const steps = 20;
    const path: { lat: number; lng: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      path.push({
        lat: storeLat + (custLat - storeLat) * t,
        lng: storeLng + (custLng - storeLng) * t,
      });
    }
    return path;
  },
};
