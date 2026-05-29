import { uploadImage as cloudinaryUpload } from '@/lib/cloudinary';

export async function uploadImage(file: File, folder = 'products'): Promise<string> {
  const url = await cloudinaryUpload(file, folder);
  return url;
}

export async function deleteImage(url: string): Promise<void> {
  if (!url || !url.includes('cloudinary.com')) return;

  const res = await fetch('/api/cloudinary/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'فشل حذف الصورة');
  }
}

export const IMAGE_SIZES = {
  product: { width: 800, height: 800 },
  category: { width: 400, height: 300 },
  banner: { width: 1920, height: 600 },
  thumbnail: { width: 200, height: 200 },
};
