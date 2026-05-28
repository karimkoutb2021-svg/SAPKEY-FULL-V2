import { createClient } from '@/lib/supabase/client';

export interface ProductCategory {
  id: string;
  name_ar: string;
  name_en?: string;
  slug?: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorefrontBanner {
  id: string;
  title_ar: string;
  title_en?: string;
  subtitle_ar?: string;
  subtitle_en?: string;
  image_url: string;
  link_url?: string;
  link_type: string;
  target_id?: string;
  position: string;
  sort_order: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

const supabase = createClient();

export const categoryService = {
  async getAll(params?: { parent_id?: string; is_active?: boolean }) {
    let query = supabase.from('product_categories').select('id, name_ar, name_en, slug, description, image_url, parent_id, sort_order, is_active, created_at', { count: 'exact' });

    if (params?.parent_id !== undefined) {
      query = query.eq('parent_id', params.parent_id);
    }
    if (params?.is_active !== undefined) {
      query = query.eq('is_active', params.is_active);
    }

    const { data, error, count } = await query.order('sort_order');

    if (error) throw error;
    return { data: data as ProductCategory[], count };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ProductCategory;
  },

  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) return null;
    return data as ProductCategory;
  },

  async create(category: {
    name_ar: string;
    name_en?: string;
    slug?: string;
    description?: string;
    image_url?: string;
    parent_id?: string;
    sort_order?: number;
  }) {
    const { data, error } = await supabase
      .from('product_categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data as ProductCategory;
  },

  async update(id: string, category: Partial<ProductCategory>) {
    const { data, error } = await supabase
      .from('product_categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ProductCategory;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async reorder(items: { id: string; sort_order: number }[]) {
    for (const item of items) {
      await supabase
        .from('product_categories')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id);
    }
    return true;
  }
};

export const bannerService = {
  async getAll(params?: { position?: string; is_active?: boolean }) {
    let query = supabase.from('storefront_banners').select('id, title_ar, title_en, subtitle_ar, subtitle_en, image_url, link_url, link_type, target_id, position, sort_order, is_active, start_date, end_date, created_at', { count: 'exact' });

    if (params?.position) {
      query = query.eq('position', params.position);
    }
    if (params?.is_active !== undefined) {
      query = query.eq('is_active', params.is_active);
    }

    const { data, error, count } = await query.order('sort_order');

    if (error) throw error;
    return { data: data as StorefrontBanner[], count };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('storefront_banners')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as StorefrontBanner;
  },

  async create(banner: {
    title_ar: string;
    title_en?: string;
    subtitle_ar?: string;
    subtitle_en?: string;
    image_url: string;
    link_url?: string;
    link_type?: string;
    target_id?: string;
    position?: string;
    sort_order?: number;
    start_date?: string;
    end_date?: string;
  }) {
    const { data, error } = await supabase
      .from('storefront_banners')
      .insert(banner)
      .select()
      .single();

    if (error) throw error;
    return data as StorefrontBanner;
  },

  async update(id: string, banner: Partial<StorefrontBanner>) {
    const { data, error } = await supabase
      .from('storefront_banners')
      .update(banner)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as StorefrontBanner;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('storefront_banners')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async reorder(items: { id: string; sort_order: number }[]) {
    for (const item of items) {
      await supabase
        .from('storefront_banners')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id);
    }
    return true;
  }
};
