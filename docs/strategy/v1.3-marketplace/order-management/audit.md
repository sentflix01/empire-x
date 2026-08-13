# Order Management — Audit

## Routes
- Buyer: `/orders` (list) + `/orders/[id]` (detail)
- Seller: within analytics or orders tab

## Order States & Transitions

```
pending → paid → processing → completed
                            ↘ cancelled
       → payment_failed
       → refunded
```

## Required Elements

### Order List Page
| Element | Standard |
|---------|----------|
| Order card | Order ID, product thumb, title, date, total, status badge |
| Status badge | Color-coded: pending=gray, paid=blue, processing=yellow, completed=green, cancelled=red |
| Filter tabs | All / Active / Completed / Cancelled |
| Empty state | "No orders yet" with CTA |

### Order Detail Page
| Element | Standard |
|---------|----------|
| Order header | ID, date, status badge |
| Items list | Image, title, quantity, unit price, line total |
| Price breakdown | Subtotal, discount (if coupon), shipping, total |
| Delivery address | Full address shown |
| Delivery timeline | Step tracker: Ordered → Confirmed → Processing → Shipped → Delivered |
| Seller info | Name, contact button |
| Actions (buyer) | Cancel (if pending), Request return (if completed) |
| Actions (seller) | Update status dropdown |
| Invoice download | PDF download button |

## Issues to Investigate

- [ ] Does delivery timeline component exist?
- [ ] Can seller update order status from the UI?
- [ ] Is the invoice PDF generation wired to the frontend?
- [ ] Are order status changes pushed via WebSocket or require refresh?
