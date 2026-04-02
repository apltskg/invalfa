# CLAUDE.md — Project Context for Claude Code

## What is this?

**TravelDocs** — Internal invoice/expense management platform for a Greek travel agency. We don't issue invoices; we collect, organize, match, and export expense documents for accounting.

## Tech Stack

- **Frontend**: React 18 + Vite 5 + TypeScript + Tailwind CSS v3 + shadcn/ui
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions)
- **AI**: Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) via `LOVABLE_API_KEY`
- **Email**: Resend via Edge Functions
- **Animations**: Framer Motion (sparingly)

## Project Structure

```
src/
├── App.tsx                    # Routes (public + protected via AppLayout)
├── pages/                     # Route pages
├── components/
│   ├── ui/                    # shadcn/ui primitives (don't modify)
│   ├── layout/                # AppLayout, AppSidebar, MonthSelector
│   ├── auth/                  # AuthProvider, ProtectedRoute
│   ├── upload/                # Invoice upload, AI extraction UI
│   ├── bank/                  # Bank sync, CSV/PDF import, matching
│   ├── invoicelist/           # MyData invoice list management
│   └── shared/                # Reusable components
├── lib/                       # Business logic, AI services, utilities
├── hooks/                     # Custom React hooks
├── contexts/                  # Language, Month, Demo contexts
├── integrations/supabase/     # Auto-generated Supabase client & types (DO NOT EDIT)
│   ├── client.ts              # ← NEVER modify
│   └── types.ts               # ← NEVER modify (auto-generated from DB schema)
└── config/                    # App configuration

supabase/
├── functions/                 # Deno Edge Functions (auto-deployed)
│   ├── extract-invoice/       # AI invoice data extraction (Gemini)
│   ├── extract-bank-pdf/      # AI bank statement PDF parsing
│   ├── ai-advisor/            # AI tax/accounting advisor
│   ├── ai-insights/           # AI spending insights
│   ├── ai-match/              # AI bank transaction matching
│   ├── verify-afm/            # Greek VAT number verification
│   ├── accountant-portal-access/ # Magic link validation
│   ├── manage-users/          # User/role management
│   ├── send-*-email/          # Email functions (Resend)
│   └── notify-*/              # Notification functions
└── config.toml                # Edge function config (verify_jwt settings)
```

## Key Concepts

### Core Data Model
- **Package** (`packages`): A travel package grouping invoices and bank transactions (e.g., "Group Paris – June 2025")
- **Invoice** (`invoices`): Uploaded expense document (PDF/image) with AI-extracted data in `extracted_data` JSONB
- **Bank Transaction** (`bank_transactions`): Imported from CSV/PDF bank statements
- **Match** (`invoice_transaction_matches`): Links invoices ↔ bank transactions
- **Customer** (`customers`): Travel agency clients
- **Supplier** (`suppliers`): Vendor/merchant contacts
- **Traveller** (`travellers`): Passenger records with passport/ID info

### Authentication & Authorization
- Supabase Auth with email/password (no anonymous signups)
- Roles stored in `user_roles` table (enum: `admin`, `staff`)
- `is_authorized_user()` and `has_role()` DB functions for RLS
- Accountant access via time-limited magic links (no auth required)

### AI Services (via Lovable AI Gateway)
All AI calls go through Edge Functions → `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Invoice Extraction**: OCR + data extraction from PDFs/images with quality scoring and auto-retry
- **Bank PDF Parsing**: Extract transactions from bank statement PDFs
- **Smart Matching**: AI-powered bank transaction ↔ invoice matching
- **Tax Advisor**: Contextual tax/accounting advice
- **Spending Insights**: Monthly financial analysis
- Default model: `google/gemini-3-flash-preview`, fallback: `google/gemini-2.5-pro`

### Storage Buckets (all private except `invoice-receipts`)
- `invoices` — Uploaded invoice PDFs/images (path: `uploads/{timestamp}-{random}.{ext}`)
- `bank-statements` — Bank statement files
- `invoice-lists` — MyData invoice list imports
- `invoice-receipts` — Public receipt access

## Commands

```bash
# Development
npm run dev              # Start dev server (Vite)
npm run build            # Production build
npm run lint             # ESLint

# No test suite configured yet
```

## Critical Rules

1. **NEVER edit** `src/integrations/supabase/client.ts` or `types.ts` — auto-generated
2. **NEVER edit** `.env` — auto-managed by Supabase integration
3. **NEVER store secrets** in client code — use Edge Functions + Supabase secrets
4. **Database changes** must go through migration files in `supabase/migrations/`
5. **Edge Functions** are single-file (`index.ts`) in `supabase/functions/{name}/`
6. **UI language**: Greek-first for labels, English OK for code/vendor names
7. **Design**: Apple-inspired minimal aesthetic — whitespace, soft shadows, rounded corners
8. **Colors**: Use Tailwind semantic tokens from `index.css` (HSL), never hardcode colors

## Environment Variables (available in Edge Functions)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (admin) key |
| `LOVABLE_API_KEY` | AI Gateway authentication |
| `RESEND_API_KEY` | Email sending via Resend |

Client-side (Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

## Greek-Specific Notes

- VAT numbers (ΑΦΜ): Exactly 9 digits, strip EL/GR prefix
- Number format: dot for thousands, comma for decimals (`1.234,56` = 1234.56)
- Date format: DD/MM/YYYY → convert to ISO YYYY-MM-DD
- Invoice categories: airline, hotel, tolls, fuel, transport, payroll, government, rent, telecom, insurance, office, maintenance, marketing, other
- VAT rates: 24% (standard), 13% (reduced), 6% (super-reduced)

## Common Patterns

### Supabase Client Usage
```typescript
import { supabase } from "@/integrations/supabase/client";

// Query
const { data, error } = await supabase.from("invoices").select("*");

// Call Edge Function
const { data, error } = await supabase.functions.invoke("extract-invoice", {
  body: { filePath, fileName }
});
```

### Edge Function Template
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, ...",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // ... logic
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
```

### RLS Pattern
All tables use `is_authorized_user(auth.uid())` for CRUD access.
Admin-only tables use `has_role(auth.uid(), 'admin')`.
