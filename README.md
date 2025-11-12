# 🚀 Tradeshow Lead Capture SaaS

Multi-tenant SaaS platform for tradeshow lead capture with per-tenant CRM integrations. Serve multiple clients with complete data isolation and custom branding.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-green)](https://neon.tech/)

## ✨ Features

### Multi-Tenancy
- **Subdomain Routing** - Each client gets their own subdomain (e.g., `cleanspace.yourdomain.com`)
- **Complete Data Isolation** - Clients can't see each other's data
- **Custom Branding** - Logo, colors, and company information per tenant
- **Usage Limits** - Configurable users, tradeshows, and submission limits per plan

### CRM Integration
- **ActiveCampaign** - Per-tenant connections with flexible field mapping
- **Dynamics 365** - Per-tenant OAuth integration with lead assignment
- **Extensible** - Easy to add HubSpot, Salesforce, etc.

### Subscription Management
- **3 Pricing Tiers** - Starter ($49), Professional ($149), Enterprise ($449)
- **Complimentary Access** - Grant free unlimited access to special clients
- **Stripe Integration** - (Foundation ready, needs completion)
- **Usage Tracking** - Monitor users, tradeshows, and monthly submissions

### Form Features
- **Badge Photo Upload** - Capture business card/badge photos
- **Country Selection** - Searchable dropdown with flags
- **Custom Fields** - Industry-specific fields (respirator, environment, etc.)
- **Rep Tracking** - Assign submissions to specific sales reps
- **Analytics** - View submission counts and trends

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/iamjosaguiar/tradeshow-saas.git
cd tradeshow-saas
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and configure:

```env
DATABASE_URL="your-postgresql-url"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

### 3. Run Migration

```bash
npx tsx scripts/run-migration-test.ts
```

This will:
- Create all multi-tenant tables
- Set up CleanSpace as first tenant
- Migrate existing data
- Create super admin account: `admin@test.com` / `TestAdmin123!`

### 4. Add Subdomain to Hosts (Local Development)

**Mac/Linux:**
```bash
sudo nano /etc/hosts
# Add: 127.0.0.1 cleanspace.localhost
```

**Windows:**
Edit `C:\Windows\System32\drivers\etc\hosts`

### 5. Start Development Server

```bash
npm run dev
```

Visit: `http://cleanspace.localhost:3000`

## 📚 Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get up and running in 5 minutes
- **[Setup Complete](MULTI_TENANT_SETUP_COMPLETE.md)** - Comprehensive overview
- **[Migration Guide](MULTI_TENANT_MIGRATION_GUIDE.md)** - Detailed migration instructions

## 🏗️ Architecture

```
├── /app/api
│   ├── /super-admin       # Platform administration
│   ├── /tenant            # Tenant settings (branding, CRM)
│   ├── /tradeshows        # Tradeshow management
│   └── /trade-show-lead   # Form submission handler
├── /contexts
│   └── TenantContext.tsx  # React context for tenant data
├── /lib
│   ├── tenant.ts          # Tenant utilities
│   ├── crm.ts             # CRM integration helpers
│   └── auth.ts            # NextAuth configuration
├── /migrations            # Database migrations
└── /scripts               # Migration and setup scripts
```

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon Serverless)
- **Authentication:** NextAuth.js
- **Styling:** Tailwind CSS + Radix UI
- **CRM:** ActiveCampaign API, Dynamics 365 API
- **Analytics:** Vercel Analytics

## 📊 Database Schema

```sql
-- Multi-Tenant Core
tenants                    # Client companies
tenant_crm_connections     # Per-tenant CRM credentials
subscription_plans         # Pricing tiers
tenant_subscriptions       # Active subscriptions
super_admins              # Platform administrators
audit_logs                # Activity tracking

-- Application Tables (tenant-scoped)
users                     # With tenant_id
tradeshows               # With tenant_id
badge_photos             # With tenant_id
page_views               # With tenant_id
```

## 🎯 Roadmap

### ✅ MVP (Complete)
- [x] Multi-tenant database architecture
- [x] Subdomain routing
- [x] Tenant-specific CRM integrations
- [x] Basic subscription management
- [x] Data migration scripts
- [x] CleanSpace migrated as first tenant

### 🚧 Phase 2 (In Progress)
- [ ] Super admin dashboard UI
- [ ] Tenant settings pages (branding, CRM, billing)
- [ ] Complete Stripe integration
- [ ] Dynamic branding (logos, colors)
- [ ] Tenant onboarding flow

### 📅 Phase 3 (Planned)
- [ ] Email notifications
- [ ] Webhook integrations
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] White-label options

## 🧪 Testing

```bash
# Verify migration
node scripts/verify-migration.js

# Check tenant isolation
# Create test tenants and verify data separation
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Configure DNS:**
   - Add wildcard A/CNAME: `*.yourdomain.com`
   - Vercel handles SSL automatically

2. **Environment Variables:**
   ```bash
   DATABASE_URL=...
   NEXTAUTH_URL=https://yourdomain.com
   NEXTAUTH_SECRET=...
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

## 🔒 Security

- ✅ Row-level tenant isolation in database
- ✅ JWT-based authentication
- ✅ Environment variable protection
- ✅ Audit logging for sensitive actions
- ⏳ CRM credential encryption (planned)
- ⏳ Rate limiting per tenant (planned)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is proprietary. All rights reserved.

## 🙏 Acknowledgments

Enterprise-grade multi-tenant SaaS platform for tradeshow lead capture.

**Powered by:**
- [Claude Code](https://claude.com/claude-code) - AI pair programming
- Next.js team
- Vercel
- Neon Database

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/iamjosaguiar/tradeshow-saas/issues)
- **Documentation:** See documentation files in root directory

---

**⚡ Built with Claude Code** - [claude.com/claude-code](https://claude.com/claude-code)
