# Update Guide

## How Updates Work

TravelDocs uses a versioned release system. Updates are delivered through:

1. **Private GitHub Repository** (Extended & Agency licenses)
2. **Download Portal** (all licenses)
3. **Email Notifications** for security patches

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
  │      │     └── Bug fixes, security patches (free for all)
  │      └──────── New features, improvements (tier-dependent)
  └─────────────── Breaking changes, major redesigns (tier-dependent)
```

## Applying Updates

### Method 1: Git Merge (Recommended)

```bash
# Add the template upstream (one-time setup)
git remote add template https://github.com/traveldocs/template.git

# Fetch latest changes
git fetch template

# Create a branch for the update
git checkout -b update/v1.1.0

# Merge the update
git merge template/main --allow-unrelated-histories

# Resolve any conflicts with your customizations
# Then merge into your main branch
git checkout main
git merge update/v1.1.0
```

### Method 2: Manual Update

1. Download the latest release from the portal
2. Compare changed files using a diff tool
3. Manually apply changes, preserving your customizations

### Method 3: Selective Update

For specific fixes only:
```bash
# Cherry-pick specific commits
git cherry-pick <commit-hash>
```

## Safe Update Practices

### Files You Should NOT Override
These contain your customizations — never overwrite blindly:
- `src/config/app.config.ts` — Your business configuration
- `.env` — Your environment variables  
- `src/lib/translations.ts` — If you've added custom translations
- Any component you've significantly modified

### Files Safe to Update
These are framework/library files:
- `src/components/ui/*` — shadcn/ui components
- `src/integrations/supabase/types.ts` — Auto-generated
- `package.json` — Dependency updates (merge carefully)
- `supabase/functions/*` — Edge functions

### Database Migrations
New versions may include database migrations:
```bash
# Always backup before migrating
pg_dump your_database > backup_$(date +%Y%m%d).sql

# Run new migrations
psql -f migrations/v1.1.0.sql
```

## Update Checklist

- [ ] Backup your database
- [ ] Backup your `app.config.ts` and `.env`
- [ ] Read the CHANGELOG for breaking changes
- [ ] Apply the update (git merge or manual)
- [ ] Resolve conflicts preserving your customizations
- [ ] Run `npm install` for new dependencies
- [ ] Run database migrations if included
- [ ] Test core flows: login, upload, export
- [ ] Deploy to staging before production

## Rollback

If an update causes issues:
```bash
# Git rollback
git revert HEAD
# or
git reset --hard <previous-commit>

# Database rollback (if you backed up)
psql your_database < backup_20260309.sql
```

---

## Release History

### v1.0.0 — Initial Release (March 2026)
- Complete travel business management system
- Invoice management with AI extraction
- Bank sync & transaction matching
- Export hub with accountant portal
- Multi-language support (EN/EL)
- Full documentation & setup guide

### Planned Roadmap
- **v1.1** — Multi-currency support, Stripe payments
- **v1.2** — Mobile PWA, offline mode
- **v1.3** — Advanced reporting, custom dashboards
- **v2.0** — Multi-tenant SaaS mode

---

## Subscription to Updates

- **Email list**: Subscribe at traveldocs.dev/updates
- **GitHub**: Watch the private repo for releases
- **RSS**: Follow our changelog feed
