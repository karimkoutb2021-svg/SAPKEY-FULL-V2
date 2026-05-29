import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface BrandingSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export const brandingService = {
  async getAll() {
    const { data, error } = await supabase.from('branding_settings').select('id, key, value, updated_at');
    if (error) throw error;

    // Convert to key-value object
    const config: Record<string, string> = {};
    data?.forEach((item) => {
      config[item.key] = item.value;
    });
    return config;
  },

  async set(key: string, value: string) {
    const { data, error } = await supabase
      .from('branding_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async get(key: string) {
    const { data, error } = await supabase
      .from('branding_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) return null;
    return data?.value || null;
  },

  async delete(key: string) {
    const { error } = await supabase
      .from('branding_settings')
      .delete()
      .eq('key', key);

    if (error) throw error;
  },

  // Real-time subscription
  subscribe(callback: (key: string, value: string) => void) {
    const channel = supabase
      .channel('branding-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branding_settings' },
        (payload) => {
          if ((payload.new as any)) {
            const newConfig = payload.new as BrandingSetting;
            callback(newConfig.key, newConfig.value);
          }
        }
      )
      .subscribe();

    return channel;
  },

  unsubscribe(channel: any) {
    supabase.removeChannel(channel);
  },
};
