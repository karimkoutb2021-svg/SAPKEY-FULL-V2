const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const buildId = process.env.VERCEL_GIT_COMMIT_SHA || 
  (require('child_process').execSync('git rev-parse --short HEAD 2>nul || echo dev').toString().trim());
const timestamp = Date.now();
const cacheName = `sm-cache-${buildId}-${timestamp}`;

const swTemplate = fs.readFileSync(path.join(__dirname, 'sw-template.js'), 'utf8');
const swContent = swTemplate
  .replace(/__BUILD_ID__/g, buildId)
  .replace(/__TIMESTAMP__/g, timestamp)
  .replace(/__CACHE_NAME__/g, cacheName);

const swPath = path.join(__dirname, '..', 'public', 'sw.js');
fs.writeFileSync(swPath, swContent);

console.log(`Service Worker generated: ${cacheName}`);
