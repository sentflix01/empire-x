# v1.5 — Tasks & Gigs

> **Theme:** Service Economy
> **Goal:** Posting a task and finding someone to complete it is as fast and intuitive as ordering food delivery. The task board is the go-to place for everyday errands and professional gigs in Addis Ababa.

---

## Scope

| Section | File |
|---------|------|
| Task board | [audit.md](./task-board/audit.md) · [tasks.md](./task-board/tasks.md) |
| Task creation flow | [audit.md](./task-creation/audit.md) · [tasks.md](./task-creation/tasks.md) |
| Bidding system | [audit.md](./bidding/audit.md) · [tasks.md](./bidding/tasks.md) |
| Task map view | [audit.md](./map-view/audit.md) · [tasks.md](./map-view/tasks.md) |
| Task completion & payment | [audit.md](./completion-payment/audit.md) · [tasks.md](./completion-payment/tasks.md) |
| Task categories & types | [audit.md](./categories/audit.md) · [tasks.md](./categories/tasks.md) |

---

## Success Criteria

- [ ] Task board shows open tasks with: title, type, payment, location, time posted
- [ ] Filter by: task type, payment range, distance, deadline
- [ ] Task creation: 4-step flow (type → details → location → payment)
- [ ] Location picker uses map with pin (not just text input)
- [ ] Bidder sees task details and can submit bid with message in 2 taps
- [ ] Requester sees all bids ranked by amount and rating
- [ ] Accepting a bid notifies the bidder instantly via WebSocket + push
- [ ] Task map view shows open tasks as pins, cluster at zoom-out
- [ ] Task completion: both parties confirm → payment released from wallet
- [ ] Dispute flow available if completion is contested
- [ ] Task calendar view for planning and scheduling

---

## Dependencies

- Backend: tasks, task_bids routes (exist), wallet for payment release
- Frontend: map component (Leaflet, exists), bid flow, calendar view
