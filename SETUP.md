# CleanSpace Tradeshow App - Setup Guide

## New Authentication System

This app now includes a complete authentication system with role-based access control (Admin/Rep) and dynamic tradeshow management.

## Database Setup

### 1. Run the Schema Migration

Execute the `db-schema.sql` file in your Neon database:

```bash
# Connect to your Neon database and run:
psql $DATABASE_URL < db-schema.sql
```

This will create:
- `users` table (authentication)
- `tradeshows` table (dynamic tradeshow management)
- `tradeshow_tags` table (custom tags for tradeshows)
- `sessions` table (session management)
- `page_views` table (analytics tracking)
- Updates to `badge_photos` table (adds tradeshow_id and submitted_by_rep columns)

### 2. Default Users

The schema creates default users:

**Admin Account:**
- Email: `admin@cleanspace.com`
- Password: `admin123`
- Role: Admin (can create tradeshows, view all analytics)

**Sample Rep Accounts:**
- Email: `john.smith@cleanspace.com` / Password: `admin123` / Rep Code: `john-smith`
- Email: `jane.doe@cleanspace.com` / Password: `admin123` / Rep Code: `jane-doe`

**⚠️ IMPORTANT:** Change the admin password immediately after first login!

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
```env
# Database
DATABASE_URL="postgresql://user:password@host/database"

# NextAuth.js - REQUIRED
NEXTAUTH_URL="http://localhost:3000"  # Change to your domain in production
NEXTAUTH_SECRET="generate-a-random-secret-key-here"

# ActiveCampaign (optional)
ACTIVECAMPAIGN_API_URL="https://youraccountname.api-us1.com"
ACTIVECAMPAIGN_API_KEY="your-api-key-here"
```

### Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## Features

### Admin Dashboard (`/dashboard/admin`)

Admins can:
- ✅ View all tradeshows with submission counts
- ✅ Create new tradeshows with custom fields
- ✅ Set ActiveCampaign tag IDs for each tradeshow
- ✅ View detailed analytics per tradeshow
- ✅ See which reps submitted leads
- ✅ Monitor submission trends

### Rep Dashboard (`/dashboard/rep`)

Reps can:
- View available tradeshows (ordered by latest created)
- Access their personalized lead capture forms
- See submission counts for tradeshows they have access to
- Track their performance

### Dynamic Tradeshow Creation

When creating a tradeshow, admins specify:
- **Name**: Display name (e.g., "A+A Trade Show 2024")
- **Slug**: URL-friendly identifier (auto-generated from name)
- **Description**: Event description
- **Location**: Event location
- **Start/End Dates**: Event dates
- **ActiveCampaign Tag ID**: Custom tag to apply to submissions

### How Submissions Are Tracked

1. Each tradeshow gets a unique ID
2. Form submissions link to the tradeshow via `tradeshow_id`
3. Submissions also track which rep captured the lead via `submitted_by_rep`
4. Analytics show counts per tradeshow and per rep

## Pages Overview

- `/` - Redirects to login
- `/login` - Authentication page
- `/dashboard` - Routes to appropriate dashboard based on role
- `/dashboard/admin` - Admin dashboard (tradeshow management)
- `/dashboard/admin/tradeshows/[id]` - Detailed tradeshow view
- `/dashboard/rep` - Rep dashboard (tradeshow list)
- `/trade-show-lead` - Public lead capture form
- `/aa-tradeshow-lead` - A+A specific lead capture
- `/aa-tradeshow-lead/[rep]` - Rep-specific lead capture

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Deployment

1. Set up your Neon database
2. Run the schema migration
3. Configure environment variables in Vercel
4. Deploy

## Security Notes

- Passwords are hashed using bcrypt (cost factor: 10)
- Sessions use JWT tokens
- Session expiration: 30 days
- All admin routes require authentication
- Role-based access control prevents unauthorized access

## Next Steps

1. Run database migration
2. Change default admin password
3. Create real user accounts
4. Create your first tradeshow
5. Test the form submission flow
6. Monitor analytics

## Support

For issues or questions, contact the development team.
