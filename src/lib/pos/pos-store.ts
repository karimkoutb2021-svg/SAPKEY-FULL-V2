'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { orderService } from '@/lib/supabase/services/orders';

export interface POSCartItem {
  productId: string;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  barcode: string;
  image?: string;
  unit: string;
  taxRate: number;
  itemDiscount: number;
  itemDiscountType: 'none' | 'percentage' | 'fixed';
  total: number;
}

export interface SplitPayment {
  method: 'cash' | 'card' | 'wallet' | 'credit';
  amount: number;
  dueDate?: string;
}

export interface POSOrder {
  id: string;
  order_number?: string;
  items: POSCartItem[];
  subtotal: number;
  orderDiscount: number;
  orderDiscountType: 'none' | 'percentage' | 'fixed';
  taxTotal: number;
  taxRate: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: 'cash' | 'card' | 'online' | 'wallet' | 'credit' | 'mixed';
  splitPayments: SplitPayment[];
  customerId?: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  status: 'completed' | 'refunded' | 'partial_refund';
  createdAt: number;
  paymentDetails?: any;
}

interface POSState {
  cart: POSCartItem[];
  orderDiscount: number;
  orderDiscountType: 'none' | 'percentage' | 'fixed';
  taxRate: number;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: 'cash' | 'card' | 'online' | 'wallet' | 'credit' | 'mixed';
  splitPayments: SplitPayment[];
  paidAmount: number;
  notes: string;
  completedOrders: POSOrder[];
  lastOrder: POSOrder | null;
  offlineQueue: POSOrder[];

