import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient<any, any>;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase().slice(-6)}`

    // Insert order into Supabase
    const { data, error } = await getSupabase()
      .from('orders')
      .insert([
        {
          order_number: orderNumber,
          customer_name: body.shippingAddress.fullName,
          phone: body.shippingAddress.phone,
          city: body.shippingAddress.city,
          district: body.shippingAddress.district,
          street: body.shippingAddress.street,
          building: body.shippingAddress.building,
          payment_method: body.paymentMethod,
          subtotal: body.subtotal,
          delivery_fee: body.deliveryFee,
          tax_amount: body.taxAmount,
          total: body.total,
          notes: body.notes,
          items: body.items,
          status: 'pending'
        }
      ])
      .select()

    if (error) {
      console.error('Supabase order error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    const order = data[0]

    // Create notification for admin/manager
    try {
      await getSupabase().from('notifications').insert({
        type: 'new_order',
        title: 'طلب جديد',
        message: `طلب جديد #${orderNumber} من ${body.shippingAddress.fullName} - ${formatCurrency(body.total)}`,
        action_url: `/orders/${order.id}`,
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
          customer_name: body.shippingAddress.fullName,
          total: body.total,
          payment_method: body.paymentMethod
        }
      })
    } catch (notifError) {
      console.error('Notification error:', notifError)
      // Don't fail the order if notification fails
    }

    // Send WhatsApp notification to store owner (if configured)
    try {
      const whatsappNumber = process.env.STORE_WHATSAPP_NUMBER
      if (whatsappNumber) {
        const itemsList = body.items.map((item: any) => 
          `• ${item.nameAr} x${item.quantity} = ${formatCurrency(item.price * item.quantity)}`
        ).join('\n')

        const message = `🧾 *طلب جديد #${orderNumber}*\n👤 ${body.shippingAddress.fullName}\n📞 ${body.shippingAddress.phone}\n📍 ${body.shippingAddress.city}، ${body.shippingAddress.district}\n━━━━━━━━━━\n${itemsList}\n━━━━━━━━━━\n💰 الإجمالي: ${formatCurrency(body.total)}\n💳 الدفع: ${body.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : body.paymentMethod === 'card' ? 'بطاقة ائتمان' : 'دفع إلكتروني'}`

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://sapkey-grocery.edgeone.cool'}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: whatsappNumber,
            message
          })
        }).catch(() => {})
      }
    } catch (waError) {
      console.error('WhatsApp error:', waError)
    }

    return NextResponse.json({
      success: true,
      order
    })

  } catch (e) {
    console.error('Checkout server error:', e)
    return NextResponse.json({
      success: false,
      error: 'server error'
    }, { status: 500 })
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
  }).format(amount).replace('ج.م.‏', 'ج.م')
}
