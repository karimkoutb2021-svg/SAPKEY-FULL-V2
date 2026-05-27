#!/bin/bash
# =============================================
# SuperMarket ERP - Deployment Script (Linux/Mac)
# =============================================

set -e

echo ""
echo "============================================"
echo "   SuperMarket ERP - Deployment"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK]${NC} $1"
    else
        echo -e "${RED}[ERROR]${NC} $1 failed!"
        exit 1
    fi
}

# 1. Check Node.js
echo -e "${CYAN}[1/5]${NC} Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js required. Install Node.js 20+${NC}"; exit 1; }
echo -e "${GREEN}[OK]${NC} Node.js $(node --version)"

command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm required${NC}"; exit 1; }
echo -e "${GREEN}[OK]${NC} npm $(npm --version)"

# 2. Environment
echo -e "${CYAN}[2/5]${NC} Setting up environment..."
if [ ! -f .env.local ]; then
    if [ -f .env.local.example ]; then
        cp .env.local.example .env.local
        echo -e "${YELLOW}[WARN]${NC} Created .env.local - please update your credentials!"
    fi
fi

# 3. Install dependencies
echo -e "${CYAN}[3/5]${NC} Installing dependencies..."
npm install
check "Dependencies"

if [ -f functions/package.json ]; then
    (cd functions && npm install)
    check "Functions dependencies"
fi

# 4. Build
echo -e "${CYAN}[4/5]${NC} Building application..."
npm run build
check "Build"

# 5. Deploy
echo -e "${CYAN}[5/5]${NC} Deploying to Firebase..."

# Check firebase-tools
if ! command -v firebase &> /dev/null; then
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
fi

echo ""
echo "Select deployment:"
echo "  1) Full deployment"
echo "  2) Hosting only"
echo "  3) Functions only"
echo "  4) Check only"
read -p "Enter choice (1-4): " choice

case $choice in
    1) firebase deploy --force ;;
    2) firebase deploy --only hosting ;;
    3) firebase deploy --only functions ;;
    4) echo -e "${GREEN}Check complete!${NC}" ;;
    *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
esac

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   DEPLOYMENT SUCCESSFUL! 🚀${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
