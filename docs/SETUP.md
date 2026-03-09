# Setup Guide

## Prerequisites
- Node.js 18+
- npm or bun
- A Supabase account (free tier works)

## Step 1: Clone & Install

```bash
git clone <repo-url>
cd travel-business-template
npm install
```

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **Anon Key** from Settings → API

## Step 3: Environment Variables

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## Step 4: Database Setup

Run the migration file to create all tables:

```sql
-- Run in Supabase SQL Editor: supabase_setup.sql
```

Or use the Supabase CLI:
```bash
supabase db push
```

## Step 5: Storage Buckets

Create these storage buckets in Supabase Dashboard → Storage:

| Bucket Name | Public | Purpose |
|---|---|---|
| `invoices` | No | Invoice PDF/image uploads |
| `bank-statements` | No | Bank statement PDFs |
| `invoice-lists` | No | Excel import files |
| `invoice-receipts` | Yes | Public receipt access |

## Step 6: Create First Admin User

1. Start the app: `npm run dev`
2. Navigate to `/login`
3. Sign up with your email
4. In Supabase SQL Editor, run:

```sql
INSERT INTO public.user_roles (user_id, role) 
VALUES ('<your-user-id>', 'admin');
```

## Step 7: Configure Your Business

1. Log in and go to Settings
2. Update company name, VAT, address, bank details
3. Add your expense categories
4. Configure notification preferences

## Step 8: Customize Branding

Edit `src/config/app.config.ts`:

```typescript
export const APP_CONFIG = {
  company: {
    name: "Your Agency Name",
    // ... your details
  },
  features: {
    // Enable/disable features
  }
}
```

## Step 9: Deploy

### Vercel
```bash
npm run build
vercel deploy --prod
```

### Environment Variables on Vercel
Add the same `.env` variables in Vercel → Settings → Environment Variables.

## Troubleshooting

### "Permission denied" errors
- Ensure your user has a role in `user_roles` table
- Check RLS policies are properly set up

### "Storage bucket not found"
- Create the required storage buckets (Step 5)
- Enable appropriate RLS policies for buckets

### AI Extraction not working
- Ensure `LOVABLE_API_KEY` or `GEMINI_API_KEY` is set in Supabase secrets
- Check Edge Function logs for errors

## Need Help?

- 📧 support@template.com
- 📚 Full docs at /docs
- 🐛 Report issues on GitHub