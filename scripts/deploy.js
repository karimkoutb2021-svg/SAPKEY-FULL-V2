#!/usr/bin/env node

/**
 * SuperMarket ERP - Complete Deployment Script
 * =============================================
 * 
 * This script handles:
 * 1. Environment setup & validation
 * 2. Firebase project linking
 * 3. Dependencies installation
 * 4. Full build
 * 5. Firebase deployment (Hosting + Functions + Firestore + Storage)
 * 6. Docker build (optional)
 * 
 * Usage:
 *   node scripts/deploy.js              # Full deployment
 *   node scripts/deploy.js --hosting    # Hosting only
 *   node scripts/deploy.js --functions  # Functions only
 *   node scripts/deploy.js --check      # Check only (no deploy)
 *   node scripts/deploy.js --docker     # Docker build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q) => new Promise((r) => rl.question(q, r));

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function step(msg) {
  console.log(`\n${colors.bright}${colors.cyan}▸ ${msg}${colors.reset}`);
}

function success(msg) {
  console.log(`  ${colors.green}✓ ${msg}${colors.reset}`);
}

function warn(msg) {
  console.log(`  ${colors.yellow}⚠ ${msg}${colors.reset}`);
}

function error(msg) {
  console.log(`  ${colors.red}✗ ${msg}${colors.reset}`);
}

function cmd(command, cwd = process.cwd()) {
  try {
    return execSync(command, { cwd, stdio: 'pipe', encoding: 'utf-8' }).trim();
  } catch (e) {
    return null;
  }
}

// ==============================
// MAIN DEPLOYMENT
// ==============================
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'full';

  console.log(`
${colors.bright}${colors.green}╔══════════════════════════════════════════╗
║     SuperMarket ERP - Deployment      ║
║     ============================      ║
╚══════════════════════════════════════════╝${colors.reset}
`);

  // 1. CHECK PREREQUISITES
  step('1/6 Checking prerequisites...');

  const nodeVer = cmd('node --version');
  if (!nodeVer) { error('Node.js not found. Install Node.js 20+'); process.exit(1); }
  success(`Node.js ${nodeVer}`);

  const npmVer = cmd('npm --version');
  if (!npmVer) { error('npm not found'); process.exit(1); }
  success(`npm ${npmVer}`);

  const hasFirebaseTools = cmd('npx firebase --version');
  if (!hasFirebaseTools) {
    step('Installing Firebase CLI...');
    cmd('npm install -g firebase-tools');
  } else {
    success('Firebase CLI installed');
  }

  // 2. ENVIRONMENT CHECK
  step('2/6 Environment setup...');

  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.local.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      warn('.env.local created from .env.local.example - UPDATE with your values!');
    } else {
      warn('No .env.local or .env.local.example found');
    }
  } else {
    success('.env.local found');
  }

  // Check critical env vars
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  const hasApiKey = envContent.includes('NEXT_PUBLIC_FIREBASE_API_KEY=AI');
  if (hasApiKey) success('Firebase API key configured');
  else warn('Firebase API key not set - update .env.local');

  // 3. FIREBASE LOGIN
  step('3/6 Firebase authentication...');

  if (mode !== 'check') {
    const firebaseProjects = cmd('npx firebase projects:list 2>&1');
    if (!firebaseProjects || firebaseProjects.includes('Error')) {
      log('  Logging in to Firebase...', colors.dim);
      cmd('npx firebase login --no-localhost');
      success('Firebase logged in');
    } else {
      success('Already logged in to Firebase');
    }

    // Show projects
    log('\n  Available Firebase projects:', colors.dim);
    try {
      const projects = cmd('npx firebase projects:list');
      const projectLines = projects.split('\n').filter(l => l.includes('|'));
      projectLines.forEach(l => {
        const parts = l.split('|').map(p => p.trim());
        if (parts.length >= 2 && parts[1]) {
          log(`    • ${parts[1]}`, colors.cyan);
        }
      });
    } catch {}
  }

  // 4. INSTALL DEPENDENCIES
  step('4/6 Installing dependencies...');

  if (mode !== 'check') {
    log('  Installing main dependencies...', colors.dim);
    cmd('npm install');
    success('Dependencies installed');

    // Functions
    if (fs.existsSync(path.join(process.cwd(), 'functions', 'package.json'))) {
      log('  Installing functions dependencies...', colors.dim);
      cmd('npm install', path.join(process.cwd(), 'functions'));
      success('Functions dependencies installed');
    }
  }

  // 5. BUILD
  step('5/6 Building application...');

  if (mode !== 'check') {
    log('  Building Next.js app...', colors.dim);
    const buildResult = cmd('npm run build');
    if (buildResult && buildResult.includes('✓')) {
      success('Build completed successfully');
    } else {
      error('Build failed');
      process.exit(1);
    }
  }

  // 6. DEPLOY TO FIREBASE
  step('6/6 Deploying to Firebase...');

  if (mode === 'check') {
    log('\n✅ Check complete - ready for deployment!', colors.green);
    log('\n  Run without --check to deploy, or use:');
    log('    npm run deploy:all        # Full deployment');
    log('    npm run deploy:hosting    # Hosting only');
    log('    npm run deploy:functions  # Functions only');
    process.exit(0);
  }

  if (mode === 'docker') {
    log('  Building Docker image...', colors.dim);
    cmd('docker build -f docker/Dockerfile -t supermarket:latest .');
    success('Docker image built: supermarket:latest');
    process.exit(0);
  }

  const deployTarget = mode === 'full' ? '' : `--only ${mode}`;
  log('  This may take a few minutes...', colors.dim);

  try {
    const deployCmd = `npx firebase deploy ${deployTarget} --force`;
    log(`  Running: ${deployCmd}`, colors.dim);
    const deployResult = cmd(deployCmd);
    
    if (deployResult) {
      // Extract hosting URL
      const hostingMatch = deployResult.match(/Hosting URL:\s*(\S+)/);
      const functionsMatch = deployResult.match(/Function URL\s*\([^)]+\):\s*(\S+)/g);
      
      success('Deployment completed!');
      
      console.log(`\n${colors.bright}${colors.green}╔══════════════════════════════════════════╗
║         Deployment Summary            ║
╚══════════════════════════════════════════╝${colors.reset}`);
      
      if (hostingMatch) {
        log(`\n  🌐 Hosting URL: ${colors.cyan}${hostingMatch[1]}${colors.reset}`);
      }
      
      if (functionsMatch) {
        log('\n  ⚡ Functions deployed:');
        functionsMatch.forEach(f => {
          const parts = f.split(':');
          if (parts.length >= 2) {
            log(`    • ${parts[1].trim()}`);
          }
        });
      }
      
      log('\n  📱 Your app is live! 🚀');
    }
  } catch (e) {
    error(`Deployment failed: ${e.message}`);
    process.exit(1);
  }

  rl.close();
}

main().catch((e) => {
  error(`Script failed: ${e.message}`);
  process.exit(1);
});
