const CLOUD_NAME = 'dhv9lgmys';
const UPLOAD_PRESET = 'rpytrgb6';

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
    throw new Error(`فشل رفع الصورة: ${err}`);
  }

  const data = await res.json();
  return data.secure_url as string;
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
