# Easy Invoice

Multilingual invoicing for small businesses. **Next.js** handles the app, auth, billing, and data. **Python (FastAPI)** handles AI parsing and PDF generation.

## Stack

| Layer | Tech |
|-------|------|
| Frontend & API | Next.js 15, TypeScript, Tailwind, TanStack Query, Zod |
| Auth | Clerk |
| Database | PostgreSQL + Prisma |
| Payments | Stripe |
| AI & documents | FastAPI, OpenAI, WeasyPrint |

## Project structure

```
easy-invoice/
├── apps/web/              # Next.js app (dashboard, API routes)
├── packages/db/           # Prisma schema & client
├── services/ai-docs/      # FastAPI: /parse-invoice, /render-pdf
└── docker-compose.yml     # Local PostgreSQL
```

## Quick start

### 1. Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (for Postgres)

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

```bash
cp .env.example .env
cp services/ai-docs/.env.example services/ai-docs/.env
```

Fill in:

- **Clerk** keys from [dashboard.clerk.com](https://dashboard.clerk.com)
- **Stripe** keys from [dashboard.stripe.com](https://dashboard.stripe.com)
- **OpenAI** API key for the Python service
- Set `AI_DOCS_SERVICE_SECRET` and `SERVICE_SECRET` to the same value

Copy `.env` to `apps/web/.env.local` (Next.js reads env from the app directory):

```bash
cp .env apps/web/.env.local
```

### 4. Start PostgreSQL

```bash
docker compose up -d
```

### 5. Push database schema

```bash
npm run db:push
```

### 6. Run the Python service

```bash
cd services/ai-docs
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 7. Run the web app

```bash
npm run dev -w @easy-invoice/web
```

Open [http://localhost:3000](http://localhost:3000).

## Main flows

1. **Sign up** → Clerk auth
2. **Onboarding** → create company profile (`POST /api/companies`)
3. **New invoice** → form or AI description → save draft → view detail
4. **Invoice detail** → download PDF, send by email, mark paid, delete
5. **Stripe** → webhook at `/api/webhooks/stripe` updates plan on subscription events (coming last)

## API routes (Next.js)

| Route | Purpose |
|-------|---------|
| `POST /api/companies` | Onboarding — create company + owner membership |
| `POST /api/invoices` | Create invoice draft with line items |
| `GET/PATCH/DELETE /api/invoices/[id]` | Invoice detail, status updates, delete |
| `GET /api/invoices/[id]/pdf` | Download invoice PDF |
| `POST /api/invoices/[id]/send` | Email invoice PDF to client |
| `POST /api/ai/parse-invoice` | Proxy to Python OpenAI parser |
| `POST /api/webhooks/stripe` | Subscription lifecycle |

## Python service

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Health check |
| `POST /parse-invoice` | Natural language → structured invoice JSON |
| `POST /render-pdf` | HTML → PDF bytes |

All protected endpoints require header: `X-Service-Secret: <your-secret>`.

## Next steps

- [ ] Stripe Checkout + plan limits
- [ ] Invoice templates (picker + seed data)
- [ ] Client management pages
- [ ] Drag-and-drop custom fields
