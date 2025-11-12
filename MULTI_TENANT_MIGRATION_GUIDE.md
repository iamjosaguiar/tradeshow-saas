# Multi-Tenant Migration Guide

This document outlines all changes needed to complete the multi-tenant conversion.

## ✅ Completed

1. **Database Schema** - All tables created with tenant_id columns
2. **Migration Scripts** - Ready to run (`scripts/run-migration.ts`)
3. **Middleware** - Subdomain detection implemented
4. **Authentication** - NextAuth updated with tenant context
5. **Tenant Utilities** - Helper functions in `lib/tenant.ts`
6. **CRM Utilities** - Tenant-aware CRM operations in `lib/crm.ts`
7. **Context Provider** - React context for tenant data
8. **Tradeshows API** - Fully updated with tenant filtering ✅

## 🔄 API Routes Requiring Updates

### Priority 1: Critical Data Routes

#### ✅ `/api/tradeshows/route.ts` - COMPLETED
- Added tenant_id filtering to all queries
- Updated CRM integration to use tenant-specific credentials
- Added tenant_id when creating tradeshows

#### 📝 `/api/trade-show-lead/route.ts` - NEEDS UPDATE
**Required Changes:**
```typescript
// 1. Get tenant from subdomain or tradeshow
// 2. Use getTenantCRMConnection() instead of process.env
// 3. Add tenant_id when inserting badge_photos
// 4. Filter tradeshows by tenant_id

Example:
const tenant = await getCurrentTenant();
const acConnection = await getTenantCRMConnection(tenant.id, 'activecampaign');
// Use acConnection.api_key and acConnection.api_url
```

#### 📝 `/api/tradeshows/[id]/route.ts` - NEEDS UPDATE
**Required Changes:**
```typescript
// GET: Add WHERE tenant_id = ${session.user.tenantId}
// PUT: Verify tenant_id matches before update
// DELETE: Verify tenant_id matches before delete
```

#### 📝 `/api/tradeshows/by-slug/[slug]/route.ts` - NEEDS UPDATE
```typescript
// Add tenant_id filter when looking up tradeshow by slug
WHERE slug = ${slug} AND tenant_id = ${tenantId}
```

#### 📝 `/api/reps/route.ts` - NEEDS UPDATE
```typescript
// GET: Filter users by tenant_id
WHERE tenant_id = ${session.user.tenantId}

// POST: Add tenant_id when creating user
INSERT INTO users (..., tenant_id) VALUES (..., ${tenantId})
```

#### 📝 `/api/badge-photo/[id]/route.ts` - NEEDS UPDATE
```typescript
// Verify tenant_id matches before returning photo
WHERE id = ${id} AND tenant_id = ${session.user.tenantId}
```

#### 📝 `/api/tradeshow-analytics/route.ts` - NEEDS UPDATE
```typescript
// Filter all analytics by tenant_id
```

### Priority 2: Supporting Routes

#### 📝 `/api/dynamics/users/route.ts` - NEEDS UPDATE
```typescript
// Use tenant's Dynamics connection instead of env vars
const connection = await getTenantCRMConnection(tenantId, 'dynamics365');
```

#### 📝 `/api/track-view/route.ts` - NEEDS UPDATE
```typescript
// Add tenant_id when inserting page_views
// Get tenant from subdomain or tradeshow
```

#### 📝 `/api/settings/route.ts` - NEEDS UPDATE
```typescript
// Filter user settings by tenant_id
```

## 🆕 New API Routes To Create

### 1. Super Admin Routes

#### `/app/api/super-admin/tenants/route.ts`
```typescript
// GET - List all tenants (super admin only)
// POST - Create new tenant (super admin only)
```

#### `/app/api/super-admin/tenants/[id]/route.ts`
```typescript
// GET - Get tenant details
// PUT - Update tenant (branding, limits, etc.)
// DELETE - Soft delete tenant
```

#### `/app/api/super-admin/login/route.ts`
```typescript
// POST - Super admin authentication
```

### 2. Tenant Settings Routes

#### `/app/api/tenant/branding/route.ts`
```typescript
// GET - Get tenant branding
// PUT - Update branding (logo, colors)
```

#### `/app/api/tenant/crm-connections/route.ts`
```typescript
// GET - List CRM connections
// POST - Add new CRM connection
```

#### `/app/api/tenant/crm-connections/[id]/route.ts`
```typescript
// PUT - Update CRM connection
// DELETE - Remove CRM connection
// POST /test - Test CRM connection
```

