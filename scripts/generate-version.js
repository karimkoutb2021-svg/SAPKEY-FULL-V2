const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const version = {
  buildId: process.env.VERCEL_GIT_COMMIT_SHA || execSync('git rev-parse --short HEAD 2>nul || echo dev').toString().trim(),
  timestamp: new Date().toISOString(),
  version: process.env.npm_package_version || '1.0.0',
};

const outputPath = path.join(process.cwd(), 'public', 'version.json');
fs.writeFileSync(outputPath, JSON.stringify(version, null, 2));

console.log(`Version file created: ${version.buildId} at ${version.timestamp}`);
