import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { deliveryId, status, driverId, notes } = await request.json();

    if (!deliveryId || !status) {
      return NextResponse.json({ error: 'Missing deliveryId or status' }, { status: 400 });
    }

    const validStatuses = ['assigned', 'picked', 'in_transit', 'delivered', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // In production: update Firestore delivery document
    // await updateDocument('deliveries', deliveryId, { status, updatedAt: Date.now() });

    // If delivered, trigger WhatsApp notification
    if (status === 'delivered') {
      // await sendOrderCompleted(...)
    }

    return NextResponse.json({
      success: true,
      deliveryId,
      status,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
