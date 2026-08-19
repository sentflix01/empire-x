# Nodbusiness — Financial Controls & Internal Audit Framework

> **The internal control system that keeps Nodbusiness's money safe, accountable, and audit-ready.**
> Every financial process has a control. Every control has an owner. Every deviation is escalated.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| CFO | Chief Financial Officer |
| CEO | Chief Executive Officer |
| AP | Accounts Payable — money the company owes |
| AR | Accounts Receivable — money owed to the company |
| SOC 2 | Service Organization Control 2 — security and financial audit standard |
| PCI-DSS | Payment Card Industry Data Security Standard |
| ERP | Enterprise Resource Planning — integrated business management software |
| KPI | Key Performance Indicator |
| SHA | Shareholders' Agreement |
| ESOP | Employee Stock Ownership Plan |
| OTP | One-Time Password |
| MFA | Multi-Factor Authentication |
| ACH | Automated Clearing House — US bank-to-bank transfer system |
| SWIFT | Society for Worldwide Interbank Financial Telecommunication |
| USD | United States Dollar |

---

## 1. Spending Authority Matrix

All purchases must follow the approval chain below. No exceptions.

| Amount | Who Can Approve | Process |
|--------|----------------|---------|
| Under $100 | Any team member | Expense report within 7 days |
| $100 – $500 | Team member + direct manager sign-off | Email approval + receipt |
| $500 – $2,000 | Department head approval | Written request + business justification |
| $2,000 – $10,000 | CEO approval | Email with cost-benefit analysis |
| $10,000 – $50,000 | CEO + CFO (or board observer) | Board communication required |
| Over $50,000 | Full board approval | Board resolution required |

**Rule:** Splitting a purchase into smaller amounts to avoid the approval threshold is grounds for immediate termination.

---

## 2. Bank Account Controls

### Account Structure
```
Account 1: Operating Account (day-to-day spending)
  → Holds 2–3 months of operating expenses max
  → Used for payroll, contractor payments, subscriptions

Account 2: Revenue Collection Account
  → Stripe and Chapa payouts land here
  → Transfer to Operating Account weekly (or as needed)

Account 3: Reserve Account (restricted)
  → Holds 6+ months of runway
  → Requires CEO + CFO (or board observer) dual signature to access
  → Never used for day-to-day operations
```

### Transfer Controls
| Transfer Type | Limit | Approval |
|--------------|-------|---------|
| Internal transfer (revenue → operating) | Up to $50,000/week | CEO alone |
| Wire transfer to vendor | Up to $10,000 | CEO + email confirmation |
| Wire transfer to vendor | Over $10,000 | CEO + CFO (or board) |
| International wire | Any amount | CEO + CFO + 24-hour cooling period |
| New payee addition | Any amount | CEO approval + ID verification of payee |

### Access Controls
- Bank accounts accessible only via MFA (Multi-Factor Authentication)
- Debit/credit cards issued to team members have monthly limits set per role
- Engineering team: no financial system access
- All bank logins use company email, never personal email
- Bank statements downloaded and reconciled monthly

---

## 3. Revenue Recognition Controls

### Subscription Revenue
```
Step 1: Customer subscribes → Stripe/Chapa creates subscription record
Step 2: Payment processes → Stripe webhook fires → backend records payment
Step 3: At month end: count active subscriptions × plan price = recognized MRR
Step 4: Reconcile Stripe dashboard totals against internal database counts
Step 5: Discrepancy > $50: investigate and resolve before closing books
```

### Template Marketplace Revenue
```
Developer earns revenue → platform takes 30% commission → 70% paid to developer
Recognition: Commission recognized at time of successful transaction
Dispute window: 7 days after transaction (hold 30% in escrow)
Payout schedule: Weekly batch payouts to developers
```

### Refunds
```
All refunds require CEO or customer support manager approval
Refunds > $500 require CEO approval
All refunds logged with reason code for monthly refund rate analysis
Target: Refund rate < 2% of GMV
```

---

## 4. Accounts Payable Controls

### Vendor Payment Process
```
Step 1: Vendor submits invoice to finance@nodbusiness.com
Step 2: Finance team logs invoice in accounting software
Step 3: Invoice matched against purchase order or approval email
Step 4: Payment approved per spending authority matrix
Step 5: Payment made via approved method (ACH, wire, or card)
Step 6: Payment recorded with invoice number, vendor ID, category
Step 7: Bank statement reconciliation confirms payment posted
```

### Approved Payment Methods
| Method | Use Case | Max per transaction |
|--------|---------|-------------------|
| Company credit card | Subscriptions, small tools | $2,000/month |
| ACH transfer | US vendors, recurring | Unlimited (with approval) |
| Wire transfer | International vendors, large | Unlimited (with approval) |
| PayPal / Wise | Freelancer micro-payments | $500 per transaction |
| Cash | Never | $0 (no cash transactions) |

### Contractor Payments
- All contractors must submit a signed contractor agreement before first payment
- Contractors paid on NET-30 terms (30 days after invoice)
- Freelancers under $600/year (US): no tax form required
- Freelancers over $600/year (US): 1099 form required by January 31
- International contractors: W-8BEN form required

---

## 5. Accounts Receivable Controls

