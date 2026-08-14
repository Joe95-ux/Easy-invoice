# Invoice Desk — Feature roadmap

Uncommitted tracking file for planned and in-progress product features.

## Status legend

| Status | Meaning |
|--------|---------|
| Done | Shipped in codebase |
| In progress | Partially implemented |
| Planned | Not started |

---

## Priority features

### 1. Estimate → invoice (one click)

**Status:** Done

Copy an estimate's client, line items, tax, discount, template, and notes into a new invoice. Marks the estimate accepted and links the two documents.

| Piece | Location |
|-------|----------|
| Service | `apps/web/src/lib/estimate-service.ts` — `convertEstimateToInvoice` |
| API | `POST /api/estimates/[id]/convert-to-invoice` |
| UI | `EstimateActions` — "Convert to invoice" / "View invoice" |

---

### 2. Client-facing document links + viewed tracking

**Status:** Done

Shareable public URLs for invoices and estimates. Opening the link marks the document as viewed (when status is `SENT`).

| Piece | Location |
|-------|----------|
| Schema | `publicToken`, `viewedAt` on `Invoice` and `Estimate` |
| Public pages | `/view/invoices/[token]`, `/view/estimates/[token]` |
| Public PDF | `GET /api/public/invoices/[token]/pdf`, `GET /api/public/estimates/[token]/pdf` |
| Estimate respond | `POST /api/public/estimates/[token]/respond` — accept / decline |
| Share link API | `GET /api/invoices/[id]/share-link`, `GET /api/estimates/[id]/share-link` |
| UI | `DocumentShareButton` on invoice & estimate actions |
| Email | Send emails include view link |

---

### 3. Stripe Pay now on invoices

**Status:** Done (Stripe Connect Express)

Companies connect their own Stripe Express account in Settings. Clients pay the public invoice with Checkout. Funds transfer to the company’s Stripe (`transfer_data.destination`) with **no Invoice Desk application fee**. Signed webhook records a `CARD` payment and updates status.

| Piece | Location |
|-------|----------|
| Schema | `Company.stripeConnectedAccountId` + capability flags; `InvoicePayment.stripeCheckoutSessionId` / `stripePaymentIntentId` |
| Connect | `POST/GET /api/stripe/connect`, Settings → Card payments |
| Checkout | `POST /api/public/invoices/[token]/checkout` |
| Webhook | `/api/webhooks/stripe` (`checkout.session.completed` + `account.updated`) |
| UI | Public invoice **Pay** button |

Scan-to-pay QR (external links) remains available alongside Connect.

---

### 3b. Pro subscription billing (SaaS)

**Status:** Done

Platform Stripe Checkout + Customer Portal for upgrading the company plan (separate from Connect invoice pay).

