'use client';

export interface TemplateVariable {
  name: string;
  example: string;
  description: string;
  descriptionAr: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: 'order_confirmation' | 'delivery' | 'completed' | 'alert' | 'promo';
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  variables: TemplateVariable[];
  enabled: boolean;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // ===== ORDER CONFIRMATION =====
  {
    id: 'order_confirmation',
    name: 'order_confirmation',
    category: 'order_confirmation',
    title: 'Order Confirmation',
    titleAr: 'تأكيد الطلب',
    body: `🛒 *Order Confirmation - {{order_number}}*

Hello {{customer_name}},

Your order has been received! ✅

📋 *Items:* {{items}}
💰 *Total:* {{total}} SAR
🚚 *Estimated Delivery:* {{estimated_time}}

We'll notify you when your order is ready.

Thank you for shopping with us! 🌟`,
    bodyAr: `🛒 *تأكيد الطلب - {{order_number}}*

مرحباً {{customer_name}}،

تم استلام طلبك بنجاح! ✅

📋 *المنتجات:* {{items}}
💰 *الإجمالي:* {{total}} ج.م
🚚 *التوصيل المتوقع:* {{estimated_time}}

سنقوم بإعلامك عند تجهيز الطلب.

شكراً لتسوقك معنا! 🌟`,
    variables: [
      { name: 'order_number', example: 'ORD-12345', description: 'Order number', descriptionAr: 'رقم الطلب' },
      { name: 'customer_name', example: 'Ahmed', description: 'Customer name', descriptionAr: 'اسم العميل' },
      { name: 'items', example: 'Coca Cola x3, Milk x1', description: 'Order items summary', descriptionAr: 'ملخص الطلب' },
      { name: 'total', example: '125.00', description: 'Order total', descriptionAr: 'إجمالي الطلب' },
      { name: 'estimated_time', example: '30 minutes', description: 'Estimated delivery time', descriptionAr: 'وقت التوصيل المتوقع' },
    ],
    enabled: true,
  },

  // ===== DELIVERY NOTIFICATION =====
  {
    id: 'delivery_update',
    name: 'delivery_update',
    category: 'delivery',
    title: 'Delivery Update',
    titleAr: 'تحديث التوصيل',
    body: `🚚 *Delivery Update - {{order_number}}*

Hello {{customer_name}},

{{status_message}}

👨‍🚀 Driver: {{driver_name}}
🕐 ETA: {{estimated_time}}

Track your order: {{tracking_url}}

Thank you for your patience! 🙏`,
    bodyAr: `🚚 *تحديث التوصيل - {{order_number}}*

مرحباً {{customer_name}}،

{{status_message}}

👨‍🚀 مندوب التوصيل: {{driver_name}}
🕐 الوقت المتوقع: {{estimated_time}}

تتبع طلبك: {{tracking_url}}

نشكرك على صبرك! 🙏`,
    variables: [
      { name: 'order_number', example: 'ORD-12345', description: 'Order number', descriptionAr: 'رقم الطلب' },
      { name: 'customer_name', example: 'Ahmed', description: 'Customer name', descriptionAr: 'اسم العميل' },
      { name: 'status_message', example: 'Your order is on the way!', description: 'Status update', descriptionAr: 'رسالة الحالة' },
      { name: 'driver_name', example: 'Khalid', description: 'Driver name', descriptionAr: 'اسم المندوب' },
      { name: 'estimated_time', example: '15 minutes', description: 'Estimated time', descriptionAr: 'الوقت المتوقع' },
      { name: 'tracking_url', example: 'https://...', description: 'Tracking URL', descriptionAr: 'رابط التتبع' },
    ],
    enabled: true,
  },

