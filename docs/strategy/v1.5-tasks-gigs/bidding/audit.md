> **DEFERRED (October 2026):** This strategy file is historical planning material, not a current launch commitment. The feature routes and APIs are not active. Current scope and re-entry criteria are recorded in `docs/product/POST_LAUNCH_FEATURES.md`.

# Bidding System — Audit

## Current Architecture
- Backend: `POST /api/tasks/:id/bids` — submit bid
- Backend: `PUT /api/tasks/:id/bids/:bidId/accept` — accept bid
- Schema: `task_bids` table — `bid_amount`, `message`, `status` (pending/accepted/rejected)

## Bid Flow (Global Standard)

### Bidder's Journey
```
Browse task board → Open task detail → Read requirements
→ Tap "Place a Bid" → Enter amount + message → Submit
→ Wait for requester response → Notification on accept/reject
```

### Requester's Journey
```
Post task → Receive bid notifications
→ Open task detail → See all bids sorted by amount/rating
→ Review bidder profile → Accept best bid
→ Work happens → Mark task complete → Release payment
```

## Task Detail Page Requirements

| Element | Standard |
|---------|----------|
| Task header | Type badge, title, posted time, status badge |
| Description | Full text |
| Location | District + map pin |
| Deadline | Formatted date, time remaining |
| Payment | "Offering: ETB 500" |
| Requester | Avatar, name, rating, "Message" button |
| Bid count | "7 bids" prominent |
| "Place a Bid" button | Only for non-requesters, hidden after own bid submitted |
| Bids list (requester only) | Each bid: bidder avatar, name, amount, message, "Accept" button |
| Bid status (bidder) | "Your bid: ETB 450 — Pending/Accepted/Rejected" |

## Issues to Investigate
- [ ] Is the bids list visible only to the requester?
- [ ] Does accepting a bid notify the bidder via WebSocket?
- [ ] Can a user bid on their own task? (should be blocked)
- [ ] Is there a bid edit/cancel option after submission?
- [ ] Does task status change to `in_progress` after bid acceptance?
