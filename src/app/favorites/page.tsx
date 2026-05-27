'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Trash2, ArrowLeft, Plus, Star, Image as ImageIcon, Home, Package, Truck, Percent } from 'lucide-react';
import { useWishlistStore } from '@/lib/store/ecommerce-store';
import { useCartStore } from '@/lib/store/ecommerce-store';
import { productService } from '@/lib/supabase/services/products';
import { createClient } from '@/lib/supabase/client';
import { CATEGORY_KEYS, findCategoryId, loadCategories } from '@/lib/category-utils';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface WishlistProduct {
  id: string;
  nameAr: string;
  name: string;
  price: number;
  baseUnit: string;
  image?: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const { items, removeFromWishlist } = useWishlistStore();
  const { addItem } = useCartStore();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    loadCategories().then(cats => setCategories(cats)).catch(() => {});
    async function loadProducts() {
      if (items.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const ids = items.map(i => i.productId);
        const result = await productService.getAll({ is_active: true, limit: 200 });
        if (result.data) {
          const wishlistProducts = result.data
            .filter((p: any) => ids.includes(p.id))
            .map((p: any) => ({
              id: p.id,
              nameAr: p.name_ar,
              name: p.name_en || p.name_ar,
              price: Number(p.sale_price || p.unit_price || 0),
              baseUnit: p.unit || 'قطعة',
              image: p.image_url || '/product-placeholder.svg',
            }));
          setProducts(wishlistProducts);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
    const supabase = createClient();
    const channel = supabase.channel('favorites-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { loadProducts(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [items]);

  const handleAddToCart = (p: WishlistProduct) => {
    addItem({ productId: p.id, name: p.name, nameAr: p.nameAr, price: p.price, quantity: 1, image: undefined, unit: p.baseUnit, maxQuantity: 99 });
    toast.success(`تمت إضافة ${p.nameAr}`);
  };

  const handleRemove = (id: string) => {
    removeFromWishlist(id);
    setProducts(prev => prev.filter(p => p.id !== id));
    toast.success('تم الإزالة من المفضلة');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            <h1 className="text-base font-bold text-gray-900 dark:text-white">المفضلة</h1>
            <span className="text-xs text-gray-400">({items.length} منتج)</span>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Heart className="h-10 w-10 text-gray-300 dark:text-slate-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">قائمة المفضلة فارغة</h2>
            <p className="text-sm text-gray-400 mb-6">أضف منتجات إلى المفضلة لتتمكن من العودة إليها لاحقاً</p>
            <button onClick={() => router.push('/shop')}
              className="h-11 px-6 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-all">
              استعرض المنتجات
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products.map((p) => (
              <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden group hover:shadow-md transition-all">
                <div className="relative aspect-square overflow-hidden cursor-pointer bg-gray-100 dark:bg-slate-800"
                  onClick={() => router.push(`/shop/product/${p.id}`)}>
                  {p.image ? (
                    <img src={p.image || "/product-placeholder.svg"} alt={p.nameAr} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-300 dark:text-slate-600" />
                    </div>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleRemove(p.id); }}
                    className="absolute top-2 left-2 h-7 w-7 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm">
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </div>

                <div className="p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] text-gray-500 font-medium">4.8</span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight cursor-pointer hover:text-emerald-600 transition-colors mb-1"
                    onClick={() => router.push(`/shop/product/${p.id}`)}>{p.nameAr}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-emerald-600">{formatCurrency(p.price)}</span>
                    <button onClick={() => handleAddToCart(p)}
                      className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shadow-sm active:scale-90">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-gray-100/50 dark:border-slate-800/50 shadow-lg sm:hidden">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          {[
            { icon: Home, label: 'الرئيسية', action: () => router.push('/') },
            { icon: ShoppingCart, label: 'المشروبات', action: () => router.push(`/shop?category=${findCategoryId(CATEGORY_KEYS.beverages, categories) || 'all'}`) },
            { icon: Package, label: 'الألبان', action: () => router.push(`/shop?category=${findCategoryId(CATEGORY_KEYS.dairy, categories) || 'all'}`) },
            { icon: Percent, label: 'العروض', action: () => router.push('/offers') },
            { icon: Heart, label: 'المفضلة', active: true, action: () => {} },
            { icon: Truck, label: 'طلباتي', action: () => router.push('/orders') },
            { icon: ShoppingCart, label: 'عربة التسوق', action: () => router.push('/cart') },
          ].map(({ icon: Icon, label, active, action }) => (
            <button key={label} onClick={action}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 relative transition-all ${active ? 'font-bold text-emerald-600' : 'text-gray-400 dark:text-gray-500'}`}>
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
