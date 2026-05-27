# 🏪 SuperMarket ERP Platform

**Enterprise Supermarket ERP + Ecommerce + POS + Delivery + AI Voice + WhatsApp Automation**

## 📋 Architecture

```
supermarket-platform/
├── apps/                          # Applications
│   ├── admin-dashboard/           # Admin & Manager dashboard (port 3000)
│   ├── customer-pwa/              # Customer ecommerce PWA (port 3001)
│   ├── pos-system/                # POS cashier system (port 3002)
│   └── delivery-app/              # Delivery driver app (port 3003)
├── packages/                      # Shared packages
│   ├── ui/                        # UI components (Button, Card, etc.)
│   ├── auth/                      # Authentication & authorization
│   ├── firebase/                  # Firebase client & admin SDK
│   ├── shared/                    # Types, utilities, constants
│   └── hooks/                     # React hooks (useDocument, etc.)
├── functions/                     # Firebase Cloud Functions
│   └── src/
│       ├── index.ts               # Main functions entry
│       ├── auth.ts                # Auth functions
│       ├── orders.ts              # Order processing
│       ├── notifications.ts       # Push & notification logic
│       └── whatsapp.ts            # WhatsApp integration
├── docker/
│   ├── Dockerfile                 # Production Dockerfile
│   ├── docker-compose.yml         # Multi-service setup
│   └── nginx.conf                 # Reverse proxy config
├── firestore.rules                # Firestore security rules
├── storage.rules                  # Storage security rules
├── firebase.json                  # Firebase project config
├── firestore.indexes.json         # Firestore indexes
├── turbo.json                     # Turborepo configuration
└── package.json                   # Root workspace config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm 11+
- Firebase project with enabled services

### Installation

```bash
# Clone and install
git clone <repo-url>
cd supermarket-platform
npm run setup

# Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your Firebase credentials

# Start development
npm run dev
```

### Individual Apps

```bash
# Admin Dashboard (port 3000)
cd apps/admin-dashboard && npm run dev

# Customer PWA (port 3001)
cd apps/customer-pwa && npm run dev

# POS System (port 3002)
cd apps/pos-system && npm run dev

# Delivery App (port 3003)
cd apps/delivery-app && npm run dev
```

## 🔥 Firebase Setup

### 1. Create Firebase Project
```bash
npm install -g firebase-tools
firebase login
firebase init
```

### 2. Enable Services
- **Authentication**: Email/Password, Google, Phone
- **Firestore**: Create database (start in test mode)
- **Storage**: Set up default bucket
- **Functions**: Deploy Cloud Functions
- **Messaging**: Enable Cloud Messaging API

### 3. Configure Environment
```env
# Required
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Optional
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
WHATSAPP_API_KEY=your-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-key
```

### 4. Deploy
```bash
# Deploy everything
npm run deploy:all

