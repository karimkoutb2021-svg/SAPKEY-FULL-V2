const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcBuf);
  const crcBuf2 = Buffer.alloc(4);
  crcBuf2.writeUInt32BE(crc >>> 0);
  return Buffer.concat([len, typeBuf, data, crcBuf2]);
}

function createPNG(size, outputPath) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  
  const radius = size * 0.15;
  const pixelData = [];
  
  for (let y = 0; y < size; y++) {
    pixelData.push(0);
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      const dx = Math.min(x, size - 1 - x);
      const dy = Math.min(y, size - 1 - y);
      
      if (dx < radius && dy < radius) {
        const dist = Math.sqrt((radius - dx) ** 2 + (radius - dy) ** 2);
        if (dist > radius) {
          pixelData.push(0, 0, 0, 0);
          continue;
        }
      }
      
      r = 37; g = 99; b = 235; a = 255;
      
      const cx = size / 2;
      const cy = size / 2;
      const tw = size * 0.35;
      const th = size * 0.25;
      
      if (Math.abs(x - cx) < tw && Math.abs(y - cy) < th) {
        r = 255; g = 255; b = 255;
      }
      
      pixelData.push(r, g, b, a);
    }
  }
  
  const compressed = zlib.deflateSync(Buffer.from(pixelData));
  
  const png = Buffer.concat([
    signature,
    createChunk('IHDR', ihdrData),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0))
  ]);
  
  fs.writeFileSync(outputPath, png);
  console.log(`Created ${outputPath} (${size}x${size})`);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

createPNG(192, path.join(iconsDir, 'icon-192.png'));
createPNG(512, path.join(iconsDir, 'icon-512.png'));
createPNG(192, path.join(__dirname, '..', 'public', 'apple-touch-icon.png'));
console.log('Done!');