### Subscription (auto-billed)
- Stripe handles all subscription billing automatically
- Failed payments: Stripe retries 3× over 7 days → dunning email sequence
- After 7 days failed: account downgraded to free tier
- After 30 days failed: account suspended

### Manual Invoicing (enterprise customers)
```
Payment terms: NET-30 standard, NET-15 preferred
Invoice due date tracking: automated reminders at 7, 14, 30 days
Overdue > 30 days: CEO notified, account access suspended until paid
Overdue > 60 days: Referred to collections process
```

---

## 6. Payroll Controls

### Payroll Process
```
Step 1: HR confirms headcount and any salary changes by 20th of month
Step 2: CEO approves payroll summary before processing
Step 3: Payroll processed via approved payroll provider
Step 4: Payroll taxes filed and remitted on schedule
Step 5: Pay stubs issued to all employees
Step 6: Payroll journal entry posted in accounting software
```

### Controls
- No new employee added to payroll without signed offer letter and ID verification
- Salary changes require CEO written approval
- Contractor vs. employee classification reviewed quarterly (misclassification is a legal risk)
- Payroll provider access restricted to HR lead and CFO (or CEO)

---

## 7. Equity and Cap Table Controls

### ESOP (Employee Stock Ownership Plan) Administration
```
Cap table tool: Carta (recommended) or Pulley
All share issuances require board approval (written resolution)
ESOP grants documented within 30 days of grant date
Vesting tracked monthly — terminated employees' unvested shares cancelled within 90 days
Exercise window: 90 days after termination (standard); review per SHA
```

### Investor Share Administration
```
All share issuances require:
  □ Board resolution
  □ Signed subscription agreement
  □ Updated cap table
  □ Updated SHA (if terms change)
  □ Legal counsel review
```

---

## 8. Expense Reimbursement Policy

### Eligible Expenses
| Category | Policy |
|---------|--------|
| Business travel (flights) | Economy class only; book 14+ days in advance |
| Business travel (hotels) | Up to $150/night in most cities; $250/night in NYC/SF/London |
| Meals (client entertainment) | Up to $75 per person; receipt + names of attendees required |
| Team meals | Up to $25 per person |
| Home office setup | Up to $500 one-time (approved by CEO) |
| Software tools | Must be on approved tools list; no personal accounts expensed |
| Conferences | CEO pre-approval required; budget allocated annually |

### Ineligible Expenses
- Alcohol (unless specifically approved for client entertainment)
- Personal items (clothing, gym, personal subscriptions)
- Fines, penalties, traffic violations
- Spouse/partner travel costs
- Cash advances

### Reimbursement Timeline
- Submit via accounting software within 30 days of expense
- Reimbursement processed with next payroll run
- Receipts required for all amounts over $25

---

## 9. Financial Reporting Controls

### Monthly Close Process
```
By 5th of following month:
  □ All invoices entered and approved
  □ Bank accounts reconciled
  □ Stripe/Chapa revenue reconciled to database
  □ Payroll costs confirmed

By 10th of following month:
  □ P&L statement prepared
  □ KPIs calculated (MRR, CAC, churn, burn)
  □ Month-end report sent to CEO and board observer (if any)
  □ Variances > 15% from budget investigated and explained
```

### Quarterly Review
```
  □ P&L reviewed with board
  □ Cash runway recalculated
  □ Projections updated for next 12 months
  □ Audit of expense categories for policy compliance
```

### Annual Audit
```
Phase 1 (< $1M ARR): Internal review by CEO + external bookkeeper
Phase 2 ($1M–$5M ARR): Reviewed financial statements by CPA firm
Phase 3 (Series A+): Full audit by Big 4 or reputable CPA firm
```

---

## 10. Fraud Prevention Controls

### Internal Fraud Risks and Mitigations
| Risk | Mitigation |
|------|-----------|
| Employee creates fake vendor | All new vendors require ID verification + bank confirmation |
| Employee inflates expense reports | Random 10% audit of all expense reports monthly |
| Unauthorized bank transfers | Dual signature required for transfers > $5,000 |
| Payroll ghost employees | HR headcount reconciled against payroll monthly |
| IP theft | All employees sign NDA and IP assignment at hire |
| Cap table manipulation | Cap table on Carta, board approval required for all changes |

### External Fraud Risks
| Risk | Mitigation |
|------|-----------|
| Phishing — CEO impersonation wire fraud | All wire transfers confirmed via phone call, never just email |
| Business email compromise (BEC) | MFA on all email accounts, payment policy training |
| Chargeback fraud on marketplace | Stripe Radar + fraud scoring on all transactions |
| Fake invoices | PO matching process, vendor whitelist |

---

## 11. Financial Systems Access Control

| System | Who Has Access | Review Frequency |
|--------|---------------|-----------------|
| Bank accounts (full) | CEO, CFO | Quarterly |
| Bank accounts (view-only) | Board observer, external auditor | As needed |
| Stripe dashboard | CEO, Finance lead | Monthly |
| Accounting software (QuickBooks/Xero) | CEO, Finance lead | Full; Engineers: never |
| Cap table (Carta/Pulley) | CEO, Legal counsel, Board | Full; Employees: view own grants only |
| Payroll system | CEO, HR lead | Full; Employees: view own payslips |

---

*Maintained by: CEO (Phase 1), CFO (Phase 2+)*
*Review cycle: Quarterly, or after any financial incident*
*Last reviewed: [Date]*