  addToCart: (item: POSCartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setItemDiscount: (productId: string, type: 'none' | 'percentage' | 'fixed', value: number) => void;
  clearCart: () => void;

  setOrderDiscount: (type: 'none' | 'percentage' | 'fixed', value: number) => void;
  setTaxRate: (rate: number) => void;
  completeOrder: () => Promise<POSOrder>;
  refundOrder: (orderId: string) => void;

  setCustomer: (id: string | undefined, name: string, phone: string) => void;
  setPaymentMethod: (method: 'cash' | 'card' | 'online' | 'wallet' | 'credit' | 'mixed') => void;
  setSplitPayments: (payments: SplitPayment[]) => void;
  setPaidAmount: (amount: number) => void;
  setNotes: (notes: string) => void;

  getSubtotal: () => number;
  getOrderDiscountAmount: () => number;
  getTaxTotal: () => number;
  getTotal: () => number;
  getChange: () => number;

  addToOfflineQueue: (order: POSOrder) => void;
  processOfflineQueue: () => Promise<void>;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      cart: [],
      orderDiscount: 0,
      orderDiscountType: 'none',
      taxRate: 14,
      customerName: '',
      customerPhone: '',
      paymentMethod: 'cash',
      splitPayments: [],
      paidAmount: 0,
      notes: '',
      completedOrders: [],
      lastOrder: null,
      offlineQueue: [],

      addToCart: (item) => {
        const cart = get().cart || [];
        const existing = cart.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            cart: cart.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity, total: (i.quantity + item.quantity) * i.price }
                : i
            ),
          });
        } else {
          set({ cart: [...cart, { ...item, total: item.price * item.quantity }] });
        }
      },

      removeFromCart: (productId) =>
        set({ cart: (get().cart || []).filter((i) => i.productId !== productId) }),

      updateQuantity: (productId, quantity) =>
        set({
          cart: (get().cart || [])
            .map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.max(1, quantity), total: Math.max(1, quantity) * i.price }
                : i
            ),
        }),

      setItemDiscount: (productId, type, value) =>
        set({
          cart: (get().cart || []).map((i) =>
            i.productId === productId ? { ...i, itemDiscount: value, itemDiscountType: type } : i
          ),
        }),

      clearCart: () =>
        set({
          cart: [], orderDiscount: 0, orderDiscountType: 'none',
          customerId: undefined, customerName: '', customerPhone: '',
          paidAmount: 0, notes: '', splitPayments: [],
        }),

      setOrderDiscount: (type, value) => set({ orderDiscount: value, orderDiscountType: type }),
      setTaxRate: (rate) => set({ taxRate: rate }),

      completeOrder: async () => {
        const state = get();
        const orderNumber = await orderService.generateOrderNumber();

        const total = state.getTotal();
        const paidAmount = state.paidAmount || total;

        const order: POSOrder = {
          id: `POS-${Date.now()}`,
          order_number: orderNumber,
          items: [...(state.cart || [])],
          subtotal: state.getSubtotal(),
          orderDiscount: state.orderDiscount,
          orderDiscountType: state.orderDiscountType,
          taxTotal: state.getTaxTotal(),
          taxRate: state.taxRate,
          total,
          paidAmount,
          changeAmount: Math.max(0, paidAmount - total),
          paymentMethod: state.paymentMethod,
          splitPayments: state.splitPayments,
          customerId: state.customerId,
          customerName: state.customerName,
          customerPhone: state.customerPhone,
          notes: state.notes,
          status: 'completed',
          createdAt: Date.now(),
        };

        try {
          await orderService.create({
            order_number: orderNumber,
            items: state.cart || [],
            subtotal: state.getSubtotal(),
            tax_total: state.getTaxTotal(),
            discount: state.orderDiscount,
            total,
            paid_amount: paidAmount,
            change_amount: Math.max(0, paidAmount - total),
            payment_method: state.paymentMethod,
            customer_id: state.customerId || undefined,
            customer_name: state.customerName || 'ضيف',
            customer_phone: state.customerPhone || '',
            notes: state.notes || '',
            status: 'completed',
          });
        } catch (error) {
          console.error('Failed to save order to Supabase:', error);
        }

        const orders = [order, ...(state.completedOrders || [])].slice(0, 100);
        set({ completedOrders: orders, lastOrder: order });
        state.clearCart();
        return order;
      },

      refundOrder: (orderId) => {
        set({
          completedOrders: (get().completedOrders || []).map((o) =>
            o.id === orderId ? { ...o, status: 'refunded' as const } : o
          ),
        });
      },

      setCustomer: (id, name, phone) => set({ customerId: id, customerName: name, customerPhone: phone }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setSplitPayments: (payments) => set({ splitPayments: payments }),
      setPaidAmount: (amount) => set({ paidAmount: amount }),
      setNotes: (notes) => set({ notes }),

      getSubtotal: () => (get().cart || []).reduce((sum, i) => sum + i.price * i.quantity, 0),
      getOrderDiscountAmount: () => {
        const state = get();
        const s = state.getSubtotal();
        if (state.orderDiscountType === 'none') return 0;
        if (state.orderDiscountType === 'percentage') return s * (state.orderDiscount / 100);
        return state.orderDiscount;
      },
      getTaxTotal: () => {
        const state = get();
        const subtotal = state.getSubtotal();
        const disc = state.getOrderDiscountAmount();
        return (subtotal - disc) * (state.taxRate / 100);
      },
      getTotal: () => {
        const subtotal = get().getSubtotal();
        const disc = get().getOrderDiscountAmount();
        const tax = get().getTaxTotal();
        return Math.max(0, subtotal - disc + tax);
      },
      getChange: () => Math.max(0, (get().paidAmount || get().getTotal()) - get().getTotal()),

      addToOfflineQueue: (order) => set({ offlineQueue: [...(get().offlineQueue || []), order] }),
      processOfflineQueue: async () => {
        set({ offlineQueue: [] });
      },
    }),
    {
      name: 'pos-store',
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('POS store rehydration failed, clearing corrupted state');
          try { localStorage.removeItem('pos-store'); } catch {}
        }
        if (state && !Array.isArray(state.cart)) state.cart = [];
        if (state && !Array.isArray(state.completedOrders)) state.completedOrders = [];
        if (state && !Array.isArray(state.offlineQueue)) state.offlineQueue = [];
        if (state && typeof state.taxRate !== 'number') state.taxRate = 14;
      },
    }
  )
);
