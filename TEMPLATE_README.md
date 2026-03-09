# Travel Business Management Template

A complete, production-ready React application for managing travel business operations including package management, invoice tracking, bank synchronization, and client portals.

## 🚀 Quick Start

1. **Clone & Install**
   ```bash
   git clone <your-repo>
   cd travel-business-template
   npm install
   ```

2. **Configure Your Business**
   ```bash
   cp src/config/app.config.ts.example src/config/app.config.ts
   # Edit the configuration file with your business details
   ```

3. **Setup Database**
   ```bash
   # Create a Supabase project at https://supabase.com
   # Copy your credentials to .env
   npm run db:migrate
   ```

4. **Launch**
   ```bash
   npm run dev
   ```

## 📋 Features

### Core Business Management
- ✅ **Travel Package Management** - Create, track, and manage travel packages
- ✅ **Invoice System** - Upload, extract, and categorize invoices with AI
- ✅ **Bank Synchronization** - Import and match bank transactions
- ✅ **Client Portal** - Share package details with customers
- ✅ **Financial Analytics** - Revenue, expenses, and profitability reports

### Advanced Features  
- ✅ **AI Data Extraction** - Automatic invoice data parsing
- ✅ **Multi-Currency Support** - Handle international transactions
- ✅ **Email Notifications** - Automated client and staff notifications
- ✅ **Export System** - Generate reports for accountants
- ✅ **Mobile Responsive** - Works perfectly on all devices

### Regional Features
- 🇬🇷 **Greek Integration** - myDATA, AFM verification, Greek banks
- 🇺🇸 **International Ready** - Easy localization for any country
- 💱 **Tax Compliance** - VAT handling and tax reporting

## 🎨 Customization

### Branding
```typescript
// src/config/app.config.ts
export const APP_CONFIG = {
  company: {
    name: "Your Travel Agency",
    logo: "/path/to/your-logo.png",
    primaryColor: "#your-brand-color"
  }
}
```

### Features
Enable/disable features based on your needs:
```typescript
features: {
  aiExtraction: true,      // AI invoice processing
  bankSync: true,          // Bank integration
  greekIntegrations: false, // Disable for non-Greek businesses
  clientPortal: true,      // Customer access
}
```

### Languages
Support for English and Greek out of the box:
```typescript
locale: {
  defaultLanguage: "en",   // or "el" for Greek
  currency: "EUR",         // or "USD", "GBP", etc.
  dateFormat: "MM/dd/yyyy" // or "dd/MM/yyyy"
}
```

## 💼 Business Use Cases

### Travel Agencies
- Manage group tours and individual bookings
- Track expenses per package for profitability
- Generate client invoices and receipts
- Handle supplier payments and reconciliation

### Tour Operators
- Coordinate multiple suppliers (hotels, transport, guides)
- Track operational costs and margins
- Manage customer communications
- Generate financial reports for stakeholders

### Corporate Travel
- Handle employee travel requests
- Track departmental travel budgets
- Integrate with expense management systems
- Provide detailed travel reports

## 🔧 Technical Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Functions)  
- **UI Components**: shadcn/ui, Radix UI
- **Charts**: Recharts
- **File Processing**: ExcelJS, JSZip, PDF parsing
- **AI**: Google Gemini for data extraction

## 📦 Database Schema

### Core Tables
- `packages` - Travel packages/bookings
- `invoices` - Expense and income records  
- `customers` - Client information
- `suppliers` - Vendor management
- `bank_transactions` - Financial records

### Supporting Tables
- `expense_categories` - Customizable expense types
- `notifications` - System alerts
- `user_roles` - Access control
- `shareable_links` - Client portal access

## 🔐 Security Features

- ✅ Row Level Security (RLS) on all tables
- ✅ Role-based access control (Admin/Staff)  
- ✅ Secure file uploads with virus scanning
- ✅ Magic link authentication for clients
- ✅ Data encryption at rest and in transit

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```

### Netlify
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Docker
```bash
docker build -t travel-app .
docker run -p 3000:3000 travel-app
```

## 📖 Documentation

- [Setup Guide](./docs/SETUP.md)
- [Configuration Options](./docs/CONFIG.md)
- [API Reference](./docs/API.md)
- [Customization Guide](./docs/CUSTOMIZE.md)
- [Deployment Guide](./docs/DEPLOY.md)

## 🔄 Updates & Support

### Getting Updates
```bash
git remote add upstream <original-repo-url>
git fetch upstream
git merge upstream/main
```

### Community
- 📧 Email: support@yourtemplate.com
- 💬 Discord: [Join our community]
- 📚 Docs: [Full documentation]
- 🐛 Issues: [Report bugs]

## 📄 License

This template is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

## 🎯 Perfect For

- **Travel Agencies** - Small to medium agencies managing multiple packages
- **Tour Operators** - Companies organizing group tours
- **Corporate Travel** - Businesses managing employee travel
- **Freelance Travel Consultants** - Individual consultants tracking clients
- **Event Planners** - Managing travel components of events

## 💡 Customization Examples

### Add New Expense Category
```typescript
// Add to expense_categories table
{
  name: "Marketing",
  name_el: "Μάρκετινγκ", 
  icon: "📢",
  color: "#ff6b6b"
}
```

### Custom Report Template
```typescript
// src/lib/report-templates.ts
export const customReportTemplate = {
  title: "Monthly P&L Report",
  sections: ["revenue", "expenses", "profit"],
  format: "pdf"
}
```

### Integration Example
```typescript
// src/integrations/accounting-software.ts
export async function syncWithQuickBooks(transactions) {
  // Your accounting software integration
}
```

Transform your travel business operations today! 🌍✈️