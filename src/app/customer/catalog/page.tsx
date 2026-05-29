'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { productViewService } from '@/lib/customer-services/customer-orders';
import Link from 'next/link';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function CatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = 'customer-demo';
    Promise.all([
      supabase.from('product_categories').select().limit(500).order('name_ar'),
      productViewService.getSmartCatalog(userId),
    ]).then(([cats, prods]) => {
      setCategories(cats.data || []);
      setProducts(prods);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const ch = supabase.channel('sync-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        window.location.reload();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = products.filter((p: any) => {
    if (activeCategory !== 'all' && p.category_id !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.name_ar || '').includes(q) || (p.sku || '').includes(q);
    }
    return true;
  });

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold">المتجر 🛍️</h1>
        <Link href="/customer" className="text-xs text-white/50 hover:text-white">رجوع</Link>
      </div>

      {/* Search */}
      <div className="relative">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث عن منتج..."
          className="w-full h-11 bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 pr-10 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors placeholder:text-white/30" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setActiveCategory('all')}
          className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
            activeCategory === 'all' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.04] text-white/60 border border-white/[0.06]'
          }`}>الكل</button>
        {categories.map((cat: any) => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              activeCategory === cat.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.04] text-white/60 border border-white/[0.06]'
            }`}>{cat.name_ar}</button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white/[0.03] rounded-xl h-48 border border-white/[0.06]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-3xl">📭</span>
          <p className="text-sm text-white/40 mt-2">لا توجد منتجات</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((product: any) => (
            <div key={product.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:bg-white/[0.06] transition-colors group">
              <div className="aspect-square bg-white/[0.02] flex items-center justify-center">
                <span className="text-4xl">📦</span>
              </div>
              <div className="p-3 space-y-1.5">
                <p className="text-sm font-medium line-clamp-2">{product.name_ar || product.name}</p>
                <p className="text-xs text-white/40 truncate">{product.category_name || product.product_categories?.name_ar}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-emerald-400">{product.selling_price?.toLocaleString('ar-EG') || product.price?.toLocaleString('ar-EG')} ج.م</span>
                  <button onClick={() => toast.success('تمت الإضافة إلى السلة 🛒')}
                    className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 transition-colors">
                    + أضف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