# Or deploy individually
npm run deploy:firestore
npm run deploy:functions
npm run deploy:hosting
```

### 5. Emulators (Local Development)
```bash
npm run emulators
# UI: http://localhost:4000
# Auth: http://localhost:9099
# Firestore: http://localhost:8080
```

## 📦 Firestore Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `users` | User accounts & roles | `role`, `permissions`, `status` |
| `userRoles` | Role-based permissions | `role`, `permissions[]` |
| `products` | Product catalog | `nameAr`, `price`, `barcode`, `categoryId` |
| `categories` | Product categories | `nameAr`, `parentId`, `sortOrder` |
| `branches` | Multi-branch | `nameAr`, `address`, `active` |
| `warehouses` | Multi-warehouse | `nameAr`, `branchId`, `capacity` |
| `inventory` | Stock tracking | `productId`, `warehouseId`, `quantity` |
| `stockMovements` | Inventory history | `type`, `quantity`, `reference` |
| `expiryRecords` | Expiry tracking | `expiryDate`, `status`, `batchNo` |
| `suppliers` | Supplier management | `nameAr`, `phone`, `taxNumber` |
| `customers` | Customer profiles | `points`, `totalSpent`, `totalOrders` |
| `orders` | Orders (POS + Online) | `status`, `total`, `paymentMethod` |
| `invoices` | Invoice records | `total`, `status`, `type` |
| `deliveries` | Delivery tracking | `driverId`, `status`, `proofUrl` |
| `transactions` | Accounting entries | `type`, `amount`, `branchId` |
| `notifications` | Push notifications | `type`, `read`, `role[]` |
| `dailyReports` | Daily sales reports | `totalSales`, `totalOrders` |
| `analyticsEvents` | Analytics tracking | `event`, `data`, `timestamp` |
| `fcmTokens` | Push notification tokens | `token`, `deviceInfo` |
| `settings` | System configuration | `storeName`, `taxRate`, `currency` |

## 🔐 Roles & Permissions

| Role | Level | Access |
|---|---|---|
| **Admin** | 100 | Full system access |
| **Manager** | 80 | Branch/store management |
| **Accountant** | 70 | Financial & accounting |
| **Cashier** | 50 | POS & sales |
| **Warehouse** | 50 | Inventory & warehouse |
| **Sales** | 50 | Sales & customers |
| **Delivery** | 40 | Delivery & order tracking |
| **Supplier** | 30 | Product supply |
| **Customer** | 10 | Online store |

## 🧩 Core Features

### 🛒 POS System (`/pos`)
- Touch-optimized interface
- Barcode scanner (keyboard wedge + camera)
- QR code scanning
- Arabic voice ordering
- Receipt printing (thermal + browser)
- Offline support with IndexedDB
- Instant invoice generation

### 📱 Ecommerce (`/shop`)
- Product catalog with categories
- Shopping cart + checkout
- COD + Online payment
- Order tracking
- Smart AI search
- Product recommendations
- Favorites/Wishlist

### 🏢 Warehouse (`/warehouse`, `/inventory`)
- Multi-warehouse management
- Inventory transfer between warehouses
- Batch tracking
- Expiry date tracking
- Low stock alerts
- Stock movement history
- Real-time sync

### 📊 Accounting (`/accounting`)
- Journal entries (debit/credit)
- Expense tracking by category
- Treasury/cash management
- Bank accounts & reconciliation
- Profit & Loss statements
- Tax management (VAT 15%)
- Payroll management
- Financial reports (Balance Sheet, Cash Flow)

### 🚚 Delivery (`/delivery`)
- Admin delivery dashboard
- Driver mobile-first dashboard
- GPS location tracking
- Status updates (assigned → delivered)
- Proof of delivery (photo + signature)
- Real-time order tracking

### 🎤 AI Voice (`/ai-ordering`)
- Arabic speech recognition
- Continuous listening mode
- Smart order parsing (quantities, weights)
- Product matching with fuzzy search
- Text-to-speech confirmation
- Voice ordering widget for POS

### 💬 WhatsApp (`/whatsapp`)
- Order confirmation messages
- Delivery notifications
- Order completed messages
- Admin alerts (new order, low stock)
- Message templates (5 templates)
- Webhook for incoming messages
- Auto-reply system

### 📱 PWA
- Installable on mobile/desktop
- Offline support
- Service worker caching
- Push notifications
- Background sync
- Splash screen

## 🐳 Docker

```bash
# Development with emulators
docker-compose --profile dev up

# Production
docker-compose --profile production up

# Build and run
docker build -f docker/Dockerfile -t supermarket:latest .
docker run -p 3000:3000 supermarket:latest
```

## 📊 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **State** | Zustand 5 |
| **Data** | @tanstack/react-query |
| **Animation** | Framer Motion 12 |
| **Icons** | Lucide React |
| **Backend** | Firebase (Auth, Firestore, Storage, Functions, Messaging) |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |
| **Monorepo** | Turborepo |
| **Container** | Docker + docker-compose |
| **Payment** | COD + Online (Stripe/Mada) |

## 📄 License

MIT © SuperMarket Platform
