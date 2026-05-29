import { NextResponse } from 'next/server';
import crypto from 'crypto';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dhv9lgmys';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const match = url.match(/\/v\d+\/(.+?)\.(jpg|jpeg|png|gif|webp|svg)$/);
    const pathMatch = url.match(/\/image\/upload\/(?:.+\/)?(.+?)(?:\.\w+)?$/);
    const publicId = match ? match[1].replace(/^.+?\//, '') : pathMatch ? pathMatch[1] : null;

    if (!publicId) {
      return NextResponse.json({ error: 'Could not extract public_id' }, { status: 400 });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const signature = crypto
      .createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`)
      .digest('hex');

    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', API_KEY);
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.result === 'ok') {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: data.result || 'Delete failed' }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
