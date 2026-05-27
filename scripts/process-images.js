const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const artifactsDir = 'C:/Users/PC/.gemini/antigravity/brain/80dde2b1-812d-473c-bf45-000dc833f292';
const publicDir = path.join(__dirname, '../public/images');
const bannersDir = path.join(publicDir, 'banners');
const categoriesDir = path.join(publicDir, 'categories');

if (!fs.existsSync(bannersDir)) fs.mkdirSync(bannersDir, { recursive: true });
if (!fs.existsSync(categoriesDir)) fs.mkdirSync(categoriesDir, { recursive: true });

const images = [
  { source: 'supermarket_hero_banner_1779831187973.png', dest: 'banners/hero-1.webp', type: 'banner' },
  { source: 'premium_produce_banner_1779831574099.png', dest: 'banners/hero-2.webp', type: 'banner' },
  { source: 'premium_bakery_banner_1779831591927.png', dest: 'banners/hero-3.webp', type: 'banner' },
  { source: 'dairy_category_1779831208388.png', dest: 'categories/dairy.webp', type: 'category' },
  { source: 'media__1779826366180.png', dest: 'categories/meat.webp', type: 'category' },
];

async function processImages() {
  for (const img of images) {
    const sourcePath = path.join(artifactsDir, img.source);
    if (!fs.existsSync(sourcePath)) {
      console.log(`Missing ${sourcePath}`);
      continue;
    }
    const destPath = path.join(publicDir, img.dest);
    try {
      const s = sharp(sourcePath);
      // For banners make them 1920x1080 style, categories smaller
      if (img.type === 'banner') {
        await s.resize(1920, 1080, { fit: 'cover' }).webp({ quality: 80 }).toFile(destPath);
      } else {
        await s.resize(800, 800, { fit: 'cover' }).webp({ quality: 80 }).toFile(destPath);
      }
      console.log(`Processed ${img.dest}`);
    } catch (e) {
      console.error(`Error processing ${img.dest}:`, e);
    }
  }
}

processImages();
