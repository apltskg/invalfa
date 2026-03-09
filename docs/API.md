# API & Edge Functions Reference

## Edge Functions

All backend logic runs as Supabase Edge Functions (Deno runtime).

### `extract-invoice`
Extracts structured data from uploaded invoice PDF/images using AI.

**Method:** POST  
**Auth:** Required (Bearer token)  
**Body:**
```json
{
  "fileUrl": "https://...",
  "fileName": "invoice.pdf",
  "mimeType": "application/pdf"
}
```
**Response:**
```json
{
  "merchant": "Hotel Athens",
  "amount": 450.00,
  "date": "2026-01-15",
  "category": "hotel",
  "confidence": 0.95
}
```

### `extract-bank-pdf`
Parses bank statement PDFs into structured transactions.

**Method:** POST  
**Auth:** Required  
**Body:**
```json
{
  "fileUrl": "https://...",
  "bankName": "eurobank"
}
```

### `ai-match`
Suggests matches between invoices and bank transactions.

**Method:** POST  
**Auth:** Required  
**Body:**
```json
{
  "invoiceId": "uuid",
  "transactionIds": ["uuid1", "uuid2"]
}
```

### `send-invoice-email`
Sends invoice documents via email (Resend).

**Method:** POST  
**Auth:** Required  
**Body:**
```json
{
  "to": "client@example.com",
  "subject": "Your Invoice",
  "invoiceId": "uuid"
}
```

### `send-proforma-email`
Sends proforma invoices via email.

**Method:** POST  
**Auth:** Required  

### `verify-afm`
Verifies Greek VAT numbers (AFM) via GSIS API.

**Method:** POST  
**Auth:** Required  
**Body:**
```json
{
  "afm": "123456789"
}
```

### `accountant-portal-access`
Validates magic link tokens for accountant portal access.

**Method:** POST  
**Auth:** None (public, token-validated)  

### `manage-users`
Admin user management (create, update roles).

**Method:** POST  
**Auth:** Required (admin role)  

### `notify-admin`
Sends notifications to admin users.

**Method:** POST  
**Auth:** Required  

---

## Database Tables

See `src/integrations/supabase/types.ts` for complete TypeScript types.

### Core Tables
| Table | Description |
|-------|-------------|
| `packages` | Travel packages/bookings |
| `invoices` | Expense and income records |
| `bank_transactions` | Imported bank transactions |
| `invoice_transaction_matches` | Invoice ↔ transaction links |
| `customers` | Client records |
| `suppliers` | Vendor records |
| `travellers` | Traveller passport/ID data |

### Supporting Tables
| Table | Description |
|-------|-------------|
| `expense_categories` | Customizable expense types |
| `bank_statements` | Uploaded statement metadata |
| `banks` | Supported bank configurations |
| `proforma_invoices` | Generated proformas |
| `invoice_list_imports` | Excel import batches |
| `invoice_list_items` | Individual rows from imports |
| `notifications` | System notifications |
| `agency_settings` | Business configuration |
| `shareable_links` | Client portal tokens |
| `accountant_magic_links` | Accountant access tokens |
| `user_roles` | Role-based access control |
| `profiles` | User profile data |

### Key Enums
- `app_role`: `admin`, `staff`
- `package_status`: `active`, `completed`
- `invoice_category`: `airline`, `hotel`, `tolls`, `fuel`, `other`, etc.

---

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `invoices` | No | Invoice PDF/image uploads |
| `bank-statements` | No | Bank statement files |
| `invoice-lists` | No | Excel import files |
| `invoice-receipts` | Yes | Public receipt access |