| Piece | Location |
|-------|----------|
| Helpers | `lib/stripe-billing.ts` |
| API | `GET/POST /api/stripe/billing` (checkout + portal) |
| Webhook | `/api/webhooks/stripe` sets `Company.plan` from Price IDs / lookup keys |
| UI | Settings → Plan & billing; sidebar Upgrade / Manage billing |
| Env | `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, `STRIPE_PRO_TRIAL_DAYS` |

---

### 4. Automatic overdue + payment reminders

**Status:** Done

Company-level reminder schedule, daily cron, manual remind, per-invoice pause, audit log. Same cron also expires past-`validUntil` estimates, sends estimate follow-ups, and issues due recurring invoices.

| Piece | Location |
|-------|----------|
| Schema | `InvoiceReminder`, `EstimateReminder`, company reminder fields, `remindersPaused` |
| Cron | `GET /api/cron/invoice-reminders` (invoices + estimates + recurring) |
| Settings | `ReminderSettingsSection` (invoices + estimate follow-ups) |
| UI | Invoice/estimate detail reminders; public accept blocked when expired |

---

### 5. Time tracking (v1)

**Status:** Done

Manual time logs, unbilled hours → invoice line items, Toggl/Clockify import, default hourly rate in settings, draft invoice edit support.

| Piece | Location |
|-------|----------|
| Schema | `TimeEntry`, `Company.defaultHourlyRate`, `externalSource` / `externalId` |
| Page | `/time` |
| Import | `POST /api/time-entries/import` (Toggl, Clockify) |
| Live timer | `GET/POST/PATCH/DELETE /api/time-timer`, `POST /api/time-timer/stop` |
| Invoice | `AddUnbilledTimeDialog` on create + draft edit |

#### Time tracking — later phases

| Phase | Scope | Status |
|-------|--------|--------|
| **A — Import** | Toggl Track + Clockify one-time import | Done |
| **B — Live timer** | Start/stop timer in app, background-friendly logging, optional reminders to stop | Done |
| **C — Full product** | Projects, budgets, approvals, payroll, expenses, mobile timer widgets | Planned (out of scope for Invoice Desk core) |

**B (live timer)** — build when users ask for “track as I work” without leaving Invoice Desk. Keep lightweight: one active timer per user, client + description, persist on stop.

**C (full product)** — do not build; competes with Toggl/Harvest. Prefer deeper **A** integrations (Harvest, etc.) if import demand appears.

---

### 5b. Billing follow-ups

**Status:** Done

Company-scoped checklist + calendar for invoice/estimate follow-through (not a general todo app). Manual items must link a client, invoice, or estimate. Auto-suggestions cover overdue / due-soon invoices and expiring estimates. Drag to reorder open items. Optional assignee, filters, inline edit, and dashboard attention banner. Open items auto-close when the linked invoice is paid or estimate is accepted.

| Piece | Location |
|-------|----------|
| Schema | `FollowUp`, `FollowUpStatus`, `FollowUpSource` |
| Page | `/follow-ups` (Workspace nav) |
| API | `GET/POST /api/follow-ups`, `PATCH/DELETE /api/follow-ups/[id]`, `POST /api/follow-ups/reorder`, `POST /api/follow-ups/sync` |
| UI | Checklist + month calendar; filters; edit dialog; assignee; “Add follow-up” on invoice/estimate actions |
| Auto-close | Invoice paid / estimate accepted → `resolveFollowUpsForInvoice` / `resolveFollowUpsForEstimate`. Auto “due soon” items are **promoted** to overdue (stay open) when the due date passes — not marked Done while unpaid. |
| Dashboard | Due today + overdue counts via `getFollowUpActionCounts` |

---

### 6. Saved products / services library

**Status:** Done

Company-scoped catalog of reusable products/services. Add items to invoices and estimates from the line-items step without retyping description, qty, or price. Values are copied onto the document (no live link back to the catalog).

| Piece | Location |
|-------|----------|
| Schema | `Product` (`name`, `description`, `unitPrice`, `defaultQuantity`, `unit`) |
| Lib | `apps/web/src/lib/products.ts`, `lib/schemas/product.ts` |
| API | `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/[id]` |
| Page | `/products` (Workspace nav) |
| UI | Products table + dialog; “Add from library” on invoice/estimate creators |

---

### 7. Duplicate invoice / estimate

**Status:** Done

Clone any invoice or estimate into a new draft with a fresh number.

---

### 7b. Company payment information

**Status:** Done

Structured payment methods (PayPal, Zelle, bank, etc.) in company settings; rendered above Terms & notes on invoices and estimates. Methods whose details are an `https://` URL can be used as scan-to-pay destinations on invoices.

---

### 7b-ii. Invoice scan-to-pay QR (own payment link)

**Status:** Done

Businesses attach **their own** payment URL (PayPal.me, Stripe Payment Link, Venmo, Square, etc.) to an invoice as a LINK QR. The printed code uses a stable `/q/[token]` short link that redirects to that URL. Easy-invoice does not process the payment.

| Piece | Location |
|-------|----------|
| Schema | `QrCode.invoiceId` |
| Lib | `apps/web/src/lib/invoice-payment-qr.ts` |
| API | `GET/POST/DELETE /api/invoices/[id]/payment-qr` |
| UI | `InvoicePaymentQrSection` on invoice detail |
| PDF | QR embedded in payment information via `renderInvoiceHtmlForInvoice` |

---

### 7c. QR codes (Workspace)

**Status:** Done

Dynamic QR codes for links, PDFs, business cards (vCard), events, menus, Wi‑Fi,
socials, and coupons. The printed code
points to a stable short link (`/q/[token]`) so the destination can be edited and scans
are counted without reprinting. Multi-step creator (type → content → design) with color
presets, dot/corner styles, and optional center logo. Each code has a status —
**active**, **paused** (scan shows an "unavailable" page), or **deleted** (soft-deleted,
restorable). The list has a search box plus round filter/sort icon buttons: filter by
status + type, sort by most recent / most scanned / last modified / name. Codes can be
password protected — visitors hit a password gate at `/q/[token]` and, once unlocked, a
short-lived httpOnly cookie lets them through (passwords are scrypt-hashed, never exposed).

