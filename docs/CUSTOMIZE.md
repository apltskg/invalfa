# Customization Guide

## Changing the Design

### Colors
Edit `src/index.css` to change the color scheme:

```css
:root {
  --primary: 221.2 83.2% 53.3%;    /* Main brand color */
  --primary-foreground: 210 40% 98%; /* Text on primary */
  --accent: 210 40% 96.1%;          /* Secondary accent */
  --background: 0 0% 100%;          /* Page background */
}
```

### Fonts
Update `tailwind.config.ts`:

```typescript
fontFamily: {
  sans: ['Your Font', 'system-ui', 'sans-serif'],
}
```

### Logo
Replace `public/logo.png` with your logo and update `APP_CONFIG.company.logoUrl`.

## Adding a New Page

1. Create the page component:
```typescript
// src/pages/MyNewPage.tsx
export default function MyNewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My New Page</h1>
    </div>
  );
}
```

2. Add route in `src/App.tsx`:
```typescript
<Route path="my-page" element={<MyNewPage />} />
```

3. Add navigation in `src/components/layout/AppSidebar.tsx`:
```typescript
{ title: "My Page", url: "/my-page", icon: SomeIcon }
```

## Adding Languages

1. Add translations in `src/lib/translations.ts`:
```typescript
export const fr = {
  nav: { packages: "Forfaits", dashboard: "Tableau de bord" },
  // ... all keys
};
```

2. Update the Language type:
```typescript
export type Language = "en" | "el" | "fr";
```

3. Add to language switcher in `src/components/ui/language-switcher.tsx`.

## Adding Expense Categories

Insert via Supabase SQL:
```sql
INSERT INTO expense_categories (name, name_el, icon, color, sort_order)
VALUES ('Marketing', 'Μάρκετινγκ', '📢', '#ff6b6b', 10);
```

## Custom Reports

Create report templates in `src/lib/pdf-generator.ts` using jsPDF.

## Modifying Database Schema

1. Create migration file in `supabase/migrations/`
2. Run `supabase db push`
3. Update TypeScript types accordingly

## Deployment Options

### Vercel (Recommended)
- Connect GitHub repo
- Set environment variables
- Auto-deploys on push

### Netlify
- Connect GitHub repo  
- Build command: `npm run build`
- Publish directory: `dist`

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["npx", "serve", "dist"]
```