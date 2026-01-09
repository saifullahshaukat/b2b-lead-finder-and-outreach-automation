# B2B Lead Finder & Outreach Automation

[![GitHub Stars](https://img.shields.io/github/stars/saifullahshaukat/b2b-lead-finder-and-outreach-automation?style=flat-square&logo=github)](https://github.com/saifullahshaukat/b2b-lead-finder-and-outreach-automation)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-purple?style=flat-square&logo=vite)](https://vitejs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![Status](https://img.shields.io/badge/Status-Active%20Development-blue?style=flat-square)](#)

> **Stop Manual Prospecting. Start Scaling Outreach.**
> 
> Open-source B2B lead finder and outreach automation platform. Find business contacts from Google Maps and professional networks, manage leads, track outreach, and close deals. Self-hosted, free, production-ready.

## Why B2B Lead Finder?

- **🔍 Built-in Scrapers** - Google Maps & LinkedIn lead extraction without external tools
- **📊 Full CRM** - Lead management, notes, tags, status tracking, and more
- **🚀 No Login Required** - LinkedIn scraping via Google/DuckDuckGo (no account needed)
- **💾 Self-Hosted** - Your data stays on your servers
- **🆓 100% Free** - MIT licensed, no hidden costs
- **⚡ Production Ready** - Deploy in minutes with Docker or manual setup

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Screenshots](#screenshots)
- [Use Cases](#use-cases)
- [Technology Stack](#technology-stack)
- [Scrapers](#scrapers)
- [CRM Capabilities](#crm-capabilities)
- [Development](#development)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [FAQ](#faq)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Support](#support--contact)

---

## Quick Start

### Prerequisites
- **Node.js** v18 or higher
- **PostgreSQL** v14 or higher
- **npm**, **yarn**, or **bun** package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/saifullahshaukat/b2b-lead-finder-and-outreach-automation.git

# Navigate to project
cd b2b-lead-finder-and-outreach-automation

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
psql -U postgres -d your_database -f server/db/schema.sql

# Start development server (frontend + backend)
npm run dev
```

Open **http://localhost:8080** in your browser. CRM is live!

---

## Features

### 🔍 Google Maps Scraper
- Search any business type in any location
- Extract business name, phone, email, website, address
- Rating and review count extraction
- Automatic deduplication
- Export results to CSV/JSON
- Real-time progress tracking

### 🔗 LinkedIn Scraper (Dual Mode)
- **Google-based Mode** - No login required, uses search engines to find profiles
- **Login-based Mode** - More detailed data with LinkedIn session
- Search for people by job title, keywords, location
- Search for companies by industry, location
- Extract name, headline, company, profile URL
- Auto-import to CRM as leads

### 📋 Lead Management
- Full lead lifecycle tracking (New → Contacted → Replied → Qualified → Closed)
- Source tracking (Google Maps, LinkedIn, CSV import, Manual)
- Custom tags for categorization
- Notes with timestamps
- Contact info management (email, phone, website, LinkedIn)
- Bulk actions (delete, status update)
- Search and filtering

### 📈 Analytics Dashboard
- Total leads by source
- Lead status distribution
- Conversion tracking
- Recent activity feed

### 🔌 Integrations Page
- Connect LinkedIn account for enhanced scraping
- Session management
- API status monitoring

---

## Screenshots

<details>
<summary>📊 Dashboard</summary>

The main dashboard shows key metrics, recent leads, and quick actions.

</details>

<details>
<summary>👥 Leads Management</summary>

Full-featured leads table with filtering, bulk actions, and detailed lead profiles.

</details>

<details>
<summary>🔍 Google Maps Scraper</summary>

Configure scraping jobs, monitor progress, and auto-import leads.

</details>

<details>
<summary>🔗 LinkedIn Scraper</summary>

Dual-mode LinkedIn scraping with keyword tags and location autocomplete.

</details>

---

## Use Cases

- **Sales Teams** - Build targeted prospect lists from Google Maps and LinkedIn
- **Recruiters** - Find candidates by job title and location
- **Agencies** - Generate leads for clients across industries
- **Startups** - Bootstrap customer outreach without expensive tools
- **Freelancers** - Find clients in specific niches
- **Real Estate** - Find property managers and agents
- **B2B Sales** - Target decision-makers by company and role

---

## How It Compares

| Feature | Outreach CRM | Apollo.io | Hunter.io | Manual Research |
|---------|--------------|-----------|-----------|-----------------|
| Google Maps Scraping | ✅ Built-in | ❌ No | ❌ No | ❌ Manual |
| LinkedIn Scraping | ✅ Dual-mode | ✅ Yes | ❌ No | ❌ Manual |
| No Login Required | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| CRM Included | ✅ Full CRM | ✅ Yes | ❌ No | ❌ No |
| Self-Hosted | ✅ Yes | ❌ No | ❌ No | N/A |
| Open Source | ✅ MIT | ❌ No | ❌ No | N/A |
| Monthly Cost | ✅ Free | ❌ $49-499+ | ❌ $49-399+ | ✅ Free |
| Data Ownership | ✅ 100% Yours | ❌ Their Servers | ❌ Their Servers | ✅ Yours |

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | Modern UI framework |
| **TypeScript** | Type-safe development |
| **Vite** | Fast build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Beautiful component library |
| **TanStack Query** | Data fetching & caching |
| **React Router** | Client-side routing |
| **Lucide Icons** | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **PostgreSQL** | Database |
| **Playwright** | Browser automation for scraping |
| **tsx** | TypeScript execution |

---

## Scrapers

### Google Maps Scraper

The Google Maps scraper uses Playwright to automate searches and extract business data.

**Extracted Data:**
- Business name
- Phone number
- Email (when available)
- Website URL
- Full address
- Coordinates (lat/lng)
- Rating & review count
- Business category
- Google Maps URL

**Usage:**
1. Go to Lead Sources → Google Maps
2. Enter business types (e.g., "Restaurants, Cafes")
3. Enter location (e.g., "New York, NY")
4. Set max results
5. Click "Start Scraping"

### LinkedIn Scraper

Dual-mode LinkedIn scraper for finding professionals and companies.

**Mode 1: Google-based (No Login Required)**
- Uses DuckDuckGo to find LinkedIn profiles
- No LinkedIn account needed
- Works with `site:linkedin.com/in/` queries
- Extracts: Name, headline, company, profile URL

**Mode 2: Login-based (Enhanced Data)**
- Requires LinkedIn session
- More detailed profile data
- Connection degree visibility
- Requires one-time login setup

**Usage:**
1. Go to Lead Sources → LinkedIn
2. Choose scraping mode
3. Select search type (People/Companies)
4. Enter keywords and location
5. Click "Start Search"

---

## CRM Capabilities

### Lead Profile
Each lead includes:
- **Contact Info** - Email, phone, website, LinkedIn URL
- **Company Info** - Company name, job title
- **Status Tracking** - New, Contacted, Replied, Qualified, Closed, Lost
- **Tags** - Custom tags for categorization
- **Notes** - Timestamped notes with author tracking
- **Source** - Where the lead came from
- **Metadata** - Created date, last contact, source details

### Lead Actions
- **Email** - Open email client with lead's email
- **Call** - Click-to-call functionality
- **SMS** - Open SMS with lead's phone
- **LinkedIn** - Open lead's LinkedIn profile
- **Edit** - Update lead information
- **Delete** - Remove lead from CRM

### Bulk Operations
- Select multiple leads
- Bulk delete
- Bulk status update
- Export selected

---

## Development

### Project Structure

```
b2b-lead-finder-and-outreach-automation/
├── src/                    # Frontend source
│   ├── components/         # React components
│   │   ├── layout/        # Layout components
│   │   ├── leads/         # Lead-specific components
│   │   └── ui/            # shadcn/ui components
│   ├── pages/             # Page components
│   │   ├── sources/       # Scraper pages
│   │   └── outreach/      # Outreach pages
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API service functions
│   ├── contexts/          # React contexts
│   ├── types/             # TypeScript types
│   └── lib/               # Utilities
├── server/                 # Backend source
│   ├── index.ts           # Express server
│   ├── scraper-engine.ts  # Job processing engine
│   ├── scrapers/          # Scraper implementations
│   │   ├── google-maps.ts
│   │   └── linkedin.ts
│   └── db/                # Database
│       ├── schema.sql     # PostgreSQL schema
│       └── index.ts       # DB connection
├── public/                 # Static assets
└── package.json
```

### Available Scripts

```bash
# Start both frontend and backend in development
npm run dev

# Start only frontend
npm run dev:client

# Start only backend
npm run dev:server

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/outreach_crm

# Server
PORT=3001

# Optional: LinkedIn session path
LINKEDIN_SESSION_PATH=./linkedin-session.json
```

---

## Deployment

### Docker (Recommended)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Expose ports
EXPOSE 3001

# Start server
CMD ["npm", "run", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/outreach_crm
    depends_on:
      - db
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=outreach_crm
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/db/schema.sql:/docker-entrypoint-initdb.d/schema.sql

volumes:
  postgres_data:
```

### Manual Deployment

```bash
# Build the project
npm run build

# Set production environment
export NODE_ENV=production
export DATABASE_URL=your_production_db_url

# Start the server
npm run start
```

### Production Checklist

- [ ] PostgreSQL database configured
- [ ] Environment variables set
- [ ] SSL/TLS enabled (use reverse proxy)
- [ ] Firewall configured
- [ ] Backup strategy in place
- [ ] Monitoring set up

---

## API Reference

### Leads API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/leads` | List all leads |
| GET | `/api/v1/leads/:id` | Get single lead |
| POST | `/api/v1/leads` | Create lead |
| PATCH | `/api/v1/leads/:id` | Update lead |
| DELETE | `/api/v1/leads/:id` | Delete lead |
| POST | `/api/v1/leads/bulk-delete` | Bulk delete |
| POST | `/api/v1/leads/bulk-status` | Bulk status update |

### Notes API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/leads/:id/notes` | Get lead notes |
| POST | `/api/v1/leads/:id/notes` | Add note |
| DELETE | `/api/v1/leads/:leadId/notes/:noteId` | Delete note |

### Tags API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tags` | Get all tags |
| POST | `/api/v1/leads/:id/tags` | Add tags to lead |
| DELETE | `/api/v1/leads/:id/tags/:tag` | Remove tag |

### Scraper Jobs API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/jobs` | List all jobs |
| POST | `/api/v1/jobs` | Create scraper job |
| DELETE | `/api/v1/jobs/:id` | Delete job |
| GET | `/api/v1/jobs/:id/results` | Get job results |

---

## FAQ

**Q: Is this really free?**
A: Yes! 100% free and open source under MIT license. No hidden costs, no paid tiers.

**Q: Do I need a LinkedIn account?**
A: No! The Google-based mode works without any login. Login-based mode is optional for enhanced data.

**Q: Is LinkedIn scraping legal?**
A: We use public search engines to find public LinkedIn profiles. Always comply with LinkedIn's terms and your local laws.

**Q: How many leads can I scrape?**
A: No artificial limits. Depends on your hardware and rate limiting to avoid blocks.

**Q: Can I export my data?**
A: Yes! Export to CSV or JSON from the job results.

**Q: Does it work on Windows/Mac/Linux?**
A: Yes! Node.js and PostgreSQL run on all major operating systems.

**Q: Can multiple users use this?**
A: Currently single-user. Multi-user with authentication is on the roadmap.

**Q: How do I avoid getting blocked while scraping?**
A: The scrapers include delays between requests. For heavy use, consider rotating proxies.

---

## Roadmap

### v1.0 (Current)
- [x] Google Maps scraper with full data extraction
- [x] LinkedIn scraper (dual-mode)
- [x] Lead management with status tracking
- [x] Notes and tags system
- [x] Lead profile sidebar
- [x] Bulk actions
- [x] Search and filtering
- [x] Auto-import to CRM

### v1.1 (Planned)
- [ ] Email finder integration
- [ ] Email verification
- [ ] CSV import/export
- [ ] Lead scoring
- [ ] Custom fields
- [ ] Advanced filtering

### v2.0 (Future)
- [ ] Multi-user support with roles
- [ ] Authentication system
- [ ] Email sequences
- [ ] Email tracking (opens, clicks)
- [ ] Calendar integration
- [ ] Mobile app
- [ ] Webhook integrations
- [ ] Zapier/Make integration

**Have ideas?** Open an issue on [GitHub](https://github.com/saifullahshaukat/b2b-lead-finder-and-outreach-automation/issues)!

---

## Contributing

We welcome contributions! Whether it's bug fixes, new features, or documentation improvements.

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/b2b-lead-finder-and-outreach-automation.git`
3. Create a branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Run linter: `npm run lint`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Guidelines

- Use TypeScript for all new code
- Follow existing code style
- Update documentation for new features
- Test your changes locally
- Write clear commit messages

---

## Support & Contact

### Get Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/saifullahshaukat/b2b-lead-finder-and-outreach-automation/issues)
- **GitHub Discussions**: [Ask questions & share ideas](https://github.com/saifullahshaukat/b2b-lead-finder-and-outreach-automation/discussions)

### Connect

- **GitHub**: [@saifullahshaukat](https://github.com/saifullahshaukat)

### Troubleshooting

**PostgreSQL connection failed?**
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection string format
# postgresql://user:password@host:port/database
```

**Scraper not finding results?**
```bash
# LinkedIn may block automated requests
# Try reducing maxResults or adding delays
# Use headless: false to debug visually
```

**Port already in use?**
```bash
# Kill process on port 3001
npx kill-port 3001

# Or change port in .env
PORT=3002
```

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

You can:
- ✅ Use commercially
- ✅ Modify the code
- ✅ Distribute freely
- ✅ Use privately

Just include the license notice!

---

## Star History

If this project helps your outreach efforts, please give it a star! ⭐

It helps other sales teams and developers discover it.

[⭐ Star on GitHub](https://github.com/saifullahshaukat/b2b-lead-finder-and-outreach-automation)

---

## Ready to Scale Your Outreach?

Outreach CRM is production-ready and designed to help you find leads faster. Deploy it today and take control of your prospecting!

**Stop paying for expensive tools. Start owning your data.**

[Get Started Now](#quick-start) | [View on GitHub](https://github.com/saifullahshaukat/b2b-lead-finder-and-outreach-automation) | [Report Issues](https://github.com/saifullahshaukat/b2b-lead-finder-and-outreach-automation/issues)

---

**Made with ❤️ for sales teams and growth hackers. Happy prospecting!**
