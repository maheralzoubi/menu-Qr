# Menu QR — Restaurant QR Code System

A full-stack restaurant platform. Customers scan a QR code at their table to browse the menu, order food, make reservations, and leave reviews. Owners manage everything through two separate dashboards.

---

## Architecture

```
menu_qr/
├── src/              → Customer QR app     (port 3000)
├── admin/            → Restaurant admin    (port 3001)
├── owner/            → App owner panel     (port 3002)
├── server/           → Express API         (port 3000)
└── public/uploads/   → Uploaded images
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT + bcrypt |
| Validation | Zod |
| Real-time | Socket.io |
| File upload | Multer |

---

## User Accounts — 3 Types

| Type | Logs into | Created by | Stored in |
|------|-----------|------------|-----------|
| **Customer** | Main app `localhost:3000` | Self-register or Owner panel | `customers` collection |
| **Restaurant Admin** | Admin dashboard `localhost:3001` | Owner panel → Restaurant Admins tab | `users` collection |
| **App Owner** | Owner panel `localhost:3002` | `npm run seed` | `users` collection |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
MONGODB_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/menu_qr"
JWT_SECRET="your-long-random-secret"
JWT_EXPIRES_IN="7d"
PORT=3000
```

### 3. Create the App Owner account

```bash
npm run seed
```

Credentials:
- **Email:** `superadmin@app.com`
- **Password:** `superadmin123`

---

## Running

Requires **3 terminals**:

```bash
# Terminal 1 — Backend API + Customer app
npm run dev

# Terminal 2 — Restaurant Admin Dashboard
npm run admin

# Terminal 3 — App Owner Panel
npm run owner
```

| App | URL | Login |
|-----|-----|-------|
| Customer QR app | http://localhost:3000 | Register in-app |
| Restaurant Admin | http://localhost:3001 | Created via Owner panel |
| App Owner Panel | http://localhost:3002 | `superadmin@app.com` |

---

## Project Structure

```
server/
├── config/
│   ├── db.ts               # MongoDB connection
│   └── env.ts              # Environment variable validation
├── controllers/            # Route handlers
│   ├── authController.ts
│   ├── customerController.ts
│   ├── ownerController.ts
│   ├── menuController.ts
│   ├── ordersController.ts
│   ├── reservationsController.ts
│   ├── reviewsController.ts
│   ├── categoriesController.ts
│   ├── statsController.ts
│   ├── analyticsController.ts
│   └── uploadController.ts
├── middleware/
│   ├── auth.ts             # JWT verify (admin + owner)
│   ├── customerAuth.ts     # JWT verify (customers)
│   ├── validate.ts         # Zod validation
│   └── errorHandler.ts     # Global error handler
├── models/
│   ├── User.ts             # Admin / staff / owner
│   ├── Customer.ts         # App customers
│   ├── MenuItem.ts
│   ├── Category.ts
│   ├── Order.ts
│   ├── Reservation.ts
│   └── Review.ts
├── routes/
│   ├── api.ts              # All resource routes
│   ├── auth.ts             # Admin login / profile
│   ├── customer.ts         # Customer register / login
│   └── owner.ts            # Owner-only routes
├── schemas/                # Zod validation schemas
├── scripts/
│   └── seed.ts             # Create initial owner account
├── socket/
│   └── index.ts            # Socket.io setup
└── server.ts               # Entry point
```

---

## API Reference

### Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/login` | — | Admin login, returns JWT |
| POST | `/api/auth/logout` | — | Logout |
| GET | `/api/auth/me` | Admin | Get current admin profile |
| PATCH | `/api/auth/me` | Admin | Update profile / password |

### Customer Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/customer/register` | — | Customer registration |
| POST | `/api/customer/login` | — | Customer login |
| GET | `/api/customer/me` | Customer | Get profile |
| PATCH | `/api/customer/me` | Customer | Update profile |

