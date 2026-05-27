import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const deliveryId = formData.get('deliveryId') as string;
    const photo = formData.get('photo') as File | null;
    const signature = formData.get('signature') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!deliveryId) {
      return NextResponse.json({ error: 'Missing deliveryId' }, { status: 400 });
    }

    let photoUrl = null;
    if (photo) {
      // In production: upload to Supabase Storage
      // const buffer = await photo.arrayBuffer();
      // photoUrl = await uploadFile(`deliveries/${deliveryId}/proof.jpg`, Buffer.from(buffer));
      photoUrl = `proof_${deliveryId}_${Date.now()}`;
    }

    return NextResponse.json({
      success: true,
      deliveryId,
      photoUrl,
      hasSignature: !!signature,
      notes,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
