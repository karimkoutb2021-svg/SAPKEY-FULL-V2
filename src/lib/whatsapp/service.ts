'use client';

// ==============================
// WHATSAPP CLOUD API SERVICE
// ==============================

const WHATSAPP_API_VERSION = 'v18.0';

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessPhone: string;
}

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'interactive';
  content: any;
}

export function getWhatsAppConfig(): WhatsAppConfig | null {
  if (typeof window !== 'undefined') return null;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_API_KEY;
  const businessPhone = process.env.WHATSAPP_PHONE_NUMBER;
  if (!phoneNumberId || !accessToken || !businessPhone) return null;
  return { phoneNumberId, accessToken, businessPhone };
}

// ==============================
// SEND MESSAGE
// ==============================
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getWhatsAppConfig();
  if (!config) return { success: false, error: 'WhatsApp not configured' };

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${config.phoneNumberId}/messages`;

  const body: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: message.to,
    type: message.type,
  };

  body[message.type] = message.content;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (data.error) {
      return { success: false, error: data.error.message || 'WhatsApp API error' };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

// ==============================
// SEND TEXT
// ==============================
export async function sendText(to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendWhatsAppMessage({ to, type: 'text', content: { body: text, preview_url: false } });
}

// ==============================
// SEND TEMPLATE
// ==============================
export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'ar',
  components?: any[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const content: any = {
    name: templateName,
    language: { code: languageCode },
  };
  if (components) content.components = components;

  return sendWhatsAppMessage({ to, type: 'template', content });
}

// ==============================
// SEND INTERACTIVE
// ==============================
export async function sendInteractiveButtons(
  to: string,
  headerText: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendWhatsAppMessage({
    to,
    type: 'interactive',
    content: {
      type: 'button',
      header: { type: 'text', text: headerText },
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
      },
    },
  });
}

// ==============================
// SEND ORDER CONFIRMATION
// ==============================
export async function sendOrderConfirmation(
  to: string,
  orderNumber: string,
  customerName: string,
  total: number,
  items: string,
  estimatedDelivery: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const text = `🛒 *تأكيد الطلب - ${orderNumber}*\n\nمرحباً ${customerName}،\n\nتم استلام طلبك بنجاح! ✅\n\n📋 *المنتجات:* ${items}\n💰 *الإجمالي:* ${total} ج.م\n🚚 *التوصيل المتوقع:* ${estimatedDelivery}\n\nسنقوم بإعلامك عند تجهيز الطلب.\n\nشكراً لتسوقك معنا! 🌟`;

  return sendText(to, text);
}

// ==============================
// SEND DELIVERY NOTIFICATION
// ==============================
export async function sendDeliveryUpdate(
  to: string,
  orderNumber: string,
  customerName: string,
  status: 'assigned' | 'picked' | 'in_transit' | 'delivered',
  driverName?: string,
  estimatedTime?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let text = '';

  switch (status) {
    case 'assigned':
      text = `🚚 *تحديث التوصيل - ${orderNumber}*\n\nمرحباً ${customerName}،\n\nتم تعيين مندوب التوصيل ${driverName || ''} لطلبك.\nسيتم التوصيل قريباً.`;
      break;
    case 'picked':
      text = `📦 *تم التحميل - ${orderNumber}*\n\nمرحباً ${customerName}،\n\nتم تحميل طلبك في مركبة التوصيل.`;
      break;
    case 'in_transit':
      text = `🚚 *في الطريق - ${orderNumber}*\n\nمرحباً ${customerName}،\n\nمندوب التوصيل في الطريق إليك!\n🕐 الوقت المتوقع: ${estimatedTime || 'قريباً'}`;
      break;
    case 'delivered':
      text = `✅ *تم التوصيل - ${orderNumber}*\n\nمرحباً ${customerName}،\n\nتم توصيل طلبك بنجاح! 🎉\n\nنتمنى لك يوماً سعيداً 🌟\n\nقيم تجربتك: https://supermarket.app/rate/${orderNumber}`;
      break;
  }

  return sendText(to, text);
}

// ==============================
// SEND ORDER COMPLETED
// ==============================
export async function sendOrderCompleted(
  to: string,
  orderNumber: string,
  customerName: string,
  total: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const text = `✅ *تم اكتمال الطلب - ${orderNumber}*\n\nمرحباً ${customerName}،\n\nتم اكتمال طلبك بنجاح! 🎉\n\n📋 رقم الطلب: ${orderNumber}\n💰 الإجمالي المدفوع: ${total} ج.م\n\nنشكرك على ثقتك بنا! 🌟\n\nنتطلع لخدمتك مرة أخرى 🙏`;

  return sendText(to, text);
}

// ==============================
// SEND ADMIN ALERT
// ==============================
export async function sendAdminAlert(
  alertType: 'new_order' | 'low_stock' | 'system_error' | 'daily_report',
  details: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getWhatsAppConfig();
  if (!config) return { success: false, error: 'Not configured' };

  let text = '';

  switch (alertType) {
    case 'new_order':
      text = `🔔 *طلب جديد*\n\nرقم الطلب: ${details.orderNumber || '-'}\nالعميل: ${details.customerName || '-'}\nالمبلغ: ${details.total || 0} ج.م\nالوقت: ${new Date().toLocaleString('ar-EG')}`;
      break;
    case 'low_stock':
      text = `⚠️ *تنبيه مخزون منخفض*\n\nالمنتج: ${details.productName || '-'}\nالكمية المتبقية: ${details.quantity || 0}\nالحد الأدنى: ${details.minStock || 0}\nالمستودع: ${details.warehouse || '-'}`;
      break;
    case 'system_error':
      text = `🚨 *خطأ في النظام*\n\nالخطأ: ${details.error || '-'}\nالوقت: ${new Date().toLocaleString('ar-EG')}\nالرجاء المراجعة فوراً!`;
      break;
    case 'daily_report':
      text = `📊 *التقرير اليومي*\n\n📅 ${details.date || new Date().toLocaleDateString('ar-EG')}\n💰 المبيعات: ${details.totalSales || 0} ج.م\n📋 الطلبات: ${details.totalOrders || 0}\n👥 العملاء: ${details.newCustomers || 0}\n⚠️ مخزون منخفض: ${details.lowStock || 0}`;
      break;
  }

  // Send to admin number
  return sendText(config.businessPhone, text);
}

// ==============================
// VERIFY WEBHOOK TOKEN
// ==============================
export function verifyWebhookToken(
  mode: string | null,
  token: string | null,
  challenge: string | null
): string | null {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode === 'subscribe' && token === verifyToken) {
    return challenge;
  }
  return null;
}

// ==============================
// PARSE INCOMING MESSAGE
// ==============================
export function parseIncomingMessage(body: any): {
  from: string;
  messageType: string;
  text?: string;
  buttonId?: string;
  mediaUrl?: string;
} | null {
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages?.[0];

    if (!messages) return null;

    const from = messages.from;
    const type = messages.type;

    if (type === 'text') {
      return { from, messageType: 'text', text: messages.text.body };
    }

    if (type === 'interactive' && messages.interactive?.button_reply) {
      return { from, messageType: 'button', buttonId: messages.interactive.button_reply.id, text: messages.interactive.button_reply.title };
    }

    if (type === 'interactive' && messages.interactive?.list_reply) {
      return { from, messageType: 'list', buttonId: messages.interactive.list_reply.id, text: messages.interactive.list_reply.title };
    }

    return { from, messageType: type };
  } catch {
    return null;
  }
}
