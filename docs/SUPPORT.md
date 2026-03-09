# Support & Troubleshooting Guide

## 📞 Getting Help

### Support Channels
| Channel | Availability | Response Time |
|---------|-------------|---------------|
| Email | support@traveldocs.dev | 24-48h (Standard), 12h (Priority) |
| GitHub Issues | Private repo issues | 48h |
| Documentation | docs.traveldocs.dev | Self-service |

### Before Contacting Support
1. Check this troubleshooting guide
2. Search the [FAQ](#-frequently-asked-questions)
3. Review the [GitHub Issues](link-to-repo/issues)
4. Include your license key and error details in support requests

---

## 🔧 Troubleshooting

### Installation Issues

#### `npm install` fails
```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### TypeScript errors after install
```bash
# Regenerate types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### Database Issues

#### "Permission denied" on any table
1. Verify your user exists in `user_roles` table
2. Check RLS policies are enabled:
```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```
3. Ensure the `has_role` function exists and works:
```sql
SELECT has_role('your-user-id', 'admin');
```

#### Tables not created
Run the complete setup SQL in order:
```bash
# 1. Core tables
psql -f supabase_setup.sql
# 2. Seed data (optional)
psql -f docs/seed-data.sql
```

#### "Storage bucket not found"
Create required buckets in Supabase Dashboard → Storage:
- `invoices` (private)
- `bank-statements` (private)
- `invoice-lists` (private)
- `invoice-receipts` (public)

### Authentication Issues

#### Can't log in after signup
- Check if email confirmation is required (default: yes)
- For development, you can disable email confirmation in Supabase Auth settings
- Ensure your user has a role: `INSERT INTO user_roles (user_id, role) VALUES ('uuid', 'admin');`

#### Magic links not working
- Check `accountant_magic_links` table has valid entries
- Verify the link hasn't expired (default: 2 months)
- Ensure the URL includes the correct token parameter

### AI Extraction Issues

#### Invoice AI extraction returns empty
1. Check Edge Function logs in Supabase Dashboard
2. Verify `LOVABLE_API_KEY` or `GEMINI_API_KEY` is set in Supabase secrets
3. Ensure the uploaded file is under 10MB
4. Supported formats: PDF, PNG, JPG, JPEG

#### Bank PDF extraction fails
1. Ensure the PDF is text-based (not scanned image)
2. Check supported banks in `src/config/app.config.ts`
3. Review Edge Function logs for specific errors

### Export Issues

#### Excel export is empty
- Verify invoices exist for the selected month
- Check browser console for JavaScript errors
- Ensure `exceljs` package is installed: `npm list exceljs`

#### PDF generation fails
- Check if `jspdf` and `jspdf-autotable` are installed
- Verify font support for Greek characters (UTF-8)

### Performance Issues

#### App loads slowly
1. Check network tab for slow API calls
2. Verify Supabase project isn't paused (free tier pauses after inactivity)
3. Consider adding database indexes for frequently queried columns:
```sql
CREATE INDEX idx_invoices_package_id ON invoices(package_id);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
```

---

## ❓ Frequently Asked Questions

### General

**Q: Can I use this template for multiple projects?**
A: Each Standard license covers one project. Purchase an Extended or Agency license for multiple projects.

**Q: What happens when my support period expires?**
A: You keep full access to the code and can continue using it. You won't receive priority support or major updates, but security patches remain available.

**Q: Can I modify the source code?**
A: Yes! Full source code access is included. Customize anything to fit your business needs.

**Q: Is the template compatible with [hosting provider]?**
A: The template works with any static hosting (Vercel, Netlify, Cloudflare Pages) plus Supabase for the backend. Docker deployment is also supported.

### Technical

**Q: Can I use a different database?**
A: The template is built for Supabase (PostgreSQL). While theoretically possible to swap, it would require significant refactoring of auth, storage, and RLS policies.

**Q: Can I add new languages?**
A: Yes! Add translations in `src/lib/translations.ts` and register the language in `src/config/app.config.ts`.

**Q: How do I add new expense categories?**
A: Use the Settings page in-app, or insert directly into the `expense_categories` table.

**Q: Can I white-label the template?**
A: Extended and Agency licenses include white-label rights. Update branding in `src/config/app.config.ts`.

### Billing

**Q: Is there a free trial?**
A: We offer a live demo at [demo link]. There's a 14-day money-back guarantee after purchase.

**Q: Do you offer refunds?**
A: Yes, within 14 days of purchase if the template doesn't meet documented features.

**Q: Are updates free?**
A: Bug fixes are always free. Feature updates depend on your license tier.

---

## 🐛 Reporting Bugs

When reporting issues, include:
1. **License key** (for verification)
2. **Browser & OS** (e.g., Chrome 120 / macOS 14)
3. **Steps to reproduce** the issue
4. **Expected vs actual behavior**
5. **Console errors** (screenshot or text)
6. **Network tab** errors if applicable

### Bug Report Template
```
**License:** STD-XXXX
**Environment:** Chrome 120 / macOS 14 / Node 20
**Supabase:** Free tier / Pro

**Description:**
[What happened]

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. See error...

**Expected Behavior:**
[What should happen]

**Screenshots/Logs:**
[Attach here]
```

---

## 📋 Version Compatibility

| Template Version | Node.js | React | Supabase | Tailwind |
|-----------------|---------|-------|----------|----------|
| 1.0.x | 18+ | 18.3+ | Latest | 3.x |
| 1.1.x | 20+ | 18.3+ | Latest | 3.x |

---

## 🔐 Security Reporting

If you discover a security vulnerability:
1. **DO NOT** create a public GitHub issue
2. Email security@traveldocs.dev with details
3. We'll respond within 24 hours
4. A fix will be issued as a priority patch