| Piece | Location |
|-------|----------|
| Schema | `QrCode` model + `QrCodeType` / `QrCodeStatus` enums |
| Lib | `apps/web/src/lib/qr-codes/*` (service, design, content/vcard+ics, url) |
| API | `GET/POST /api/qr-codes`, `GET/PATCH/DELETE /api/qr-codes/[id]`, `PATCH /api/qr-codes/[id]/status`, `POST /api/qr-codes/upload` |
| Public | `/q/[token]` resolver (redirect, paused notice, password gate, or vCard/event/menu/wifi landing), `/q/[token]/unlock`, `/q/[token]/file` (gated PDF proxy), `/q/[token]/vcf`, `/q/[token]/ics` |
| UI | `features/qr-codes/*`, pages `/qr-codes`, `/qr-codes/new`, `/qr-codes/[id]/edit` |
| Sidebar | Collapsible **QR codes** group (Create QR code / QR codes) |

Later: scan analytics over time, more types (app store), frames/labels.

---

### 8. Custom fields (UI)

**Status:** Planned

`customFields` JSON exists on models; needs form + template rendering.

---

### 9. Recurring invoices

**Status:** Done

Schedule invoices (weekly / monthly / quarterly / yearly) with pause/resume, end date or max occurrences, optional auto-send, and daily cron generation. Schedules are based on an existing invoice (copied client/lines/totals), matching common invoicing tools.

| Piece | Location |
|-------|----------|
| Schema | `RecurringInvoice`, `RecurringInvoiceLineItem`, `Invoice.recurringInvoiceId` |
| Service | `lib/recurring-invoices.ts` |
| API | `GET/POST /api/recurring-invoices`, `GET/PATCH/DELETE /api/recurring-invoices/[id]`, `POST …/generate`, `POST /api/invoices/[id]/make-recurring` |
| Cron | Included in `GET /api/cron/invoice-reminders` |
| UI | `/recurring-invoices` (right drawer: pick invoice + schedule), invoice **Make recurring**, schedule link on invoice detail |

---

### 9b. Collections co-pilot

**Status:** Done

Next-best-action on unpaid invoices from signals we already store (`sentAt`, `viewedAt`, due date, balance, installments) — not a full AR suite. **The team** can always offer/remove a plan from the invoice. **Clients** only see self-serve “Split into 2 / 3” when company policy `clientPaymentPlansEnabled` is on (Settings → Card payments; default off). Clients can always pay full, pay half, or pay the next installment when a plan exists. AI draft tone `collections` for firm chase emails.

| Piece | Location |
|-------|----------|
| Advice | `lib/collections/advice.ts` — `getCollectionsAdvice`, equal plan builder, checkout amount policy |
| Policy | `Company.clientPaymentPlansEnabled` (default false); `PATCH /api/company/payment-plan-policy` |
| Owner API | `POST/DELETE /api/invoices/[id]/payment-plan` (authenticated team member) |
| Public API | `POST /api/public/invoices/[token]/payment-plan` (403 unless policy on); checkout optional `amount` |
| Owner UI | `InvoiceGetPaidSection` / `InvoiceCollectionsCard`; Remove plan on Payments; Settings toggle |
| Public UI | `InvoicePayButton` — with a plan, primary charges **next installment due**; secondary pays remaining balance; half / split 2–3 (policy-gated) |
| AI | `POST /api/invoices/[id]/email-draft` tone `collections` (plan-aware copy) |

---

### 10. Simple reports

**Status:** Planned

Revenue by month, outstanding aging, top clients.

---

### 11. Team members

**Status:** Done

App-native invites, roles (Owner / Admin / Member), company switcher.

---

## Dev notes

- After pulling schema changes, run `npm run db:generate` then push migrations:
  `cd packages/db && npx dotenv -e ../../.env -- prisma db push --accept-data-loss`
- Set `NEXT_PUBLIC_APP_URL` (or `APP_URL`) in production so share links use the correct domain.
