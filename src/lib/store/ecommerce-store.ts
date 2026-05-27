'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EcommerceCartItem, ShippingAddress, Coupon, WishlistItem } from '@/types';

// ==============================
// CART STORE
// ==============================
interface CartState {
  items: EcommerceCartItem[];
  couponCode: string | null;
  couponDiscount: number;
  appliedCoupon: Coupon | null;
  addItem: (item: EcommerceCartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotal: (deliveryFee?: number, taxRate?: number) => { subtotal: number; discount: number; deliveryFee: number; tax: number; total: number };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      couponDiscount: 0,
      appliedCoupon: null,

      addItem: (item) => {
        const items = get().items;
        const key = item.variantId || item.productId;
        const existing = items.find((i) => (i.variantId || i.productId) === key);
        if (existing) {
          set({
            items: items.map((i) =>
              (i.variantId || i.productId) === key
                ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.maxQuantity || 99) }
                : i
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity: Math.min(item.quantity, item.maxQuantity || 99) }] });
        }
      },

      removeItem: (productId, variantId) => {
        set({ items: get().items.filter((i) => {
          const key = variantId || productId;
          return (i.variantId || i.productId) !== key;
        }) });
      },

      updateQuantity: (productId, quantity, variantId) => {
        set({
          items: get().items
            .map((i) => {
              const key = variantId || productId;
              return (i.variantId || i.productId) === key
                ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQuantity || 99)) }
                : i;
            })
        });
      },

      clearCart: () => set({ items: [], couponCode: null, couponDiscount: 0, appliedCoupon: null }),

      applyCoupon: (coupon) => {
        set({ couponCode: coupon.code, appliedCoupon: coupon });
      },

      removeCoupon: () => set({ couponCode: null, couponDiscount: 0, appliedCoupon: null }),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      getDiscount: () => {
        const { appliedCoupon, getSubtotal } = get();
        if (!appliedCoupon) return 0;
        const subtotal = getSubtotal();
        if (appliedCoupon.minPurchase && subtotal < appliedCoupon.minPurchase) return 0;
        let discount = appliedCoupon.type === 'percentage'
          ? subtotal * (appliedCoupon.discountValue / 100)
          : appliedCoupon.discountValue;
        if (appliedCoupon.maxDiscount) discount = Math.min(discount, appliedCoupon.maxDiscount);
        return discount;
      },

      getTotal: (deliveryFee = 0, taxRate = 0) => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscount();
        const afterDiscount = subtotal - discount;
        const tax = afterDiscount * (taxRate / 100);
        const total = afterDiscount + tax + deliveryFee;
        return { subtotal, discount, deliveryFee, tax, total };
      },
    }),
    { name: 'ecommerce-cart' }
  )
);

// ==============================
// WISHLIST STORE
// ==============================
interface WishlistState {
  items: WishlistItem[];
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => void;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addToWishlist: (productId) => {
        if (get().items.find((i) => i.productId === productId)) return;
        set({ items: [...get().items, { productId, addedAt: Date.now() }] });
      },
      removeFromWishlist: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),
      isInWishlist: (productId) => !!get().items.find((i) => i.productId === productId),
      toggleWishlist: (productId) => {
        if (get().isInWishlist(productId)) get().removeFromWishlist(productId);
        else get().addToWishlist(productId);
      },
      clearWishlist: () => set({ items: [] }),
    }),
    { name: 'ecommerce-wishlist' }
  )
);

// ==============================
// CHECKOUT STORE
// ==============================
interface CheckoutState {
  shippingAddress: ShippingAddress | null;
  paymentMethod: 'cod' | 'card' | 'online' | 'wallet';
  notes: string;
  currentStep: 'cart' | 'shipping' | 'payment' | 'review' | 'confirmation';
  lastOrder: any | null;
  setShippingAddress: (address: ShippingAddress) => void;
  setPaymentMethod: (method: 'cod' | 'card' | 'online' | 'wallet') => void;
  setNotes: (notes: string) => void;
  setStep: (step: 'cart' | 'shipping' | 'payment' | 'review' | 'confirmation') => void;
  setLastOrder: (order: any) => void;
  reset: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      shippingAddress: null,
      paymentMethod: 'cod',
      notes: '',
      currentStep: 'cart',
      lastOrder: null,
      setShippingAddress: (address) => set({ shippingAddress: address }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setNotes: (notes) => set({ notes }),
      setStep: (step) => set({ currentStep: step }),
      setLastOrder: (order) => set({ lastOrder: order }),
      reset: () => set({ shippingAddress: null, paymentMethod: 'cod', notes: '', currentStep: 'cart', lastOrder: null }),
    }),
    { name: 'ecommerce-checkout' }
  )
);
