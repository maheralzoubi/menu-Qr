# Owner App — Specification

## Business Model

This platform is a **SaaS** product. The App Owner sells access to multiple restaurants. Each restaurant is a fully isolated client with its own data, admin account, and customer base.

---

## Core Concept

```
App Owner (superadmin)
├── Restaurant A  → own menu, orders, customers, reviews
├── Restaurant B  → own menu, orders, customers, reviews
└── Restaurant C  → own menu, orders, customers, reviews
```

The Owner creates, manages, and monitors all restaurant clients from a single panel at `localhost:3002`.

---

## Critical Architecture Change Required

The current codebase is a **single-restaurant app**. All data models (MenuItem, Category, Order, Reservation, Review, Customer) have no `restaurantId`. This must change before multi-tenancy works.

### What needs to be added to every model

| Model | New field |
|-------|-----------|
| `User` (admin/staff) | `restaurantId: ObjectId` |
| `Customer` | `restaurantId: ObjectId` |
| `MenuItem` | `restaurantId: ObjectId` |
| `Category` | `restaurantId: ObjectId` |
| `Order` | `restaurantId: ObjectId` |
| `Reservation` | `restaurantId: ObjectId` |
| `Review` | `restaurantId: ObjectId` |

### What needs to change in every API route

All admin routes must scope DB queries to `req.user.restaurantId`.
All customer routes must scope DB queries by the restaurant context.

### JWT changes

| Token | Added field |
|-------|------------|
| Admin JWT | `restaurantId` |
| Customer JWT | `restaurantId` |

---

## Restaurant Data Model

```typescript
Restaurant {
  _id:           ObjectId
  name:          string        // required
  logo?:         string        // image URL
  contactEmail?: string
  contactPhone?: string
  address?:      string
  status:        'active' | 'inactive'   // default: 'active'
  adminId:       ObjectId → User         // the main admin account
  createdAt:     Date
  updatedAt:     Date
}
```

---

## Owner App Screens

### 1. Home — Restaurant List (default screen)

Displays a table of all restaurant clients with:

| Column | Description |
|--------|-------------|
| Logo | Restaurant logo thumbnail |
| Name | Restaurant name |
| Status | Active (green) / Inactive (red) badge |
| Total Orders | Count of all orders for this restaurant |
| Total Revenue | Sum of all order totals |
| Created | Date the restaurant was added |
| Actions | Toggle status button, Delete button |

- **"Add Restaurant" button** → opens slide-in creation panel
- Clicking a row → opens Restaurant Detail page

---

### 2. Create Restaurant — Slide-in Panel

**Restaurant Info**
- Restaurant name *(required)*
- Logo upload *(optional)*
- Contact email
- Contact phone
- Address

**Admin Account** *(created automatically)*
- Admin full name *(required)*
- Admin email *(required)*
- Admin password *(required, min 6 chars)*

**On Submit:**
1. Create `Restaurant` document in DB
2. Create `User` with `role: 'admin'` linked to the new `restaurantId`
3. Restaurant appears in the list immediately

---

### 3. Restaurant Detail Page

Accessed by clicking a restaurant in the list.

**Info section:** name, logo, contact email, phone, address, status, created date

**Stats section:**
- Total orders
- Total revenue
- Total customers
- Total reviews
- Total menu items

**Admin account section:**
- Admin name and email
- Reset password button

**Actions:**
- Activate / Deactivate toggle
- Delete restaurant button *(with confirmation — deletes restaurant + ALL its data)*

---

### 4. Analytics Page

**KPI cards:**
- Total restaurants on platform
- Active restaurants
- Total customers (across all restaurants)
- Total orders (across all restaurants)
- Total revenue (across all restaurants)

**Charts:**
- New restaurants registered per month (bar chart)

**Per-restaurant table:**

| Restaurant | Status | Customers | Orders | Revenue |
|-----------|--------|-----------|--------|---------|
| Pizza Palace | Active | 284 | 1,284 | $42,500 |
| Burger Town | Active | 193 | 843 | $28,100 |
| Sushi Place | Inactive | 42 | 120 | $4,200 |

---

## Deactivation Rules

When the Owner sets a restaurant to **Inactive**:

- ❌ Restaurant admin **cannot log in** to the admin dashboard
- ❌ Customers scanning the QR code **cannot access** the customer app
- ✅ All restaurant data is **preserved** (not deleted)
- ✅ Reactivating immediately restores full access

---

## Owner API Endpoints

All routes require Owner JWT (`role: 'superadmin'`).

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/owner/restaurants` | List all restaurants with stats |
| `POST` | `/api/owner/restaurants` | Create restaurant + admin account |
| `GET` | `/api/owner/restaurants/:id` | Restaurant detail + full stats |
| `PATCH` | `/api/owner/restaurants/:id` | Update name / logo / contact |
| `PATCH` | `/api/owner/restaurants/:id/status` | Activate / deactivate |
| `DELETE` | `/api/owner/restaurants/:id` | Delete restaurant + all its data |
| `GET` | `/api/owner/analytics` | Platform-wide analytics |

---

## Implementation Order

> ⚠️ This is a major refactor. The multi-tenancy changes must be done **before** anything else works correctly.

1. **Add `Restaurant` model** to DB
2. **Add `restaurantId` to all existing models** (User, Customer, MenuItem, Category, Order, Reservation, Review)
3. **Update all admin routes** to scope queries by `restaurantId`
4. **Update admin JWT** to include `restaurantId`
5. **Update customer auth** to include `restaurantId`
6. **Build Owner API** (restaurants CRUD + analytics)
7. **Build Owner UI** (restaurant list, create panel, detail page, analytics)
8. **Update seed script** to create a sample restaurant with its admin

---

## What This Fixes

| Current problem | After fix |
|-----------------|-----------|
| One hardcoded restaurant | Unlimited restaurants per owner |
| All admins share the same data | Each admin sees only their restaurant |
| No restaurant model | Full restaurant management |
| Owner panel manages generic "admins" | Owner panel manages restaurant clients |
