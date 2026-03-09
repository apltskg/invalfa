# Configuration Reference

## APP_CONFIG

The main configuration file is at `src/config/app.config.ts`.

### Company Settings

| Field | Type | Description |
|---|---|---|
| `company.name` | string | Your company display name |
| `company.logoUrl` | string | Path to your logo image |
| `company.vatNumber` | string | Tax identification number |
| `company.email` | string | Business email address |
| `company.phone` | string | Business phone number |
| `company.address` | string | Business address |
| `company.website` | string | Company website URL |

### Locale Settings

| Field | Type | Default | Description |
|---|---|---|---|
| `locale.defaultLanguage` | `"en"` \| `"el"` | `"en"` | Default UI language |
| `locale.currency` | string | `"EUR"` | Default currency code |
| `locale.dateFormat` | object | `{year: "numeric", month: "2-digit", day: "2-digit"}` | Date formatting options |

### Feature Toggles

| Feature | Default | Description |
|---|---|---|
| `aiExtraction` | `true` | AI-powered invoice data extraction |
| `bankSync` | `true` | Bank statement import and matching |
| `greekIntegrations` | `false` | Greece-specific features (myDATA, AFM) |
| `multiCurrency` | `false` | Multi-currency transaction support |
| `emailNotifications` | `true` | Email notification system |
| `advancedAnalytics` | `true` | Advanced charts and reports |
| `clientPortal` | `true` | Customer-facing portal |
| `mobileApp` | `true` | Mobile-optimized features |

### Business Settings

| Field | Type | Description |
|---|---|---|
| `business.vatRate` | number | Default VAT rate (e.g., 0.24 for 24%) |
| `business.defaultExpenseCategories` | string[] | Initial expense category list |
| `business.supportedLanguages` | string[] | Available UI languages |

### Theme Settings

| Field | Type | Description |
|---|---|---|
| `theme.primaryColor` | string (HSL) | Brand primary color |
| `theme.borderRadius` | string | UI border radius |
| `theme.fontFamily` | string | Primary font family |

### Integration Settings

| Field | Type | Description |
|---|---|---|
| `integrations.supportedBanks` | string[] | Available bank integrations |
| `integrations.emailProvider` | string | Email service (resend/sendgrid/mailgun) |
| `integrations.aiProvider` | string | AI service (gemini/openai/anthropic) |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon/public key |

## Supabase Secrets

Set in Supabase Dashboard → Settings → Secrets:

| Secret | Required | Description |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | For Edge Functions |
| `RESEND_API_KEY` | Optional | For email notifications |
| `LOVABLE_API_KEY` | Optional | For AI extraction |