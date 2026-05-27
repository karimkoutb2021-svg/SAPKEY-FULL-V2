import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const origin = url.origin;
    const res = await fetch(`${origin}/version.json`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) throw new Error('Failed to fetch version');
    const serverVersion = await res.json();
    return NextResponse.json(serverVersion, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Version check unavailable' }, { status: 500 });
  }
}
