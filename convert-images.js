const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = "C:\\Users\\PC\\.gemini\\antigravity\\brain\\80dde2b1-812d-473c-bf45-000dc833f292";
const outputDir = "C:\\Users\\PC\\Downloads\\31.01.2026 Koshary\\14.05.2026 open\\public\\images";

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function convert() {
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.png'));
  for (const file of files) {
    if (!file.includes('produce') && !file.includes('bakery')) continue;

    const inputPath = path.join(inputDir, file);
    let outputName = 'converted_' + file.replace('.png', '.webp');
    
    // Normalize names for use in our DB
    if (file.includes('produce')) {
      outputName = 'produce-banner.webp';
    } else if (file.includes('bakery')) {
      outputName = 'bakery-banner.webp';
    }

    const outputPath = path.join(outputDir, outputName);
    
    await sharp(inputPath)
      .webp({ quality: 80 })
      .toFile(outputPath);
      
    console.log(`Converted ${file} -> /images/${outputName}`);
  }
}

convert().catch(console.error);
