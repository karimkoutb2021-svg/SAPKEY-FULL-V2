import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' جنيه';
}

export function formatDate(date: number | Date, format: 'short' | 'long' = 'short'): string {
  const d = new Date(date);
  if (format === 'short') {
    return d.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return d.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatPhone(phone: string): string {
  return phone.replace(/^(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function generateOrderNumber(branchCode: string): string {
  const date = new Date();
  const seq = Date.now().toString(36).toUpperCase().slice(-4);
  return `ORD-${branchCode}-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${seq}`;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const seq = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INV-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${seq}`;
}

export function getStockStatus(current: number, min: number): { label: string; color: string; labelAr: string } {
  if (current <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800', labelAr: 'نفذ من المخزون' };
  if (current <= min) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', labelAr: 'مخزون منخفض' };
  return { label: 'In Stock', color: 'bg-green-100 text-green-800', labelAr: 'متوفر' };
}

export function formatWeight(kg: number): string {
  if (kg < 1) return `${(kg * 1000).toFixed(0)} جم`;
  const whole = Math.floor(kg);
  const grams = Math.round((kg - whole) * 1000);
  if (grams === 0) return `${whole} كجم`;
  return `${whole}.${String(grams).padStart(3, '0')} كجم`;
}

export function getOrderStatusConfig(status: string): { label: string; labelAr: string; color: string } {
  const map: Record<string, { label: string; labelAr: string; color: string }> = {
    pending: { label: 'Pending', labelAr: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'Confirmed', labelAr: 'مؤكد', color: 'bg-blue-100 text-blue-800' },
    preparing: { label: 'Preparing', labelAr: 'قيد التحضير', color: 'bg-indigo-100 text-indigo-800' },
    ready: { label: 'Ready', labelAr: 'جاهز', color: 'bg-green-100 text-green-800' },
    delivered: { label: 'Delivered', labelAr: 'تم التوصيل', color: 'bg-emerald-100 text-emerald-800' },
    cancelled: { label: 'Cancelled', labelAr: 'ملغي', color: 'bg-red-100 text-red-800' },
    refunded: { label: 'Refunded', labelAr: 'مسترجع', color: 'bg-gray-100 text-gray-800' },
    completed: { label: 'Completed', labelAr: 'مكتمل', color: 'bg-green-100 text-green-800' },
    paid: { label: 'Paid', labelAr: 'مدفوع', color: 'bg-emerald-100 text-emerald-800' },
  };
  return map[status] || map.pending;
}
