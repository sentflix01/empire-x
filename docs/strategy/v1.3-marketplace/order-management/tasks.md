# Order Management — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Order Status Badge Component

- [ ] Create `frontend-next/components/orders/OrderStatusBadge.tsx`
  - Props: `status: string`
  - Colors:
    - `pending` → gray badge
    - `paid` → blue badge
    - `processing` → yellow/amber badge
    - `completed` → green badge
    - `cancelled` → red badge
    - `payment_failed` → red badge
    - `refunded` → purple badge

---

## Step 2 — Order List Page

- [ ] Filter tabs: All / Active / Completed / Cancelled
  - "Active" = pending + paid + processing
  - Clicking tab filters the list
- [ ] Order card: thumbnail (first product image) + title + date + total + status badge
- [ ] "View details" button or whole card clickable
- [ ] Separate view for buyer orders vs seller orders (tab or toggle)
- [ ] Infinite scroll or pagination (20 per page)
- [ ] Empty state per tab

---

## Step 3 — Delivery Timeline Component

- [ ] Create `frontend-next/components/orders/DeliveryTimeline.tsx`
  - Steps: Ordered → Confirmed → Processing → Shipped → Delivered
  - Each step: icon, label, date/time (if completed), connector line
  - Completed steps: filled circle (green), active step: pulsing ring
  - Pending steps: empty circle (gray)
  - Data from `GET /api/delivery?order_id=xxx` (`delivery_updates` table)

---

## Step 4 — Order Detail Page

- [ ] Order header: ID (short form: last 8 chars), full date, status badge
- [ ] Items table: image + title + qty × price = line total
- [ ] Price summary: Subtotal / Coupon discount (if any) / Total
- [ ] Delivery address block
- [ ] Delivery timeline component
- [ ] Seller section: avatar + name + "Message" button
- [ ] Buyer actions:
  - "Cancel order" button — shown when `status === 'pending'`, confirm dialog
  - "Request return" button — shown when `status === 'completed'`, opens return modal
- [ ] Seller actions (when viewing as seller):
  - Status dropdown: Confirmed → Processing → Shipped → Delivered
  - "Update" button next to dropdown
  - Updates via `PUT /api/orders/:id { status }`

---

## Step 5 — Invoice Download

- [ ] "Download Invoice" button on completed orders
- [ ] Calls `GET /api/orders/:id/invoice` (or existing invoice endpoint)
- [ ] Opens PDF in new tab or triggers download
- [ ] Button disabled for non-completed orders

---

## Step 6 — Real-time Status Updates

- [ ] Subscribe to `order_updated` WebSocket event (or add it)
- [ ] When seller updates status → buyer's order detail page updates without refresh
- [ ] Push notification sent to buyer on status change (backend handles this)

---

## Step 7 — Verify

- [ ] All 7 status states render correct badge color
- [ ] Delivery timeline renders all steps correctly
- [ ] Cancel order works (status → cancelled, UI updates)
- [ ] Seller can update status and buyer sees change
- [ ] Invoice PDF downloads correctly
- [ ] Filter tabs work and show correct counts
