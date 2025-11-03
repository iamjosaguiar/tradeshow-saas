# CleanSpace Trade Show Forms

A standalone Next.js application for managing trade show lead capture forms with ActiveCampaign integration.

## Features

- 📝 Trade show lead capture forms
- 👥 Personalized rep links for A+A Tradeshow
- 📊 Analytics dashboard
- 🔄 ActiveCampaign integration
- 📸 Badge photo upload and storage
- 🗄️ PostgreSQL database (Neon)
- 📈 Page view tracking

## Forms Available

1. **Regular Trade Show Form**: `/trade-show-lead`
2. **A+A Tradeshow Form**: `/aa-tradeshow-lead`
3. **Personalized Rep Forms**: `/aa-tradeshow-lead/[rep]`
   - Available reps: JB, Gabrielle, Greg, Laurent, Craig, Krister, Patrick, Fabienne
4. **Analytics Dashboard**: `/tradeshow-analytics`

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your credentials:

- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `ACTIVECAMPAIGN_API_URL`: Your ActiveCampaign API endpoint
- `ACTIVECAMPAIGN_API_KEY`: Your ActiveCampaign API key

### 3. Set Up Database

Create the `badge_photos` and `page_views` tables in your Neon database:

```sql
CREATE TABLE IF NOT EXISTS badge_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  image_data BYTEA NOT NULL,
  form_source VARCHAR(50) DEFAULT 'trade-show-lead',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_email_filename UNIQUE (contact_email, filename)
);

CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_source VARCHAR(50) NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_page_views_form_source ON page_views(form_source);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON page_views(viewed_at);
```

### 4. Configure ActiveCampaign

Ensure you have the following custom fields in ActiveCampaign:
- Field 8: Company
- Field 11: Current Respirator
- Field 12: Work Environment
- Field 13: Number of Staff

Create tags:
- Tag 6: "canadianfrench show" (for regular trade show)
- Tag 7: "A+A Tradeshow" (for A+A event)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 6. Build for Production

```bash
npm run build
npm run start
```

## Deployment

This application is ready to deploy on Vercel:

1. Push to GitHub
2. Import in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## API Routes

- `/api/trade-show-lead` - Handle regular trade show form submissions
- `/api/aa-tradeshow-lead` - Handle A+A tradeshow form submissions
- `/api/badge-photo/[id]` - Retrieve badge photos
- `/api/track-view` - Track page views
- `/api/tradeshow-analytics` - Get analytics data

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon Serverless)
- **CRM**: ActiveCampaign API v3
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Deployment**: Vercel

## License

Private - CleanSpace Technology

## Support

For issues or questions, contact the development team.
