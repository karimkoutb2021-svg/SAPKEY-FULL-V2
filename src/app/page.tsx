'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, ShoppingCart, Lock, ArrowLeft, Star,
  ChevronLeft, ChevronRight, X, Sparkles,
  Clock, MapPin, Phone, MessageCircle, Gift, Percent,
  Truck, Shield, Headphones, LayoutDashboard, Heart, Plus,
  Image as ImageIcon, Loader2, ExternalLink,
} from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { productService } from '@/lib/supabase/services/products';
import { bannerService, type StorefrontBanner } from '@/lib/supabase/services/categories';
import { type ProductCategory } from '@/lib/supabase/services/categories';
import { loadCategories } from '@/lib/category-utils';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Footer } from '@/components/layout/footer';
import { Ticker } from '@/components/layout/ticker';
import { AdminCodeModal } from '@/components/auth/admin-code-modal';

interface ShopProduct {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  baseUnit: string;
  categoryId?: string;
  image?: string;
  images?: string[];
  description?: string;
}

function mapProduct(p: any): ShopProduct {
  return {
    id: p.id,
    name: p.name_en || p.name_ar,
    nameAr: p.name_ar,
    price: Number(p.sale_price || p.unit_price || 0),
    baseUnit: p.unit || 'قطعة',
    categoryId: p.category_id,
    image: p.image_url || '/product-placeholder.svg',
    images: p.image_url ? [p.image_url] : [],
    description: p.description,
  };
}

/* ───────────── Product Card with Real Images ───────────── */
function RealProductCard({ product, size = 'normal' }: { product: ShopProduct; size?: 'normal' | 'small' }) {
  const router = useRouter();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imageUrl = product.image || '/product-placeholder.svg';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={() => router.push(`/shop/product/${product.id}`)}
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden cursor-pointer group hover:shadow-md transition-all"
    >
      {/* Image */}
      <div className={`relative ${size === 'small' ? 'aspect-[4/3]' : 'aspect-square'} overflow-hidden bg-gray-100 dark:bg-slate-800`}>
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-slate-700 animate-pulse" />
        )}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.nameAr}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-300 dark:text-slate-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1.5">
          {product.nameAr}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm sm:text-base font-black text-emerald-600">
            {formatCurrency(product.price)}
          </span>
          <span className="text-[10px] text-gray-400">/ {product.baseUnit}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ───────────── Professional Hero Slider (Noon-style) ───────────── */
