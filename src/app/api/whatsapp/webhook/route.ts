import { NextRequest, NextResponse } from 'next/server';

// ===== GET: Webhook Verification (Meta/Facebook) =====
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// ===== POST: Incoming Messages =====
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log incoming webhook for debugging
    console.log('WhatsApp Webhook received:', JSON.stringify(body).slice(0, 500));

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;
    const contacts = value?.contacts;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: 'ok' });
    }

    for (const message of messages) {
      const from = message.from; // sender phone
      const msgType = message.type;

      let responseText = '';

      if (msgType === 'text') {
        const incomingText = message.text?.body?.trim();
        responseText = await handleIncomingText(from, incomingText);
      } else if (msgType === 'interactive') {
        const buttonReply = message.interactive?.button_reply;
        if (buttonReply) {
          responseText = await handleButtonReply(from, buttonReply.id, buttonReply.title);
        }
      }

      // Send reply if needed
      if (responseText) {
        await sendWhatsAppReply(from, responseText);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'ok' }); // Always return 200 to WhatsApp
  }
}

async function handleIncomingText(from: string, text: string): Promise<string> {
  const lowerText = text?.toLowerCase() || '';

  if (lowerText.includes('طلب') || lowerText.includes('order')) {
    return `مرحباً! 👋\nللتحقق من حالة طلبك، الرجاء إرسال رقم الطلب.\nمثال: طلب ORD-12345`;
  }

  if (lowerText.includes('سعر') || lowerText.includes('price') || lowerText.includes('كم')) {
    return `للحصول على أسعار المنتجات، يرجى زيارة متجرنا:\nhttps://supermarket.app/shop\nأو يمكنك التواصل مع خدمة العملاء.`;
  }

  if (lowerText.includes('شكوى') || lowerText.includes('مشكلة') || lowerText.includes('help')) {
    return `نأسف للإزعاج! 🙏\nسيتم التواصل معك من قبل فريق خدمة العملاء قريباً.\nأو يمكنك الاتصال على: 19XXX`;
  }

  if (lowerText.includes('موقع') || lowerText.includes('location') || lowerText.includes('عنوان')) {
    return `📍 عنوان المتجر:\nالقاهرة، مصر\nشارع النيل\n\nيمكنك زيارتنا يومياً من 8 صباحاً إلى 11 مساءً`;
  }

  // Default response
  return `مرحباً بك في السوبر ماركت الذكي! 🌟\n\nللخدمات المتاحة:\n• أرسل "طلب" للاستفسار عن طلب\n• أرسل "سعر" لاستفسار عن الأسعار\n• أرسل "شكوى" للتواصل مع الدعم\n• أرسل "موقع" لمعرفة عنواننا\n\nكيف يمكننا مساعدتك؟ 😊`;
}

async function handleButtonReply(from: string, buttonId: string, title: string): Promise<string> {
  if (buttonId === 'track_order') {
    return `أدخل رقم الطلب لتتبعه:\nمثال: ORD-12345`;
  }
  if (buttonId === 'talk_to_agent') {
    return `سيتم تحويلك إلى خدمة العملاء قريباً. الرجاء الانتظار...`;
  }
  if (buttonId === 'view_products') {
    return `تصفح منتجاتنا:\nhttps://supermarket.app/shop`;
  }
  return `شكراً لتواصلك! 😊`;
}

async function sendWhatsAppReply(to: string, text: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_API_KEY;

  if (!phoneNumberId || !accessToken) return;

  try {
    await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text, preview_url: true },
      }),
    });
  } catch {}
}
