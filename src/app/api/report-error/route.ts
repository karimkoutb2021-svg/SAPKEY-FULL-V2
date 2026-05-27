import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subject, report, results, source, managerName, managerPhone, managerEmail } = body;

    if (!subject || !report) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminEmail = 'admin@sapkey.com';
    // رقم المطور — من branding store أو fallback
    const adminWhatsApp = process.env.DEVELOPER_WHATSAPP || '201061935361';

    // 1. Store in Supabase via system health API
    let stored = false;
    try {
      const healthRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/system/health-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, report, results, source }),
      });
      const healthData = await healthRes.json();
      stored = healthData.stored;
    } catch {}

    // 2. Send WhatsApp to admin (from the system business number)
    let whatsappSent = false;
    try {
      const reportBody = results?.map((r: any) => `[${r.status?.toUpperCase()}] ${r.label}: ${r.message}${r.latency ? ` (${r.latency}ms)` : ''}`).join('\n') || report.substring(0, 1000);
      const managerInfo = managerName ? `\n\nمن: ${managerName}${managerPhone ? ` (${managerPhone})` : ''}` : '';

      const whatsappRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: adminWhatsApp,
          type: 'text',
          text: `⚠️ SAPKEY — تقرير نظام\n${subject}\n\n📤 من: ${managerName || 'النظام'}${managerPhone ? ` (${managerPhone})` : ''}\n📥 إلى: رقم المطور\n\n${reportBody}\n\n— نظام SAPKEY SOLUTIONS`,
        }),
      });
      whatsappSent = whatsappRes.ok;
    } catch {}

    // 3. Try email via Resend
    let emailSent = false;
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'SAPKEY System <system@sapkey-solutions.com>',
            to: adminEmail,
            subject: subject,
            text: `${report}\n\n${managerName ? `المرسل: ${managerName}\nالهاتف: ${managerPhone || '—'}\nالبريد: ${managerEmail || '—'}\n` : ''}`,
          }),
        });
        emailSent = emailRes.ok;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      stored,
      whatsappSent,
      emailSent,
      message: stored ? 'System report stored and sent to admin.' : 'Report processed (storage unavailable).',
    });
  } catch (err: any) {
    console.error('Report error API failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
