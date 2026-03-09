# Changelog

All notable changes to TravelDocs will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-09

### 🎉 Initial Template Release

#### Core Features
- **Travel Package Management** — Create, organize, and track travel packages with customer linking
- **Invoice System** — Full CRUD with PDF/image upload and AI-powered data extraction
- **Bank Synchronization** — CSV & PDF import, transaction matching, multi-bank support
- **Export Hub** — Monthly reports, Excel export, accountant magic links
- **Dashboard** — Timeline view with financial overview and analytics
- **Client Portal** — Shareable links for customer document access

#### Business Tools
- **Expense Categories** — 8 default operational categories, fully customizable
- **Customer & Supplier Management** — Contact book with auto-linking
- **Proforma Invoices** — Generate and email professional proformas
- **Traveller Database** — Passport, ID, and loyalty card tracking
- **Invoice List (myDATA)** — Excel import and matching for Greek tax compliance

#### AI & Automation
- **AI Invoice Extraction** — Automatic data parsing from PDF/image uploads (Gemini)
- **AI Bank PDF Extraction** — Parse bank statements from PDF files
- **Smart Matching** — Suggested invoice-transaction matches with confidence scoring
- **Auto-Link Contacts** — Automatically link invoices to known suppliers/customers

#### Multi-Language
- **English & Greek** — Full UI localization with language switcher
- **Extensible** — Easy to add new languages via translations file

#### Security
- **Row Level Security (RLS)** — All tables protected
- **Role-Based Access** — Admin/Staff roles with proper authorization
- **Magic Link Auth** — Time-limited accountant portal access
- **Secure Storage** — Private buckets for sensitive documents

#### Technical
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui + Framer Motion
- Supabase (Postgres, Auth, Storage, Edge Functions)
- Recharts for data visualization
- ExcelJS + JSZip for report generation

---

## [Pre-release History]

### [0.9.0] - 2026-02-06
- Global date view selector (Day/Week/Month/Year)
- Smart invoice matching with AI
- Enhanced Greek Excel parsing

### [0.8.0] - 2026-01-30
- Accountant portal with general income/expenses
- Bank PDF extraction with Gemini 2.0
- Dynamic expense categories
- Customer/Supplier smart select

### [0.7.0] - 2026-01-15
- Notification system
- Bulk upload modal
- Bank statement management
- Invoice list imports
