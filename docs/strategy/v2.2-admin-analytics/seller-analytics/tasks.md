# Seller Analytics — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Backend Analytics Endpoints

- [ ] `GET /api/analytics/overview`
  ```sql
  SELECT
    SUM(total_price) FILTER (WHERE status = 'completed' AND created_at > NOW() - INTERVAL '30 days') AS revenue_30d,
    COUNT(*) FILTER (WHERE status = 'completed' AND created_at > NOW() - INTERVAL '30 days') AS orders_30d,
    COUNT(*) FILTER (WHERE status IN ('pending','paid','processing')) AS pending_orders,
    (SELECT COUNT(*) FROM products WHERE seller_id = $1 AND status = 'active') AS active_products,
    (SELECT SUM(view_count) FROM showrooms WHERE owner_id = $1) AS showroom_views_total
  FROM orders WHERE seller_id = $1
  ```

- [ ] `GET /api/analytics/revenue?period=30d`
  ```sql
  SELECT DATE(created_at) as date, SUM(total_price) as revenue
  FROM orders
  WHERE seller_id = $1 AND status = 'completed'
    AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at) ORDER BY date ASC
  ```

- [ ] `GET /api/analytics/top-products?limit=5`
  ```sql
  SELECT p.id, p.title, p.view_count,
    COUNT(o.id) as order_count,
    SUM(o.total_price) as revenue
  FROM products p
  LEFT JOIN orders o ON o.product_id = p.id AND o.status = 'completed'
  WHERE p.seller_id = $1
  GROUP BY p.id ORDER BY revenue DESC NULLS LAST LIMIT 5
  ```

- [ ] `GET /api/analytics/showroom-traffic?period=30d`
  - Daily view count from `showrooms.view_count` (if tracked daily — may need schema addition)
  - Or: use static total + growth estimate

---

## Step 2 — Overview Cards Row

- [ ] Create `frontend-next/components/analytics/MetricCard.tsx`
  - Props: `icon`, `label`, `value`, `trend?: { value: number, direction: 'up'|'down' }`
  - Trend: green ↑ for positive, red ↓ for negative
  - Loading: `SkeletonCard` placeholder
- [ ] Cards: Revenue / Orders / Avg Order Value / Showroom Views / Active Products / Pending Orders
- [ ] "vs last month" trend shown on each card

---

## Step 3 — Revenue Chart

- [ ] Line chart (Recharts `<LineChart>`) showing daily revenue
- [ ] X-axis: date labels (Mon, Tue, Wed...)
- [ ] Y-axis: ETB amounts formatted (10K, 20K, 30K)
- [ ] Tooltip: "Aug 15: ETB 4,500"
- [ ] Period selector: 7 days / 30 days / 3 months / 1 year

---

## Step 4 — Orders Chart

- [ ] Bar chart (`<BarChart>`) showing daily order count
- [ ] Same period selector as revenue chart
- [ ] Tooltip: "Aug 15: 12 orders"

---

## Step 5 — Top Products Table

- [ ] Table: Rank / Product name + thumbnail / Views / Orders / Revenue / Stock
- [ ] Clicking product name → navigates to product detail
- [ ] Revenue column: sorted descending by default
- [ ] "Low stock" warning badge when stock ≤ 5

---

## Step 6 — Order Status Donut Chart

- [ ] Recharts `<PieChart>` showing order distribution
- [ ] Segments: Completed (green) / Processing (yellow) / Cancelled (red) / Pending (gray)
- [ ] Legend with counts and percentages
- [ ] Center label: total orders

---

## Step 7 — Recent Orders Table

- [ ] Last 10 orders: product thumbnail + title / buyer name / amount / status badge / date
- [ ] "View all orders" link to `/orders`

---

## Step 8 — Date Range Selector

- [ ] Dropdown: Last 7 days / Last 30 days / Last 3 months / Last 12 months
- [ ] All charts + cards update when period changes
- [ ] Period stored in URL param: `?period=30d`

---

## Step 9 — Export

- [ ] "Export CSV" button — downloads orders + revenue data as CSV
- [ ] Backend: `GET /api/analytics/export?format=csv&period=30d`

---

## Step 10 — Verify

- [ ] All 6 overview metrics load correctly
- [ ] Charts render correct data for each period
- [ ] Top products matches actual order data
- [ ] Trend arrows point correct direction
- [ ] CSV export downloads with correct data
- [ ] Dashboard loads in < 2s (data may be cached)
