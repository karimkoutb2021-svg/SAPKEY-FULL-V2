import { NextResponse } from 'next/server';

// Simulated payment processing
export async function POST(request: Request) {
  try {
    const { method, amount, orderId, token } = await request.json();

    if (!method || !amount) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }

    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 1000));

    const paymentResult = {
      success: true,
      transactionId: `TXN-${Date.now()}`,
      method,
      amount,
      status: 'completed',
      orderId,
      timestamp: Date.now(),
    };

    return NextResponse.json(paymentResult);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment failed' },
      { status: 500 }
    );
  }
}
