'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Star, Plus } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useWishlistStore, useCartStore } from '@/lib/store/ecommerce-store';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  view?: 'grid' | 'list';
}

export function ProductCard({ product, view = 'grid' }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const { addItem } = useCartStore();
  const wishlisted = isInWishlist(product.id);

  if (view === 'list') {
    return (
      <div className="product-card-premium overflow-hidden">
        <div className="flex items-center">
          <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
            <img loading="lazy" src={product.image || "/product-placeholder.svg"} alt={product.nameAr} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 p-4">
            <Link href={`/shop/product/${product.id}`} className="text-base font-bold text-gray-900 dark:text-white hover:text-emerald-600 transition-colors line-clamp-1">
              {product.nameAr}
            </Link>
            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{product.descriptionAr}</p>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-emerald-600">{formatCurrency(product.price)}</span>
                {product.costPrice > 0 && product.price > product.costPrice && (
                  <span className="text-xs text-gray-400 line-through">{formatCurrency(product.costPrice)}</span>
                )}
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => addItem({ productId: product.id, name: product.name, nameAr: product.nameAr, price: product.price, quantity: 1, image: product.image, unit: product.unit, maxQuantity: 99 })}
                className="h-11 px-5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-glow"
              >
                <Plus className="h-4 w-4" /> أضف
              </motion.button>
            </div>
          </div>
          <button onClick={() => toggleWishlist(product.id)} className="h-10 w-10 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mr-2">
            <Heart className={cn('h-5 w-5', wishlisted && 'fill-red-500 text-red-500')} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className="product-card-premium group"
    >
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center overflow-hidden">
        <img loading="lazy" src={product.image || "/product-placeholder.svg"} alt={product.nameAr} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {product.hasExpiry && (
          <span className="absolute top-3 right-3 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full">
            صلاحية
          </span>
        )}
        <button
          onClick={() => toggleWishlist(product.id)}
          className="absolute top-3 left-3 h-9 w-9 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white shadow-sm"
        >
          <Heart className={cn('h-4 w-4', wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          <span className="text-xs text-gray-500 font-medium">4.8</span>
        </div>
        <Link href={`/shop/product/${product.id}`}>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 mb-0.5 hover:text-emerald-600 transition-colors">{product.nameAr}</h3>
        </Link>
        <p className="text-[11px] text-gray-400 line-clamp-1 mb-3">{product.descriptionAr}</p>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-black text-emerald-600">{formatCurrency(product.price)}</span>
            {product.costPrice > 0 && product.price > product.costPrice && (
              <span className="text-[10px] text-gray-400 line-through mr-1">{formatCurrency(product.costPrice)}</span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => addItem({ productId: product.id, name: product.name, nameAr: product.nameAr, price: product.price, quantity: 1, image: product.image, unit: product.unit, maxQuantity: 99 })}
            className="h-9 w-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shadow-glow active:scale-90"
          >
            <Plus className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
