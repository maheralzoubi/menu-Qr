# Customer App — Specification

## Two Entry Flows

### Flow 1 — Direct Link (`localhost:3000`, no URL params)
```
Open localhost:3000
  ↓
RestaurantListScreen (card grid + search)
  ↓ tap an active restaurant
ScanTableQRScreen (restaurant logo + name + "Scan QR at your table")
  ↓ customer physically scans the table QR code
URL becomes: localhost:3000?restaurant=ID&table=TABLE_NAME
  ↓
Full restaurant app (menu, cart, orders, reviews...)
```

### Flow 2 — QR Scan (`localhost:3000?restaurant=ID&table=TABLE_NAME`)
```
Customer scans QR at their table
  ↓ URL has restaurant + table params
Full restaurant app opens directly
  ← skips restaurant list, skips all prompts
```

---

## Restaurant List Screen

**URL:** `localhost:3000` (no params)

**Header:**
- App name: **Menu QR**
- Tagline: "Discover great restaurants"
- Search bar below: filters cards by restaurant name in real time

**Card grid (2 columns):**

Each card shows:
| Element | Detail |
|---------|--------|
| Logo / placeholder | Restaurant logo image or first-letter avatar |
| Name | Restaurant name |
| Rating | ⭐ average from reviews (0.0 if no reviews) |
| Address | Contact address if available |
| Status badge | Green "Open" if active, greyed "Currently Closed" if inactive |

**Behaviour:**
- Active restaurants → tappable → go to ScanTableQRScreen
- Inactive restaurants → dimmed, NOT tappable, show "Currently Closed" badge
- No customer login on this screen (accounts are per-restaurant)

---

## Scan Table QR Screen

**Appears after:** customer taps an active restaurant from the list

**Shows:**
- Back button → returns to restaurant list
- Restaurant logo (or avatar fallback)
- Restaurant name
- Large QR scan frame icon
- Instruction text: "Scan the QR code on your table to open the menu"

**No input needed** — purely instructional. Customer scans the physical QR, the URL updates, and the menu loads.

---

## New Backend Endpoint

### `GET /api/restaurants/public`

Public — no auth required.

**Response:**
```typescript
[{
  _id: string
  name: string
  logo?: string
  address?: string
  status: 'active' | 'inactive'
  averageRating: number    // avg of all reviews for this restaurant
}]
```

Only returns restaurants that exist. Both active and inactive are included.

---

## App.tsx Routing Logic

```
loading (detecting URL params / localStorage)
  → null

context present (restaurantId in URL or localStorage)
  → full restaurant app (menu, cart, status, reviews, reservations)

no context + no selectedRestaurant
  → <RestaurantListScreen onSelect={setSelectedRestaurant} />

no context + selectedRestaurant set
  → <ScanTableQRScreen restaurant={selectedRestaurant} onBack={() => setSelectedRestaurant(null)} />
```

---

## Files

| File | Change |
|------|--------|
| `server/routes/api.ts` | Add `GET /api/restaurants/public` |
| `src/screens/RestaurantListScreen.tsx` | NEW |
| `src/screens/ScanTableQRScreen.tsx` | NEW |
| `src/screens/ScanQRScreen.tsx` | REMOVED |
| `src/App.tsx` | Replace ScanQRScreen logic with two-step flow |
