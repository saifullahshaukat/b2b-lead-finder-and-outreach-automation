# PostgreSQL Database Setup Guide

## Prerequisites
- PostgreSQL 14+ installed on your machine
- psql command-line tool available

## Step 1: Create the Database

Open PowerShell or Command Prompt and run:

```powershell
# Connect to PostgreSQL as superuser
psql -U postgres

# Inside psql, create the database
CREATE DATABASE outreach_crm;

# Create a dedicated user (optional but recommended)
CREATE USER outreach_user WITH PASSWORD 'SpyboyCRM1';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE outreach_crm TO outreach_user;

# Exit psql
\q
```

## Step 2: Run the Schema

```powershell
# Navigate to the project directory
cd D:\Projects\outreach-partner-main

# Run the schema file
psql -U postgres -d outreach_crm -f server/db/schema.sql
```

Or if you created a dedicated user:

```powershell
psql -U outreach_user -d outreach_crm -f server/db/schema.sql
```

## Step 3: Configure Environment Variables

Create a `.env` file in the project root (if not exists):

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/outreach_crm

# Or with individual variables
DB_HOST=localhost
DB_PORT=5432
DB_NAME=outreach_crm
DB_USER=postgres
DB_PASSWORD=your_password

# Server Configuration
PORT=3001
```

## Step 4: Verify Setup

Connect to the database and check tables:

```powershell
psql -U postgres -d outreach_crm

# List all tables
\dt

# You should see:
#  Schema |        Name           | Type  |  Owner
# --------+-----------------------+-------+----------
#  public | conversations         | table | postgres
#  public | custom_fields         | table | postgres
#  public | integrations          | table | postgres
#  public | lead_notes            | table | postgres
#  public | lead_source_configs   | table | postgres
#  public | leads                 | table | postgres
#  public | messages              | table | postgres
#  public | outreach_events       | table | postgres
#  public | outreach_sequences    | table | postgres
#  public | outreach_templates    | table | postgres
#  public | saved_views           | table | postgres
#  public | scraper_jobs          | table | postgres
#  public | scraper_results       | table | postgres
#  public | sequence_steps        | table | postgres
#  public | workflows             | table | postgres
```

## Common Commands

```sql
-- Check scraper jobs
SELECT id, name, type, status, results_count, created_at FROM scraper_jobs ORDER BY created_at DESC;

-- Check leads
SELECT id, first_name, last_name, email, company, status, source FROM leads LIMIT 10;

-- Count leads by source
SELECT source, COUNT(*) FROM leads GROUP BY source;

-- Check running jobs
SELECT * FROM scraper_jobs WHERE status = 'working';
```

## Troubleshooting

### "FATAL: password authentication failed"
- Make sure you're using the correct password
- Check `pg_hba.conf` for authentication settings

### "database does not exist"
- Create the database first: `CREATE DATABASE outreach_crm;`

### "relation does not exist"
- Run the schema file: `psql -U postgres -d outreach_crm -f server/db/schema.sql`

### Reset Database (CAUTION: Deletes all data)
```sql
DROP DATABASE IF EXISTS outreach_crm;
CREATE DATABASE outreach_crm;
-- Then run schema.sql again
```