  // ===== ORDER COMPLETED =====
  {
    id: 'order_completed',
    name: 'order_completed',
    category: 'completed',
    title: 'Order Completed',
    titleAr: 'تم اكتمال الطلب',
    body: `✅ *Order Completed - {{order_number}}*

Hello {{customer_name}},

Your order has been delivered successfully! 🎉

📋 Order: {{order_number}}
💰 Paid: {{total}} SAR

Thank you for your trust! 🌟

Rate your experience: {{rating_url}}

We look forward to serving you again! 🙏`,
    bodyAr: `✅ *تم اكتمال الطلب - {{order_number}}*

مرحباً {{customer_name}}،

تم توصيل طلبك بنجاح! 🎉

📋 رقم الطلب: {{order_number}}
💰 المبلغ المدفوع: {{total}} ج.م

نشكرك على ثقتك بنا! 🌟

قيم تجربتك: {{rating_url}}

نتطلع لخدمتك مرة أخرى! 🙏`,
    variables: [
      { name: 'order_number', example: 'ORD-12345', description: 'Order number', descriptionAr: 'رقم الطلب' },
      { name: 'customer_name', example: 'Ahmed', description: 'Customer name', descriptionAr: 'اسم العميل' },
      { name: 'total', example: '125.00', description: 'Total paid', descriptionAr: 'المبلغ المدفوع' },
      { name: 'rating_url', example: 'https://...', description: 'Rating URL', descriptionAr: 'رابط التقييم' },
    ],
    enabled: true,
  },

  // ===== ADMIN ALERT =====
  {
    id: 'admin_new_order_alert',
    name: 'admin_new_order_alert',
    category: 'alert',
    title: 'New Order Alert',
    titleAr: 'تنبيه طلب جديد',
    body: `🔔 *New Order Alert*

Order: {{order_number}}
Customer: {{customer_name}}
Amount: {{total}} SAR
Items: {{items_count}} items
Time: {{time}}

Please process the order.`,
    bodyAr: `🔔 *تنبيه طلب جديد*

📋 رقم الطلب: {{order_number}}
👤 العميل: {{customer_name}}
💰 المبلغ: {{total}} ج.م
📦 المنتجات: {{items_count}}
🕐 الوقت: {{time}}

الرجاء تجهيز الطلب.`,
    variables: [
      { name: 'order_number', example: 'ORD-12345', description: 'Order number', descriptionAr: 'رقم الطلب' },
      { name: 'customer_name', example: 'Ahmed', description: 'Customer name', descriptionAr: 'اسم العميل' },
      { name: 'total', example: '125.00', description: 'Order total', descriptionAr: 'إجمالي الطلب' },
      { name: 'items_count', example: '5', description: 'Number of items', descriptionAr: 'عدد المنتجات' },
      { name: 'time', example: '10:30 AM', description: 'Order time', descriptionAr: 'وقت الطلب' },
    ],
    enabled: true,
  },

  // ===== LOW STOCK ALERT =====
  {
    id: 'low_stock_alert',
    name: 'low_stock_alert',
    category: 'alert',
    title: 'Low Stock Alert',
    titleAr: 'تنبيه مخزون منخفض',
    body: `⚠️ *Low Stock Alert*

Product: {{product_name}}
SKU: {{sku}}
Current Stock: {{current_stock}}
Min Stock: {{min_stock}}
Warehouse: {{warehouse}}

Please reorder soon!`,
    bodyAr: `⚠️ *تنبيه مخزون منخفض*

📦 المنتج: {{product_name}}
🏷️ SKU: {{sku}}
📊 المخزون الحالي: {{current_stock}}
📉 الحد الأدنى: {{min_stock}}
🏢 المستودع: {{warehouse}}

الرجاء إعادة الطلب قريباً!`,
    variables: [
      { name: 'product_name', example: 'Coca Cola', description: 'Product name', descriptionAr: 'اسم المنتج' },
      { name: 'sku', example: 'SKU001', description: 'Product SKU', descriptionAr: 'رمز المنتج' },
      { name: 'current_stock', example: '5', description: 'Current stock level', descriptionAr: 'المخزون الحالي' },
      { name: 'min_stock', example: '20', description: 'Minimum stock level', descriptionAr: 'الحد الأدنى' },
      { name: 'warehouse', example: 'Main', description: 'Warehouse name', descriptionAr: 'اسم المستودع' },
    ],
    enabled: true,
  },
];

export function getTemplateByCategory(category: MessageTemplate['category']): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find((t) => t.id === id);
}

export function fillTemplate(template: MessageTemplate, variables: Record<string, string>, useArabic: boolean = true): string {
  let text = useArabic ? template.bodyAr : template.body;
  for (const [key, value] of Object.entries(variables)) {
    text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return text;
}
