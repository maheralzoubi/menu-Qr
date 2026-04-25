# Admin Dashboard — Specification

## Overview

This spec covers the admin dashboard (`localhost:3001`) for restaurant owners/staff. Each admin account is fully isolated to their own restaurant — created by the App Owner via the Owner Panel.

---

## Admin Login & Isolation

- Admin logs in at `localhost:3001` with the **email and password** created by the App Owner
- Their JWT contains `restaurantId` — every API call is automatically scoped to their restaurant
- They cannot see or access any data from other restaurants
- If the Owner deactivates their restaurant, login returns 403

---

## New Feature: QR for Table

### Purpose
Each physical table in the restaurant gets a unique QR code. When a customer scans it, they land directly on that restaurant's menu and the order is tagged with their table number.

---

### Table Data Model

```typescript
Table {
  _id:          ObjectId
  name:         string           // "Table 1", "VIP Room", "Patio 3"
  restaurantId: ObjectId
  manualStatus: 'occupied' | 'free' | null   // null = use automatic
  createdAt, updatedAt
}
```

**Status logic (priority order):**
1. If `manualStatus` is set → show that
2. Otherwise → check active orders: if any order with `tableNumber === table.name` has status `Pending | Preparing | Ready` → Occupied, else → Free

---

### QR URL Format

```
http://localhost:3000?restaurant={restaurantId}&table={tableName}
```

Example: `http://localhost:3000?restaurant=68105f2a...&table=Table%205`

---

### QR Tab — Admin Dashboard

**Location:** New tab in the admin sidebar — "QR for Table"

**Features:**

| Feature | Description |
|---------|-------------|
| Table list (grid) | Each table shown as a card |
| Table name | The name given when created |
| Status badge | Green "Free" or Amber "Occupied" |
| QR code image | Generated client-side, shows the encoded URL |
| Download button | Saves QR as PNG for printing |
| Delete button | Removes the table |
| Manual status toggle | Override to Free / Occupied / Auto |
| Add Table button | Opens inline form — enter table name → create |

---

### Table API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/tables?restaurantId=xxx` | Public | Customer app: get table list |
| `GET` | `/api/tables` | Admin | Admin: get own restaurant's tables with computed status |
| `POST` | `/api/tables` | Admin | Create a table |
| `DELETE` | `/api/tables/:id` | Admin | Delete a table |
| `PATCH` | `/api/tables/:id/status` | Admin | Set manual status override |

---

## Customer App Changes (QR Scan Flow)

### Problem
The customer app currently has no restaurant context. Scanning a QR code must pass `restaurantId` and `tableName` through the URL.

### URL entry point
`http://localhost:3000?restaurant=RESTAURANT_ID&table=TABLE_NAME`

### On app load
1. Read `restaurant` and `table` from URL query params
2. Persist to `localStorage` so page refresh keeps context
3. Fetch restaurant info from `GET /api/restaurants/:id/info`
4. If no `restaurantId` found in URL or localStorage → show "Scan a QR code" screen

### API calls updated to include restaurantId

| Call | Change |
|------|--------|
| `GET /api/menu` | Add `?restaurantId=xxx` |
| `GET /api/categories` | Add `?restaurantId=xxx` |
| `GET /api/reviews` | Add `?restaurantId=xxx` |
| `POST /api/orders` | Body includes `restaurantId`, `tableNumber` |
| `POST /api/reservations` | Body includes `restaurantId` |
| `POST /api/reviews` | Body includes `restaurantId` |
| `POST /api/customer/register` | Body includes `restaurantId` |
| `POST /api/customer/login` | Body includes `restaurantId` |

### Header display
- Shows: `{Restaurant Name} • {Table Name}` when table is known
- Shows: `{Restaurant Name}` when no table
- Shows: nothing on home screen

### No QR screen
If the app opens with no `restaurantId`, show a full-screen placeholder:
> "Welcome! Scan a QR code at your table to start ordering."

---

### New public endpoint

`GET /api/restaurants/:id/info`

Returns: `{ name, logo, status }` — used by the customer app to display the restaurant name in the header.

---

## Admin Dashboard — Additional Changes

### OrderManager updates
- **Table number visible** in each order card and in the detail panel
- **Filter by table** — dropdown: "All Tables" → each table name → filters the order list

---

## Implementation Order

1. Install `qrcode` + `@types/qrcode` npm packages
2. **Backend:** `Table` model, service, controller, routes
3. **Backend:** `GET /api/restaurants/:id/info` public endpoint
4. **Customer app:** Read URL params, persist to localStorage, pass `restaurantId` to all API calls, show "Scan QR" screen when no context
5. **Admin:** `QRManager.tsx` component (table cards + QR codes + add/delete/download)
6. **Admin:** Update `Dashboard.tsx` — add QR tab to sidebar
7. **Admin:** Update `OrderManager.tsx` — table column + filter