function HeroBanner({ products, banners }: { products: ShopProduct[]; banners: StorefrontBanner[] }) {
  const router = useRouter();
  const [currentScene, setCurrentScene] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { branding } = useBrandingStore();
  const title = branding.heroBannerTitle || 'مرحباً بك في SAPKEY SMART GRO';
  const subtitle = branding.heroBannerSubtitle || 'اكتشف أحدث العروض والمنتجات المميزة';
  // ALWAYS use premium world-class images for now, overriding DB to ensure quality
  const images = [
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=1920', // Sleek modern grocery aisle
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920', // Fresh vibrant produce
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1920'  // Premium bakery/deli
  ];

  // Base scenes array dynamically populated from images
  const scenes = images.map((img, idx) => {
    // Add some variety to the decorative text for each slide
    const accents = [
      { cta: 'تسوق الآن', emoji: '🌟', gradient: 'from-black/60 via-black/40 to-black/60' },
      { cta: 'اكتشف العروض', emoji: '🛒', gradient: 'from-emerald-900/60 via-emerald-800/40 to-black/60' },
      { cta: 'ابدأ الشراء', emoji: '⚡', gradient: 'from-blue-900/60 via-blue-800/40 to-black/60' },
      { cta: 'تصفح الأقسام', emoji: '🥬', gradient: 'from-orange-900/60 via-orange-800/40 to-black/60' }
    ];
    const accent = accents[idx % accents.length];
    
    return {
      title,
      subtitle,
      image: img,
      cta: accent.cta,
      emoji: accent.emoji,
      gradient: accent.gradient,
      video: img.endsWith('.mp4') ? img : null
    };
  });

  const DURATION = 4000;
  const INTERVAL = 100;

  const startAutoPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + (INTERVAL / DURATION) * 100;
      });
    }, INTERVAL);
    timerRef.current = setInterval(() => {
      setCurrentScene(prev => (prev + 1) % scenes.length);
      setProgress(0);
    }, DURATION);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const goToScene = (index: number) => {
    setCurrentScene(index);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      startAutoPlay();
    }, 2000);
  };

  return (
    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-black/10">
      {/* Slides Container */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] xl:aspect-[2.5/1]">
        {scenes.map((s, i) => (
          <motion.div
            key={i}
            className={`absolute inset-0 ${s.video ? '' : 'bg-gradient-to-br'} ${s.gradient}`}
            initial={false}
            animate={{
              opacity: i === currentScene ? 1 : 0,
              scale: i === currentScene ? 1 : 1.05,
            }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            style={{ zIndex: i === currentScene ? 10 : 0 }}
          >
            {s.video ? (
              <video 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover object-center"
                src={s.video}
              />
            ) : (
              <img 
                src={s.image} 
                alt={s.title} 
                className="absolute inset-0 w-full h-full object-cover object-center" 
              />
            )}
            <div className="absolute inset-0 bg-black/40" />
            {/* Decorative Background Elements Removed */}

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 sm:px-10 md:px-16 text-center">
              {/* Emoji Badge */}
              <motion.div
                key={`badge-${i}`}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold mb-3 sm:mb-4"
              >
                <span className="text-sm sm:text-base">{s.emoji}</span>
                <span>عرض مميز</span>
              </motion.div>

              {/* Title */}
              <motion.h2
                key={`title-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
                className="text-lg sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3 leading-tight tracking-tight px-4"
              >
                {s.title}
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                key={`sub-${i}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5, ease: 'easeOut' }}
                className="text-[11px] sm:text-sm text-white/85 mb-4 sm:mb-6 max-w-[260px] sm:max-w-md leading-relaxed mx-auto"
              >
                {s.subtitle}
              </motion.p>

              {/* CTA Button */}
              <motion.button
                key={`cta-${i}`}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
                onClick={() => router.push('/shop')}
                className="h-8 sm:h-10 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white text-gray-900 font-bold text-[10px] sm:text-xs hover:bg-gray-50 active:scale-[0.97] transition-all flex items-center gap-2 shadow-lg shadow-black/10 mx-auto"
              >
                {s.cta}
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </motion.button>
            </div>
          </motion.div>
        ))}

        {/* Scene Dots */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
          {scenes.map((_, i) => (
            <button
              key={i}
              onClick={() => goToScene(i)}
              className={`rounded-full transition-all duration-500 ease-out ${
                i === currentScene
                  ? 'w-6 sm:w-8 h-1.5 sm:h-2 bg-white'
                  : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-white/20 z-20">
          <motion.div
            className="h-full bg-white/70"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>
      </div>
    </div>
  );
}

/* ───────────── Categories Horizontal Slider ───────────── */
function CategorySlider({ categories }: { categories: ProductCategory[] }) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-500" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">تسوق حسب القسم</h2>
        </div>
        <button onClick={() => router.push('/shop')} className="text-xs text-emerald-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
          عرض الكل <ArrowLeft className="w-3 h-3" />
        </button>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-2"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => router.push(`/shop?category=${cat.id}`)}
              className="shrink-0 group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all min-w-[90px] sm:min-w-[110px]"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white dark:bg-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm p-1">
                <img src={cat.image_url || "/category-placeholder.svg"} alt={cat.name_ar} className="w-full h-full object-cover rounded-xl" loading="lazy" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-center leading-tight line-clamp-2">
                {cat.name_ar}
              </span>
            </button>
          ))}
        </div>

        {/* Scroll Arrows */}
        <button onClick={() => scroll('left')} className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md items-center justify-center hover:bg-gray-50 z-10">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => scroll('right')} className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md items-center justify-center hover:bg-gray-50 z-10">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ───────────── Product Horizontal Scroll ───────────── */
function ProductScroll({ title, icon, products, accentColor = 'emerald' }: {
  title: string;
  icon: React.ReactNode;
  products: ShopProduct[];
  accentColor?: string;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl bg-${accentColor}-100 dark:bg-${accentColor}-900/30 flex items-center justify-center`}>
            {icon}
          </div>
          <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">{title}</h2>
        </div>
        <button onClick={() => router.push('/shop')} className="text-xs text-emerald-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
          عرض الكل <ArrowLeft className="w-3 h-3" />
        </button>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-2"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
            {products.map((p) => (
            <div key={p.id} className="shrink-0 w-40 sm:w-48 md:w-52 lg:w-56 xl:w-60">
              <RealProductCard product={p} />
            </div>
          ))}
        </div>

        {/* Scroll Arrows */}
        <button onClick={() => scroll('left')} className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md items-center justify-center hover:bg-gray-50 z-10">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => scroll('right')} className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md items-center justify-center hover:bg-gray-50 z-10">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ───────────── Main Landing Page ───────────── */
export default function SupermarketLandingPage() {
  const router = useRouter();
  const { branding } = useBrandingStore();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [banners, setBanners] = useState<StorefrontBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCtaScene, setCurrentCtaScene] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCtaScene((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, catRes, banRes] = await Promise.allSettled([
          productService.getAll({ is_active: true, limit: 200 }),
          loadCategories(),
          bannerService.getAll({ is_active: true }),
        ]);

        if (prodRes.status === 'fulfilled' && prodRes.value.data) {
          const mapped = prodRes.value.data.map(mapProduct);
          // Allow all products. Products without images will use the fallback colored SVGs.
          setProducts(mapped);
        }
        if (catRes.status === 'fulfilled' && catRes.value) {
          setCategories(catRes.value);
        }
        if (banRes.status === 'fulfilled' && banRes.value.data) {
          setBanners(banRes.value.data);
        }
      } catch (e) {
        console.error('Failed to load data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const goToShop = () => router.push('/shop');
  const primaryColor = branding.primaryColor || '#22C55E';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">

      {/* ───── Premium Header (Noon/Amazon-style: full-width) ───── */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="px-3 sm:px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 shrink-0">
            {(branding.logo || '/logo.jpg') ? (
              <img src={branding.logo || '/logo.jpg'} className="h-10 sm:h-12 w-auto max-w-[160px] rounded-xl object-contain bg-white/10 p-1 shrink-0" alt={branding.storeName} />
            ) : (
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: branding.primaryColor || '#10B981' }}>
                <Store className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            )}
            <div className="flex flex-col justify-center whitespace-nowrap">
              <span className="font-black text-sm sm:text-base block text-gray-900 dark:text-white leading-tight">
                {branding.storeName || 'SAPKEY'}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 block">
                {branding.slogan || 'حلول ذكية للتجزئة'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/offers')}
              className="h-10 px-4 rounded-xl border border-gray-200/50 dark:border-slate-700/50 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-2 shadow-sm">
              <Percent className="h-4 w-4" />
              <span className="hidden sm:inline">العروض</span>
            </button>
            <button onClick={() => setShowAdminModal(true)}
              className="h-10 px-4 rounded-xl border border-gray-200/50 dark:border-slate-700/50 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">الإدارة</span>
            </button>
            <button onClick={goToShop}
              className="h-10 px-5 rounded-xl text-xs font-bold text-white shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
              style={{ backgroundColor: primaryColor }}>
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">تسوق الآن</span>
            </button>
          </div>
        </div>
      </header>

      {/* ───── Hero Slider (Noon-Style, full-width on desktop) ───── */}
      <section className="px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        <HeroBanner products={products} banners={banners} />
      </section>

      {/* ───── Categories Grid (full-width on desktop) ───── */}
      <section className="px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        <CategorySlider categories={categories} />
      </section>

      {/* ───── Product Sections (full-width on desktop) ───── */}
      {products.length > 0 && (
        <section className="px-3 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* First 12 products as offers */}
          <ProductScroll
            title="العروض الخاصة 🔥"
            icon={<Percent className="w-5 h-5 text-red-500" />}
            products={products.slice(0, 12)}
            accentColor="red"
          />

          {/* Products by category - dynamic */}
          {categories
            .filter(cat => cat.is_active)
            .slice(0, 4)
            .map(cat => {
              const catProducts = products.filter(p => p.categoryId === cat.id);
              if (catProducts.length === 0) return null;
              return (
                <ProductScroll
                  key={cat.id}
                  title={cat.name_ar}
                  icon={<Sparkles className="w-5 h-5 text-emerald-500" />}
                  products={catProducts.slice(0, 12)}
                  accentColor="emerald"
                />
              );
            })}

          {/* All Products */}
          <ProductScroll
            title="جميع المنتجات 🛒"
            icon={<ShoppingCart className="w-5 h-5 text-blue-500" />}
            products={products.slice(0, 20)}
            accentColor="blue"
          />
        </section>
      )}

      {/* ───── Features (full-width on desktop) ───── */}
      <section className="px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: Truck, title: 'توصيل سريع', desc: 'لباب البيت', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { icon: Gift, title: 'عروض يومية', desc: 'خصومات مستمرة', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
            { icon: Shield, title: 'جودة مضمونة', desc: 'منتجات طازجة', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { icon: Headphones, title: 'دعم 24/7', desc: 'خدمة عملاء', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 text-center shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2 sm:mb-3`}>
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${color}`} />
              </div>
              <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{title}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── CTA Section (full-width on desktop) ───── */}
      <section className="px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={goToShop}
            className="group relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-right shadow-lg hover:shadow-xl transition-all h-[400px]">
            <div className="absolute inset-0 w-full h-full">
              {/* Dynamic CTA Banner Carousel */}
              {(branding.ctaBannerImages && branding.ctaBannerImages.length > 0 ? branding.ctaBannerImages : ['/supermarket_hero_banner_1779831187973.png']).map((img, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 w-full h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: i === currentCtaScene % (branding.ctaBannerImages?.length || 1) ? 1 : 0 }}
                  transition={{ duration: 1 }}
                >
                  <img src={img} alt="Smart Supermarket" className="absolute inset-0 w-full h-full object-cover" />
                </motion.div>
              ))}
              <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/40 to-black/20"></div>
            </div>
            <div className="relative z-10 flex flex-col justify-end h-full">
              <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full w-max mb-4 shadow-glow">تسوق ذكي</div>
              <h2 className="text-2xl sm:text-4xl font-black text-white mb-2 leading-tight">تسوّق من <br />سوبر ماركت المستقبل!</h2>
              <p className="text-emerald-50 max-w-sm mb-6 text-sm sm:text-base text-shadow-sm">استمتع بتجربة شراء ذاتية، ومنتجات طازجة، وتوصيل فوري لطلباتك.</p>
              <div className="flex items-center gap-2 text-white bg-white/20 backdrop-blur-md px-5 py-3 rounded-xl w-max border border-white/30 hover:bg-white/30 transition-colors">
                <span className="font-bold">ابدأ التسوق الآن</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </motion.button>


          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowAdminModal(true)}
            className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-600 to-green-700 p-6 sm:p-8 text-right shadow-lg hover:shadow-xl transition-all">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
            <div className="relative">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center mb-3 sm:mb-4">
                <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mb-2">دخول الإدارة</h3>
              <p className="text-xs sm:text-sm text-white/80 mb-3 sm:mb-4">لوحة التحكم، نقاط البيع، المخزون، المحاسبة</p>
              <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">دخول <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" /></div>
            </div>
          </motion.button>
        </div>
      </section>

      {/* ───── Info Bar (full-width on desktop) ───── */}
      <section className="bg-white dark:bg-slate-900 border-t border-gray-100/50 dark:border-slate-800/50">
        <div className="px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">مواعيد العمل</p>
                <p className="text-[10px] sm:text-xs text-gray-400">يومياً من 8 صباحاً - 12 منتصف الليل</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">العنوان</p>
                <p className="text-[10px] sm:text-xs text-gray-400">مصر - القاهرة</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">تواصل معنا</p>
                <a href={`https://wa.me/${branding.whatsapp || '2010XXXXXXX'}`} target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" /> واتساب
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Professional Footer ───── */}
      <Footer />

      {/* ───── Admin Code Modal ───── */}
      <AnimatePresence>
        {showAdminModal && (
          <AdminCodeModal
            onClose={() => setShowAdminModal(false)}
            onSuccess={() => { setShowAdminModal(false); toast.success('تم التحقق بنجاح'); router.push('/login'); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
