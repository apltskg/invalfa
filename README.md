# TravelDocs — Travel Business Management Template

> Complete, production-ready React application for managing travel business operations. Invoice tracking, bank reconciliation, AI extraction, client portals, and accountant exports — all in one template.

[![License](https://img.shields.io/badge/license-Commercial-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](./CHANGELOG.md)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://typescriptlang.org)

---

## ⚡ Quick Start

```bash
# 1. Install
npm install

# 2. Configure your business
#    Edit src/config/app.config.ts with your company details

# 3. Set up database
#    Create a Supabase project → copy credentials to .env
#    Run supabase_setup.sql in the SQL Editor

# 4. Launch
npm run dev
```

📖 **[Full Setup Guide →](./docs/SETUP.md)**

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📦 **Package Management** | Create & track travel packages with customer linking |
| 🧾 **Invoice System** | Upload, AI-extract, categorize, and match invoices |
| 🏦 **Bank Sync** | Import CSV/PDF bank statements, match transactions |
| 📊 **Analytics** | Revenue, expenses, profitability charts |
| 📤 **Export Hub** | Monthly reports, Excel exports, accountant portal |
| 👥 **Contact Book** | Customers, suppliers, travellers database |
| 🔗 **Client Portal** | Shareable links for customer document access |
| 📄 **Proforma Invoices** | Generate and email professional proformas |
| 🤖 **AI Extraction** | Auto-parse invoices & bank statements with Gemini |
| 🌍 **Multi-Language** | English + Greek (extensible) |
| 🔐 **Role-Based Auth** | Admin/Staff roles with RLS |
| 📱 **Responsive** | Works perfectly on mobile & desktop |

---

## 🎨 Customization

Everything is configurable from one file:

```typescript
// src/config/app.config.ts
export const APP_CONFIG = {
  company: {
    name: "Your Travel Agency",
    vatNumber: "123456789",
    email: "info@youragency.com",
  },
  features: {
    aiExtraction: true,
    bankSync: true,
    greekIntegrations: false, // Disable for non-Greek businesses
  },
  locale: {
    defaultLanguage: "en", // or "el"
    currency: "EUR",
  }
}
```

📖 **[Customization Guide →](./docs/CUSTOMIZE.md)** | **[Configuration Reference →](./docs/CONFIG.md)**

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| AI | Google Gemini for document extraction |
| Charts | Recharts |
| Exports | ExcelJS, JSZip, jsPDF |

---

## 📁 Project Structure

```
src/
├── config/          # App configuration (branding, features, locale)
├── components/      # UI components (shadcn/ui based)
│   ├── ui/          # Base UI primitives
│   ├── layout/      # App shell, sidebar, navigation
│   ├── bank/        # Bank sync components
│   ├── upload/      # File upload & AI extraction
│   └── shared/      # Reusable utilities
├── pages/           # Route pages
├── hooks/           # Custom React hooks
├── lib/             # Business logic & utilities
├── contexts/        # React contexts (Language, Month)
└── integrations/    # Supabase client & types

supabase/
├── functions/       # Edge functions (AI, email, etc.)
└── config.toml      # Supabase configuration

docs/                # Full documentation suite
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Setup Guide](./docs/SETUP.md) | Installation & first-run setup |
| [Configuration](./docs/CONFIG.md) | All configuration options |
| [Customization](./docs/CUSTOMIZE.md) | Branding, theming, features |
| [API Reference](./docs/API.md) | Edge functions & database schema |
| [Deployment](./docs/DEPLOYMENT.md) | Vercel, Netlify, Docker |
| [Updates](./docs/UPDATES.md) | How to apply updates |
| [Support](./docs/SUPPORT.md) | Troubleshooting & FAQ |

---

## 📜 License

Commercial license — see [LICENSE](./LICENSE) for details.

**Standard** ($149) · **Extended** ($349) · **Agency** ($599)

---

## 🆘 Support

- 📧 Email: support@traveldocs.dev
- 📚 Docs: [docs.traveldocs.dev](https://docs.traveldocs.dev)
- 🐛 Issues: Private GitHub repo

---

Built with ❤️ for travel professionals.
