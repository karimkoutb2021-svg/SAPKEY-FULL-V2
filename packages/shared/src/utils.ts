import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('ج.م.‏', 'ج.م');
}

export function formatDate(date: number | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

export function formatDateTime(date: number | Date): string {
  return new Date(date).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPhone(phone: string): string {
  return phone.replace(/^(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
}

export function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`;
}

export function generateOrderNumber(branchCode: string = '00'): string {
  const now = new Date();
  const seq = Date.now().toString(36).toUpperCase().slice(-4);
  return `ORD-${branchCode}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${seq}`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${seq}`;
}

export function getStockStatus(current: number, min: number): { label: string; labelAr: string; color: string } {
  if (current <= 0) return { label: 'Out of Stock', labelAr: 'نفذ من المخزون', color: 'text-red-600 bg-red-100' };
  if (current <= min) return { label: 'Low Stock', labelAr: 'مخزون منخفض', color: 'text-amber-600 bg-amber-100' };
  return { label: 'In Stock', labelAr: 'متوفر', color: 'text-emerald-600 bg-emerald-100' };
}

export function getOrderStatusLabel(status: string): { label: string; labelAr: string; color: string } {
  const map: Record<string, { label: string; labelAr: string; color: string }> = {
    pending: { label: 'Pending', labelAr: 'قيد الانتظار', color: 'bg-amber-100 text-amber-800' },
    confirmed: { label: 'Confirmed', labelAr: 'مؤكد', color: 'bg-blue-100 text-blue-800' },
    preparing: { label: 'Preparing', labelAr: 'قيد التحضير', color: 'bg-indigo-100 text-indigo-800' },
    ready: { label: 'Ready', labelAr: 'جاهز', color: 'bg-green-100 text-green-800' },
    delivered: { label: 'Delivered', labelAr: 'تم التوصيل', color: 'bg-emerald-100 text-emerald-800' },
    cancelled: { label: 'Cancelled', labelAr: 'ملغي', color: 'bg-red-100 text-red-800' },
    refunded: { label: 'Refunded', labelAr: 'مسترجع', color: 'bg-gray-100 text-gray-800' },
  };
  return map[status] || map.pending;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function parseQueryString(query: string): Record<string, string> {
  const params = new URLSearchParams(query);
  const result: Record<string, string> = {};
  params.forEach((value, key) => { result[key] = value; });
  return result;
}
