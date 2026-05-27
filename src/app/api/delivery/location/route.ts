import { NextResponse } from 'next/server';

// Store latest driver locations (in production: use Firestore realtime)
const driverLocations: Record<string, { lat: number; lng: number; updatedAt: number }> = {};

export async function POST(request: Request) {
  try {
    const { driverId, lat, lng } = await request.json();

    if (!driverId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing location data' }, { status: 400 });
    }

    driverLocations[driverId] = { lat, lng, updatedAt: Date.now() };

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get('driverId');

  if (driverId) {
    const location = driverLocations[driverId];
    if (!location) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }
    return NextResponse.json(location);
  }

  return NextResponse.json(driverLocations);
}