### Menu

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/menu` | — | List all items |
| GET | `/api/menu/:id` | — | Get single item |
| POST | `/api/menu` | Admin | Create item |
| PATCH | `/api/menu/:id` | Admin | Update item |
| DELETE | `/api/menu/:id` | Admin | Delete item |

### Categories

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/categories` | — | List categories |
| POST | `/api/categories` | Admin | Create category |
| PATCH | `/api/categories/:id` | Admin | Update category |
| DELETE | `/api/categories/:id` | Admin | Delete category |

### Orders

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/orders` | — | Place an order |
| GET | `/api/orders/:id` | — | Get order (status tracking) |
| GET | `/api/orders` | Admin | List all orders |
| PATCH | `/api/orders/:id/status` | Admin | Update order status |
| DELETE | `/api/orders/:id` | Admin | Delete order |

### Reservations

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/reservations` | — | Book a table |
| GET | `/api/reservations` | Admin | List all reservations |
| PATCH | `/api/reservations/:id/status` | Admin | Confirm / cancel |
| DELETE | `/api/reservations/:id` | Admin | Delete reservation |

### Reviews

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/reviews` | — | List all reviews |
| POST | `/api/reviews` | — | Submit a review |
| DELETE | `/api/reviews/:id` | Admin | Delete review |

### Stats & Analytics

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/stats` | Admin | Dashboard statistics |
| GET | `/api/analytics?days=7` | Admin | Detailed analytics |

### Upload

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/upload` | Admin | Upload menu item image |

### Owner Panel

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/owner/customers` | Owner | List all customers |
| POST | `/api/owner/customers` | Owner | Create customer |
| PATCH | `/api/owner/customers/:id/status` | Owner | Lock / unlock customer |
| DELETE | `/api/owner/customers/:id` | Owner | Delete customer |
| GET | `/api/owner/admins` | Owner | List restaurant admins |
| POST | `/api/owner/admins` | Owner | Create admin account |
| DELETE | `/api/owner/admins/:id` | Owner | Delete admin account |
| GET | `/api/owner/analytics` | Owner | Platform-wide analytics |

---

## Real-time Events (Socket.io)

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `admin:join` | — | Join admin room (dashboard) |
| `order:join` | `orderId: string` | Join order room (status tracking) |

### Server → Client

| Event | Payload | Who receives |
|-------|---------|-------------|
| `order:new` | Order object | Admin room |
| `order:status` | `{ id, status }` | Order room + admin room |
| `reservation:new` | Reservation object | Admin room |
| `review:new` | Review object | Admin room |

---

## Customer App (`localhost:3000`)

Screens accessible via the QR code:

- **Home** — featured dishes, book a table CTA
- **Menu** — browse by category, search, item details modal
- **Cart** — manage items, add tip
- **Payment** — confirm and place order
- **Order Status** — real-time status tracker + order history
- **Reviews** — read and write guest reviews
- **Reservation** — book a table with date / time / guests
- **Account** — register, login, view profile and order history

---

## Restaurant Admin Dashboard (`localhost:3001`)

| Tab | Features |
|-----|---------|
| Overview | KPI cards, revenue chart (7 days), top items, recent reviews |
| Orders | Live order feed, Kitchen Display System (KDS), status updates |
| Menu | Add / edit / delete dishes, image upload, dietary tags, categories |
| Reservations | Confirm / cancel bookings, table map |
| Reviews | Moderate reviews, sentiment breakdown |
| Analytics | Revenue trends, category breakdown, popular dining times |
| Settings | Edit profile, change password |

---

## App Owner Panel (`localhost:3002`)

| Tab | Features |
|-----|---------|
| Overview | Total customers, active / locked, new signups, revenue, orders |
| Customers | Add / delete customers, lock / unlock accounts |
| Restaurant Admins | Create / delete admin accounts for the dashboard |
| Analytics | Customer registration chart (7 days), platform metrics |
