import { createClient } from '@/lib/supabase/client';
import { uploadImage as cloudinaryUpload, deleteImage as cloudinaryDelete } from '@/lib/cloudinary';

const supabase = createClient();
const BUCKET = 'storefront';

export async function uploadImage(file: File, path: string): Promise<string> {
  try {
    return await cloudinaryUpload(file, path);
  } catch (cloudinaryErr) {
    console.warn('[Storage] Cloudinary upload failed, falling back to Supabase Storage:', cloudinaryErr);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const fullPath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);
    return data.publicUrl;
  }
}

export async function deleteImage(url: string): Promise<void> {
  if (url.includes('cloudinary.com')) {
    try {
      await cloudinaryDelete(url);
      return;
    } catch (e) {
      console.warn('[Storage] Cloudinary delete failed, falling back:', e);
    }
  }

  const path = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (!path) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export function compressImage(file: File, maxWidth: number, maxHeight: number, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Canvas not supported'));

    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Compression failed'));
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}

export const IMAGE_SIZES = {
  product: { width: 800, height: 800 },
  category: { width: 400, height: 300 },
  banner: { width: 1920, height: 600 },
  thumbnail: { width: 200, height: 200 },
};
