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

**Status:** Planned

Stripe Checkout link on the client invoice page; webhook marks invoice paid.

---

### 4. Automatic overdue + payment reminders

**Status:** Done

Company-level reminder schedule, daily cron, manual remind, per-invoice pause, audit log.

| Piece | Location |
|-------|----------|
| Schema | `InvoiceReminder`, company reminder fields, `remindersPaused` |
| Cron | `GET /api/cron/invoice-reminders` |
| Settings | `ReminderSettingsSection` |
| UI | Invoice detail reminders + `InvoiceActions` |

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

### 6. Saved products / services library

**Status:** Planned

Reusable line items for faster repeat invoicing.

---

### 7. Duplicate invoice / estimate

**Status:** Done

Clone any invoice or estimate into a new draft with a fresh number.

---

### 7b. Company payment information

**Status:** Done

Structured payment methods (PayPal, Zelle, bank, etc.) in company settings; rendered above Terms & notes on invoices and estimates.

---

### 7c. QR codes (Workspace)

**Status:** Done

Dynamic QR codes for links, PDFs, business cards (vCard), and events. The printed code
points to a stable short link (`/q/[token]`) so the destination can be edited and scans
are counted without reprinting. Multi-step creator (type → content → design) with color
presets, dot/corner styles, and optional center logo.

| Piece | Location |
|-------|----------|
| Schema | `QrCode` model + `QrCodeType` enum |
| Lib | `apps/web/src/lib/qr-codes/*` (service, design, content/vcard+ics, url) |
| API | `GET/POST /api/qr-codes`, `GET/PATCH/DELETE /api/qr-codes/[id]`, `POST /api/qr-codes/upload` |
| Public | `/q/[token]` resolver (redirect or vCard/event landing), `/q/[token]/vcf`, `/q/[token]/ics` |
| UI | `features/qr-codes/*`, pages `/qr-codes`, `/qr-codes/new`, `/qr-codes/[id]/edit` |
| Sidebar | Collapsible **QR codes** group (Create QR code / QR codes) |

Later: scan analytics over time, more types (menu, app store, wifi), frames/labels.

---

### 8. Custom fields (UI)

**Status:** Planned

`customFields` JSON exists on models; needs form + template rendering.

---

### 9. Recurring invoices

**Status:** Planned

Schedule invoices (e.g. monthly retainers).

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
