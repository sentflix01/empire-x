# Developer Dashboard — Tasks

## Status: 🔴 Not Started

---

## What It Is

A dedicated section of Halehame where developers manage their integrations.
Single URL: `halehame.vercel.app/developers`

Think: Stripe Dashboard, Twilio Console, GitHub Developer Settings.

---

## Step 1 — Route & Layout

- [ ] Create `frontend-next/app/(app)/developers/page.tsx`
- [ ] Sidebar navigation within the developer section:
  ```
  Overview        — stats and quick actions
  API Keys        — create/revoke keys
  Webhooks        — manage subscriptions + view logs
  OAuth Apps      — register apps for "Login with Halehame"
  My Integrations — integrations you've published
  Usage & Billing — API call volume, tier, upgrade
  Documentation   — links to API docs
  ```

---

## Step 2 — Overview Page

- [ ] Quick stats row:
  - Total API calls today / this month
  - Active webhooks count
  - Registered OAuth apps count
  - Rate limit: X / Y calls remaining this hour
  
- [ ] Quick start cards (for new developers):
  1. "Create an API Key" → jump to API Keys tab
  2. "Read the Docs" → /developers/docs
  3. "Set up a Webhook" → jump to Webhooks tab
  4. "Register an OAuth App" → jump to OAuth Apps tab

- [ ] Recent API calls log: endpoint, method, status code, timestamp

---

## Step 3 — API Keys Tab

- [ ] Table: Key name / Prefix / Created / Last used / Tier / Status / Actions
- [ ] "Create New Key" button:
  - Modal: enter name + select tier
  - Shows full key ONCE with copy button
  - Warning: "Save this key now. It won't be shown again."
- [ ] Revoke button: confirm dialog → key deactivated immediately
- [ ] Per-key usage stats: calls today, calls this month

---

## Step 4 — Webhooks Tab

- [ ] Table: URL / Events / Status / Last triggered / Success rate
- [ ] "Add Webhook" button:
  - URL input (must be HTTPS)
  - Event checkboxes:
    ☐ Orders: created, paid, completed, cancelled
    ☐ Tasks: created, bid received, completed
    ☐ Products: created, updated
    ☐ Messages: received
    ☐ Users: registered, verified
    ☐ Payments: received, failed
  - Secret field (auto-generated or custom)
- [ ] "Send Test Event" button → fires a test payload immediately
- [ ] Delivery Log panel: last 50 deliveries with status + response body
- [ ] Auto-disable warning: "This webhook was disabled after 10 consecutive failures"

---

## Step 5 — OAuth Apps Tab

- [ ] Table: App name / Client ID / Created / Status
- [ ] "Register New App" button:
  - App name (required)
  - Description
  - Logo upload
  - Redirect URIs (textarea, one per line)
  - Scopes: ☐ profile  ☐ email  ☐ wallet
- [ ] Per-app: authorized users count, last used
- [ ] "View Secret" → re-authenticate to reveal (security)
- [ ] "Delete App" → revokes all tokens for that app

---

## Step 6 — Usage & Billing Tab

- [ ] Current tier badge: Free / Pro / Enterprise
- [ ] Usage meter: X / Y calls this hour (visual bar)
- [ ] Monthly usage chart: bar chart, calls per day for last 30 days
- [ ] Upgrade CTA:
  ```
  Free tier:       100 req/hour · Community support
  Pro ($29/mo):  1,000 req/hour · Webhooks · Priority support
  Enterprise:   10,000 req/hour · SLA · Dedicated support
  ```
- [ ] Billing integration (Stripe) for Pro upgrades

---

## Step 7 — Navigation Integration

- [ ] Add "Developers" link in the main app navigation
  - Location: Account / Settings section
  - Icon: `<Code2>` from Lucide
  - Only visible to authenticated users (any role)

---

## Step 8 — Verify

- [ ] Create API key, verify it works in cURL
- [ ] Add webhook, fire a test event, see it in delivery log
- [ ] Register OAuth app, complete full authorization flow
- [ ] Usage chart shows accurate API call data
- [ ] Rate limit bar updates in real-time as calls are made
