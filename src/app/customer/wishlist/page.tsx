'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, ShoppingBag, Trash2, Plus, Package, Loader2, AlertCircle, Star, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { useCartStore } from '@/lib/store/ecommerce-store';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function WishlistPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role !== 'customer') { router.replace('/'); return; }
    loadWishlist();
    const ch = supabase.channel('wishlist-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_wishlist', filter: `customer_id=eq.${user.id}` }, () => loadWishlist())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const loadWishlist = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('customer_wishlist')
        .select('id, notes, created_at, product:products(*)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      setItems(data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const removeItem = async (id: string) => {
    await supabase.from('customer_wishlist').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('تم الإزالة من المفضلة');
  };

  const addToCart = (item: any) => {
    const p = item.product;
    if (!p) return;
    addItem({ productId: p.id, name: p.name_en || p.name_ar, nameAr: p.name_ar, price: Number(p.sale_price || p.unit_price || 0), quantity: 1, unit: p.unit || 'قطعة', maxQuantity: 99 });
    toast.success(`تمت إضافة ${p.name_ar} إلى السلة`);
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#020617] dark:to-slate-950 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#020617] dark:to-slate-950 pb-24">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <button onClick={() => router.back()} className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-xs font-bold text-gray-900 dark:text-white">المفضلة</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20 flex items-center justify-center mx-auto mb-4">
              <Heart className="h-10 w-10 text-pink-400" />
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white">المفضلة فارغة</p>
            <p className="text-xs text-gray-400 mt-1">احفظ منتجاتك المفضلة لسهولة الوصول</p>
            <button onClick={() => router.push('/shop')}
              className="mt-6 h-11 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold hover:shadow-lg transition-all">
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((item) => {
              const p = item.product;
              return (
                <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-slate-800/50 p-3 flex items-center gap-3">
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shrink-0">
                    {p?.image_url ? <img src={p.image_url} alt={p?.name_ar} className="h-full w-full rounded-xl object-cover" /> : <Package className="h-8 w-8 text-gray-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{p?.name_ar || 'منتج'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{p?.name_en || ''}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-black text-emerald-600">{formatCurrency(Number(p?.sale_price || p?.unit_price || 0))}</span>
                      <span className="text-[9px] text-gray-400">{p?.unit || 'قطعة'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => addToCart(item)}
                      className="h-8 w-8 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center hover:shadow-md transition-all">
                      <ShoppingBag className="h-3.5 w-3.5 text-white" />
                    </button>
                    <button onClick={() => removeItem(item.id)}
                      className="h-8 w-8 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
