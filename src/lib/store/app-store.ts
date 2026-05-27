'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  barcode: string;
  image?: string;
  unit: string;
  taxRate: number;
  discount: number;
}

interface POSState {
  cart: CartItem[];
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  paymentMethod: 'cash' | 'card' | 'online' | 'wallet';
  notes: string;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  setCustomer: (id: string | undefined, name: string, phone: string, address?: string) => void;
  setPaymentMethod: (method: 'cash' | 'card' | 'online' | 'wallet') => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTaxTotal: () => number;
  getTotal: () => number;
}

interface AppSettings {
  sidebarOpen: boolean;
  language: 'ar' | 'en';
  toggleSidebar: () => void;
  setLanguage: (lang: 'ar' | 'en') => void;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      cart: [],
      customerName: '',
      customerPhone: '',
      paymentMethod: 'cash',
      notes: '',
      addToCart: (item) => {
        const cart = get().cart;
        const existing = cart.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            cart: cart.map((i) =>
              i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i
            ),
          });
        } else {
          set({ cart: [...cart, item] });
        }
      },
      removeFromCart: (productId) => set({ cart: get().cart.filter((i) => i.productId !== productId) }),
      updateQuantity: (productId, quantity) =>
        set({ cart: get().cart.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, quantity) } : i)).filter((i) => i.quantity > 0) }),
      updateDiscount: (productId, discount) =>
        set({ cart: get().cart.map((i) => (i.productId === productId ? { ...i, discount } : i)) }),
      setCustomer: (id, name, phone, address) => set({ customerId: id, customerName: name, customerPhone: phone, customerAddress: address }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setNotes: (notes) => set({ notes }),
      clearCart: () => set({ cart: [], customerId: undefined, customerName: '', customerPhone: '', notes: '' }),
      getSubtotal: () => get().cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      getTaxTotal: () => get().cart.reduce((sum, item) => sum + (item.price * item.quantity * item.taxRate) / 100, 0),
      getTotal: () => {
        const state = get();
        const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = state.cart.reduce((sum, item) => sum + (item.price * item.quantity * item.taxRate) / 100, 0);
        return subtotal + tax;
      },
    }),
    { name: 'pos-cart' }
  )
);

export const useAppStore = create<AppSettings>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      language: 'ar',
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'app-settings' }
  )
);
