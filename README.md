# Menu QR — Restaurant QR Code App

A full-stack restaurant app with a customer-facing QR menu and an admin dashboard.

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

---

## Prerequisites

- Node.js 18+
- A MongoDB database — local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/menu_qr"
JWT_SECRET="change_this_to_a_long_random_secret"
JWT_EXPIRES_IN="7d"
PORT=3000
```

### 3. Seed the admin user

Creates the default admin account in the database:

```bash
npm run seed
```

Default credentials:
- **Email:** `admin@restaurant.com`
- **Password:** `admin123`

> Change the password after first login.

---

## Running the App

### Development

```bash
npm run dev
```

Starts the Express server (port 3000) with Vite middleware for hot module reload.
Open [http://localhost:3000](http://localhost:3000)

### Production

```bash
npm run build   # Build the React frontend
npm start       # Serve the built app via Express
```

---

## Project Structure

```
├── backend/
│   ├── config/
│   │   ├── db.ts           # MongoDB connection
│   │   └── env.ts          # Environment variable validation
│   ├── controllers/        # Route handlers
│   ├── middleware/
│   │   ├── auth.ts         # JWT verification
│   │   ├── validate.ts     # Zod request validation
│   │   └── errorHandler.ts # Global error handler
│   ├── models/             # Mongoose models
│   │   ├── User.ts
│   │   ├── MenuItem.ts
│   │   ├── Category.ts
│   │   ├── Order.ts
│   │   ├── Reservation.ts
│   │   └── Review.ts
│   ├── routes/
│   │   ├── api.ts          # All resource routes
│   │   └── auth.ts         # Login / logout
│   ├── schemas/            # Zod validation schemas
│   ├── scripts/
│   │   └── seed.ts         # Admin user seeder
│   ├── services/           # Business logic / DB queries
│   ├── socket/
│   │   └── index.ts        # Socket.io setup
│   └── server.ts           # Express + Vite + Socket.io entry point
├── dashboard/              # Admin dashboard (React)
└── src/                    # Customer app (React)
```

---

## API Reference

### Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/auth/logout` | — | Logout (stateless) |

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
| GET | `/api/orders/:id` | — | Get order (for status tracking) |
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

### Stats

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/stats` | Admin | Dashboard statistics |

---

## Real-time Events (Socket.io)

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `admin:join` | — | Join the admin room (dashboard) |
| `order:join` | `orderId: string` | Join an order room (status tracking) |

### Server → Client

| Event | Payload | Who receives |
|-------|---------|-------------|
| `order:new` | Order object | Admin room |
| `order:status` | `{ id, status }` | Order room + admin room |
| `reservation:new` | Reservation object | Admin room |
| `review:new` | Review object | Admin room |

---

## Admin Dashboard

Access the dashboard by tapping **Admin Access** at the bottom of the home screen and logging in with your admin credentials.

The dashboard is desktop-only and includes:
- Overview stats
- Order management with Kitchen Display System (KDS)
- Menu & category management
- Reservation management
- Review moderation
- Analytics