### 3. Billing Routes

#### `/app/api/billing/plans/route.ts`
```typescript
// GET - List available subscription plans
```

#### `/app/api/billing/checkout/route.ts`
```typescript
// POST - Create Stripe checkout session
```

#### `/app/api/billing/portal/route.ts`
```typescript
// POST - Create Stripe billing portal session
```

#### `/app/api/webhooks/stripe/route.ts`
```typescript
// POST - Handle Stripe webhooks
```

## 🎨 UI Components To Create

### 1. Super Admin Dashboard

**Location:** `/app/super-admin/page.tsx`
- List all tenants with status
- Quick stats (active subscriptions, revenue, users)
- Create new tenant button
- Search and filter tenants

**Location:** `/app/super-admin/tenants/[id]/page.tsx`
- Tenant details and settings
- Usage statistics
- Subscription management
- Grant complimentary access
- Impersonate tenant (view as)

### 2. Tenant Settings Pages

**Location:** `/app/dashboard/settings/branding/page.tsx`
- Upload logo
- Set brand colors (color picker)
- Preview changes
- Company information

**Location:** `/app/dashboard/settings/integrations/page.tsx`
- List connected CRMs
- Add ActiveCampaign integration
- Add Dynamics 365 integration
- Test connections
- Configure field mappings

**Location:** `/app/dashboard/settings/billing/page.tsx`
- Current plan details
- Usage metrics (users, tradeshows, submissions)
- Upgrade/downgrade options
- Billing history
- Update payment method

### 3. Tenant Onboarding Flow

**Location:** `/app/onboarding/page.tsx`
- Step 1: Company information
- Step 2: Subdomain selection
- Step 3: Branding (optional)
- Step 4: Billing/plan selection
- Step 5: CRM integration (optional)
- Step 6: Complete

### 4. Dynamic Branding Updates

**Update these components to use tenant branding:**
- Logo components (use `useTenantBranding()`)
- Button styles (use tenant primary color)
- Header/footer (use tenant dark color)
- All hardcoded CleanSpace references

## 🔒 Security Checklist

- [ ] All queries filter by tenant_id
- [ ] Users cannot access other tenants' data
- [ ] Super admin routes are properly protected
- [ ] CRM credentials are encrypted at rest (future)
- [ ] Audit logging for sensitive actions
- [ ] Rate limiting per tenant
- [ ] Subdomain validation

## 🧪 Testing Plan

### Tenant Isolation Tests
1. Create two test tenants
2. Create data in each tenant
3. Verify queries only return tenant-specific data
4. Attempt cross-tenant access (should fail)

### CRM Integration Tests
1. Test ActiveCampaign with tenant credentials
2. Test Dynamics 365 with tenant credentials
3. Test with missing credentials (graceful failure)
4. Test invalid credentials (proper error handling)

### Subscription Tests
1. Test trial period
2. Test subscription activation
3. Test hitting usage limits
4. Test complimentary access

## 📋 Deployment Checklist

1. **Pre-Migration**
   - [ ] Backup production database
   - [ ] Test migration on staging environment
   - [ ] Verify all existing functionality works

2. **Migration**
   - [ ] Run `npx tsx scripts/run-migration.ts`
   - [ ] Verify CleanSpace tenant created
   - [ ] Verify all data migrated correctly
   - [ ] Test CleanSpace subdomain access

3. **DNS Configuration**
   - [ ] Set up wildcard DNS (*.yourdomain.com)
   - [ ] Configure SSL certificate for wildcard
   - [ ] Update NEXTAUTH_URL environment variable

4. **Post-Migration**
   - [ ] Update environment variables on Vercel
   - [ ] Test all CleanSpace functionality
   - [ ] Create first test tenant
   - [ ] Verify tenant isolation

5. **Monitoring**
   - [ ] Set up error tracking for tenant operations
   - [ ] Monitor Stripe webhook deliveries
   - [ ] Track CRM sync success rates

## 🚀 Quick Start Commands

```bash
# Run migration
npx tsx scripts/run-migration.ts

# Start development server
npm run dev

# Test subdomain locally (add to /etc/hosts)
# 127.0.0.1 cleanspace.localhost
# 127.0.0.1 testcompany.localhost

# Access locally
# http://cleanspace.localhost:3000
```

## 📞 Support

If you encounter issues during migration:
1. Check the migration logs
2. Verify all environment variables are set
3. Review the audit_logs table for errors
4. Check tenant_crm_connections for CRM issues
