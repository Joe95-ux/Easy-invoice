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

**Status:** Planned

Cron flips `SENT`/`VIEWED` → `OVERDUE` after `dueDate`; scheduled reminder emails.

---

### 5. Saved products / services library

**Status:** Planned

Reusable line items for faster repeat invoicing.

---

### 6. Duplicate invoice / estimate

**Status:** Planned

Clone an existing document in one click.

---

### 7. Custom fields (UI)

**Status:** Planned

`customFields` JSON exists on models; needs form + template rendering.

---

### 8. Recurring invoices

**Status:** Planned

Schedule invoices (e.g. monthly retainers).

---

### 9. Simple reports

**Status:** Planned

Revenue by month, outstanding aging, top clients.

---

### 10. Team members

**Status:** Planned

Invite bookkeeper / VA with role-based access (`CompanyMember` model exists).

---

## Dev notes

- After pulling schema changes, run `npm run db:generate` then push migrations:
  `cd packages/db && npx dotenv -e ../../.env -- prisma db push --accept-data-loss`
- Set `NEXT_PUBLIC_APP_URL` (or `APP_URL`) in production so share links use the correct domain.
