import { NextResponse } from 'next/server';

const WHATSAPP_API_VERSION = 'v18.0';

export async function POST(request: Request) {
  try {
    const { to, type, template, variables, text } = await request.json();

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_API_KEY;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_API_KEY in env.' },
        { status: 400 }
      );
    }

    if (!to) {
      return NextResponse.json({ success: false, error: 'Recipient phone number required' }, { status: 400 });
    }

    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

    let body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/^0/, '20').replace(/[^0-9]/g, ''),
    };

    if (type === 'template' && template) {
      body.type = 'template';
      body.template = {
        name: template,
        language: { code: 'ar' },
      };
      if (variables?.length > 0) {
        body.template.components = [{
          type: 'body',
          parameters: variables.map((v: string) => ({ type: 'text', text: v })),
        }];
      }
    } else {
      body.type = 'text';
      body.text = { body: text || '', preview_url: true };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { success: false, error: data.error.message || 'WhatsApp API error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data.messages?.[0]?.id,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
