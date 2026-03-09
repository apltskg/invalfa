# Deployment Guide

## Quick Deploy Options

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repo in [Vercel Dashboard](https://vercel.com)
3. Add environment variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```
4. Deploy!

```bash
# Or via CLI
npm i -g vercel
vercel --prod
```

### Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

Add environment variables in Netlify Dashboard → Site Settings → Build & Deploy → Environment.

### Cloudflare Pages

1. Connect GitHub repo in Cloudflare Dashboard
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Add environment variables in Settings

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
docker build -t traveldocs .
docker run -p 80:80 traveldocs
```

## Supabase Setup for Production

### 1. Create Project
- Go to [supabase.com](https://supabase.com) → New Project
- Choose a strong database password
- Select region closest to your users

### 2. Run Migrations
```bash
# Using Supabase CLI
supabase link --project-ref your-project-ref
supabase db push

# Or manually via SQL Editor
# Run: supabase_setup.sql
```

### 3. Deploy Edge Functions
```bash
supabase functions deploy extract-invoice
supabase functions deploy extract-bank-pdf
supabase functions deploy send-invoice-email
supabase functions deploy send-proforma-email
supabase functions deploy verify-afm
supabase functions deploy accountant-portal-access
supabase functions deploy ai-match
supabase functions deploy manage-users
supabase functions deploy notify-admin
```

### 4. Set Secrets
```bash
supabase secrets set LOVABLE_API_KEY=your-key
supabase secrets set RESEND_API_KEY=your-key
```

### 5. Create Storage Buckets
Via Dashboard or SQL:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('bank-statements', 'bank-statements', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-lists', 'invoice-lists', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-receipts', 'invoice-receipts', true);
```

## Custom Domain

### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed

### SSL
All platforms listed above provide free SSL certificates automatically.

## Production Checklist

- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Storage buckets created with correct policies
- [ ] First admin user created with role
- [ ] Email service configured (Resend API key)
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Backup strategy in place
- [ ] Error monitoring set up (optional: Sentry)
