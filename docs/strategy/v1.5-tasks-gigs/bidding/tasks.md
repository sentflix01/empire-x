> **DEFERRED (October 2026):** This strategy file is historical planning material, not a current launch commitment. The feature routes and APIs are not active. Current scope and re-entry criteria are recorded in `docs/product/POST_LAUNCH_FEATURES.md`.

# Bidding System — Tasks

## Status: 🔴 Not Started

---

## Step 1 — Task Detail Page

- [ ] Audit `frontend-next/app/(app)/tasks/[id]/page.tsx`
- [ ] Header: type badge + title + `TaskStatusBadge` + posted relative time
- [ ] Requester card: avatar + name + member since + "Message" button
- [ ] Description: full text, expandable if > 300 chars
- [ ] Details row: location pin icon + district | calendar icon + deadline | ETB icon + offered amount
- [ ] Bid count: "12 bids received" shown prominently
- [ ] Map preview: small embedded map showing task pin location

---

## Step 2 — Place a Bid Modal

- [ ] "Place a Bid" button — shown only when:
  - User is not the task requester
  - Task status is `open`
  - User has not already bid (show "Edit bid" if they have)
- [ ] Modal fields:
  - Bid amount: ETB input, min ETB 1
  - Suggested amounts: chips equal to offered payment (±10–20%)
  - Message: textarea, placeholder "Tell the requester why you're the best for this task..."
  - Character counter on message (max 500)
- [ ] Submit: `POST /api/tasks/:id/bids { bid_amount, message }`
- [ ] Success: modal closes, button changes to "Your bid: ETB X — Pending"
- [ ] Edit bid: re-opens modal pre-filled (calls `PUT /api/tasks/:id/bids/:bidId`)
- [ ] Withdraw bid: "Withdraw" option in bid status area

---

## Step 3 — Bids List (Requester Only)

- [ ] Visible only when `req.user.id === task.requester_id`
- [ ] Sorted by: amount (default) with toggle to sort by rating
- [ ] Each bid card:
  - Bidder: avatar + name + rating stars + "View profile" link
  - Bid amount: bold ETB amount
  - Message: full text (expandable if long)
  - Time: "2 hours ago"
  - Actions: "Accept" button (green) + "Message bidder" button
- [ ] Accepted bid: highlighted with checkmark badge, other bids grayed out
- [ ] Empty state: "No bids yet — share your task to get more visibility"

---

## Step 4 — Accept Bid Flow

- [ ] "Accept" button → confirm dialog:
  - "Accept [Name]'s bid of ETB X?"
  - "This will assign the task to [Name] and notify them."
  - "Confirm" → `PUT /api/tasks/:id/bids/:bidId/accept`
- [ ] On accept:
  - Task status → `in_progress`
  - Accepted bid status → `accepted`, others → `rejected`
  - Real-time notification to accepted bidder (WebSocket + push)
  - Real-time notification to rejected bidders (push only)
  - Task detail updates without page refresh

---

## Step 5 — Task Completion

- [ ] "Mark as Complete" button — shown to requester when task is `in_progress`
- [ ] Confirm dialog: "Has [Name] completed the task to your satisfaction?"
- [ ] On confirm → `PUT /api/tasks/:id { status: 'done' }`
- [ ] Payment release prompt: "Release payment of ETB X from your wallet to [Name]?"
- [ ] Payment release → `POST /api/wallet/transfer { to_user_id, amount, task_id }`
- [ ] Both parties see completion confirmation
- [ ] Option to leave a review for the worker

---

## Step 6 — Verify

- [ ] Cannot bid on own task (button hidden, API blocks it)
- [ ] Accepting bid notifies bidder in < 1s
- [ ] Rejected bidders receive notification
- [ ] Task status updates in real-time on task board
- [ ] Payment releases to correct wallet on completion
