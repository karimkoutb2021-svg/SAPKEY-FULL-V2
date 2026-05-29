const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dhv9lgmys';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'rpytrgb6';

export async function uploadImage(file: File, folder = 'products'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }

  const data = await res.json();
  return data.secure_url;
}

export async function deleteImage(url: string): Promise<void> {
  const publicId = extractPublicId(url);
  if (!publicId) return;

  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn('[Cloudinary] No API credentials for delete');
    return;
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = await generateSignature(`public_id=${publicId}&timestamp=${timestamp}`, apiSecret);

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', apiKey);
  formData.append('signature', signature);

  await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
    method: 'POST',
    body: formData,
  });
}

export function getOptimizedUrl(publicId: string, options: { width?: number; height?: number; quality?: number; format?: string } = {}): string {
  const { width, height, quality = 80, format = 'auto' } = options;
  let transformations = `q_${quality},f_${format}`;
  if (width && height) transformations = `c_fill,w_${width},h_${height},${transformations}`;
  else if (width) transformations = `w_${width},${transformations}`;
  else if (height) transformations = `h_${height},${transformations}`;

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations}/${publicId}`;
}

export function extractPublicId(url: string): string | null {
  const match = url.match(/\/v\d+\/(.+?)\.(jpg|jpeg|png|gif|webp|svg)$/);
  if (match) return match[1].replace(/^.+?\//, '');

  const pathMatch = url.match(/\/image\/upload\/(?:.+\/)?(.+?)(?:\.\w+)?$/);
  return pathMatch ? pathMatch[1] : null;
}

async function generateSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}
