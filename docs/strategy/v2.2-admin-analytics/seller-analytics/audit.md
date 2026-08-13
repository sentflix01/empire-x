# Seller Analytics — Audit

## Current State
- Route: `/analytics`
- Backend: likely basic queries — view counts on products/showrooms
- Frontend: Recharts installed

## Global Standard Seller Analytics (Shopify/Etsy Pattern)

A seller needs to answer these questions from their analytics dashboard:

1. **How is my business performing?** → Revenue trend
2. **What's selling?** → Top products by orders
3. **Who's visiting?** → Showroom views over time
4. **How are my products discovered?** → Views per product
5. **How fast are things moving?** → Average order value, repeat buyers

## Required Dashboard Sections

### Overview Cards (top row)
| Metric | Description |
|--------|-------------|
| Total Revenue | Sum of completed order totals this month |
| Orders | Count of completed orders this month |
| Avg Order Value | Revenue / Orders |
| Showroom Views | Total this month |
| Products Listed | Count of active products |
| Pending Orders | Orders awaiting action |

### Charts
| Chart | Type | Data |
|-------|------|------|
| Revenue over time | Line chart | Daily revenue, last 30 days |
| Orders over time | Bar chart | Daily order count, last 30 days |
| Top products | Horizontal bar | Top 5 by revenue |
| Showroom traffic | Area chart | Daily views, last 30 days |
| Order status breakdown | Donut chart | % paid/processing/completed/cancelled |

### Tables
| Table | Columns |
|-------|---------|
| Recent orders | Product, buyer, amount, status, date |
| Top products | Name, views, orders, revenue, stock |

## Issues to Investigate
- [ ] What analytics data is currently shown?
- [ ] Are charts using real DB data or mock data?
- [ ] Is there a date range selector?
- [ ] Are any of these metrics missing backend queries?
