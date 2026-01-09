import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import pg from 'pg';
import { ScraperEngine } from './scraper-engine';
import { GoogleMapsScraper } from './scrapers/google-maps';
import { LinkedInScraper } from './scrapers/linkedin';

// Load environment variables
dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'outreach_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Track if we've logged the first connection
let hasLoggedConnection = false;
pool.on('connect', () => {
  if (!hasLoggedConnection) {
    console.log('📦 Connected to PostgreSQL database');
    hasLoggedConnection = true;
  }
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize scraper engine
const scraperEngine = new ScraperEngine(pool);

// Create scraper instances
const googleMapsScraper = new GoogleMapsScraper();
const linkedInScraper = new LinkedInScraper();

// Register scrapers
scraperEngine.registerScraper('google_maps', googleMapsScraper);
scraperEngine.registerScraper('linkedin', linkedInScraper);

// Start the scraper engine
scraperEngine.start();

// Types
interface Job {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'working' | 'ok' | 'failed';
  data: string;
  results_count: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// API Routes

// Get all jobs
app.get('/api/v1/jobs', async (req, res) => {
  try {
    const type = req.query.type as string | undefined;
    let result;
    
    if (type) {
      result = await pool.query(
        'SELECT * FROM scraper_jobs WHERE type = $1 ORDER BY created_at DESC',
        [type]
      );
    } else {
      result = await pool.query('SELECT * FROM scraper_jobs ORDER BY created_at DESC');
    }
    
    res.json(result.rows.map(formatJob));
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Get single job
app.get('/api/v1/jobs/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM scraper_jobs WHERE id = $1', [req.params.id]);
    const job = result.rows[0];
    
    if (!job) {
      return res.status(404).json({ code: 404, message: 'Job not found' });
    }
    
    res.json(formatJob(job));
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Create new job
app.post('/api/v1/jobs', async (req, res) => {
  try {
    const { name, type, ...jobData } = req.body;
    
    if (!name || !type) {
      return res.status(422).json({ code: 422, message: 'Name and type are required' });
    }

    // Validate scraper type exists
    if (!scraperEngine.hasScraperType(type)) {
      return res.status(422).json({ code: 422, message: `Unknown scraper type: ${type}` });
    }
    
    const id = uuidv4();
    await pool.query(
      `INSERT INTO scraper_jobs (id, name, type, status, data)
       VALUES ($1, $2, $3, 'pending', $4)`,
      [id, name, type, jobData]
    );
    
    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Delete job
app.delete('/api/v1/jobs/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM scraper_jobs WHERE id = $1', [req.params.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ code: 404, message: 'Job not found' });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Get job results
app.get('/api/v1/jobs/:id/results', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM scraper_results WHERE job_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    
    res.json(result.rows.map((r: { id: string; job_id: string; data: Record<string, unknown>; created_at: string }) => ({
      id: r.id,
      job_id: r.job_id,
      data: r.data, // JSONB is automatically parsed
      created_at: r.created_at,
    })));
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Download job results as CSV
app.get('/api/v1/jobs/:id/download', async (req, res) => {
  try {
    const jobResult = await pool.query('SELECT * FROM scraper_jobs WHERE id = $1', [req.params.id]);
    const job = jobResult.rows[0];
    
    if (!job) {
      return res.status(404).json({ code: 404, message: 'Job not found' });
    }
    
    const resultsResult = await pool.query(
      'SELECT data FROM scraper_results WHERE job_id = $1',
      [req.params.id]
    );
    
    if (resultsResult.rows.length === 0) {
      return res.status(404).json({ code: 404, message: 'No results found' });
    }
    
    // Data is already parsed from JSONB
    const parsedResults = resultsResult.rows.map(r => r.data);
    
    // Get all unique keys for CSV headers
    const allKeys = new Set<string>();
    parsedResults.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
    const headers = Array.from(allKeys);
    
    // Create CSV content
    const csvRows = [headers.join(',')];
    parsedResults.forEach(r => {
      const row = headers.map(h => {
        const value = r[h];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(row.join(','));
    });
    
    const csv = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${job.name.replace(/[^a-z0-9]/gi, '_')}_results.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Import job results to leads
app.post('/api/v1/jobs/:id/import', async (req, res) => {
  try {
    const jobResult = await pool.query('SELECT * FROM scraper_jobs WHERE id = $1', [req.params.id]);
    const job = jobResult.rows[0];
    
    if (!job) {
      return res.status(404).json({ code: 404, message: 'Job not found' });
    }
    
    const resultsResult = await pool.query(
      'SELECT data FROM scraper_results WHERE job_id = $1',
      [req.params.id]
    );
    
    if (resultsResult.rows.length === 0) {
      return res.status(404).json({ code: 404, message: 'No results found' });
    }
    
    let imported = 0;
    
    for (const row of resultsResult.rows) {
      const data = row.data;
      
      // Check if lead already exists by email or phone or google_maps_url
      const existsResult = await pool.query(
        `SELECT id FROM leads WHERE google_maps_url = $1 OR (phone = $2 AND phone != '')`,
        [data.google_maps_url || '', data.phone || '']
      );
      
      if (existsResult.rows.length === 0) {
        await pool.query(`
          INSERT INTO leads (
            first_name, company, email, phone, website, address,
            status, source, source_details, latitude, longitude,
            place_id, google_maps_url, rating, review_count, categories
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          '', // first_name
          data.title || '', // company
          data.emails?.[0] || '', // email
          data.phone || '',
          data.website || '',
          data.address || '',
          'new', // status
          'google_maps', // source
          req.params.id, // source_details (job_id)
          data.latitude || 0,
          data.longitude || 0,
          data.place_id || '',
          data.google_maps_url || '',
          data.rating || 0,
          data.review_count || 0,
          data.category ? [data.category] : [],
        ]);
        imported++;
      }
    }
    
    res.json({ imported, total: resultsResult.rows.length });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// ============================================
// LEADS API
// ============================================

// Get all leads
app.get('/api/v1/leads', async (req, res) => {
  try {
    const { status, source, search, limit = '100', offset = '0' } = req.query;
    
    let query = 'SELECT * FROM leads';
    const params: (string | number)[] = [];
    const conditions: string[] = [];
    
    if (status) {
      params.push(status as string);
      conditions.push(`status = $${params.length}::lead_status`);
    }
    
    if (source) {
      params.push(source as string);
      conditions.push(`source = $${params.length}::lead_source`);
    }
    
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(company ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    params.push(parseInt(limit as string));
    query += ` LIMIT $${params.length}`;
    
    params.push(parseInt(offset as string));
    query += ` OFFSET $${params.length}`;
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM leads';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await pool.query(countQuery, params.slice(0, conditions.length));
    
    res.json({
      leads: result.rows.map(formatLead),
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Get lead stats - MUST be before /:id route
app.get('/api/v1/leads/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'new') as new,
        COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
        COUNT(*) FILTER (WHERE status = 'replied') as replied,
        COUNT(*) FILTER (WHERE status = 'qualified') as qualified,
        COUNT(*) FILTER (WHERE status = 'closed') as closed,
        COUNT(*) FILTER (WHERE status = 'lost') as lost,
        COUNT(*) FILTER (WHERE source = 'google_maps') as from_google_maps,
        COUNT(*) FILTER (WHERE source = 'linkedin') as from_linkedin,
        COUNT(*) FILTER (WHERE source = 'csv') as from_csv
      FROM leads
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Get single lead
app.get('/api/v1/leads/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: 'Lead not found' });
    }
    res.json(formatLead(result.rows[0]));
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Update lead
app.patch('/api/v1/leads/:id', async (req, res) => {
  try {
    const { status, tags, notes, ...updates } = req.body;
    
    const fields: string[] = [];
    const values: (string | number | string[])[] = [];
    let paramIndex = 1;
    
    if (status) {
      fields.push(`status = $${paramIndex}::lead_status`);
      values.push(status);
      paramIndex++;
    }
    
    if (tags) {
      fields.push(`tags = $${paramIndex}`);
      values.push(tags);
      paramIndex++;
    }
    
    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'company', 'job_title', 'website', 'address'];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value as string);
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ code: 400, message: 'No valid fields to update' });
    }
    
    fields.push(`updated_at = NOW()`);
    values.push(req.params.id);
    
    const query = `UPDATE leads SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: 'Lead not found' });
    }
    
    res.json(formatLead(result.rows[0]));
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Delete lead
app.delete('/api/v1/leads/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ code: 404, message: 'Lead not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Bulk delete leads
app.post('/api/v1/leads/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: 'No lead IDs provided' });
    }
    
    const result = await pool.query(
      'DELETE FROM leads WHERE id = ANY($1::uuid[])',
      [ids]
    );
    
    res.json({ deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Bulk update lead status
app.post('/api/v1/leads/bulk-status', async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: 'No lead IDs provided' });
    }
    
    const result = await pool.query(
      'UPDATE leads SET status = $1::lead_status, updated_at = NOW() WHERE id = ANY($2::uuid[])',
      [status, ids]
    );
    
    res.json({ updated: result.rowCount });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Get available scraper types
app.get('/api/v1/scrapers', (req, res) => {
  res.json(scraperEngine.getScraperTypes());
});

// ============================================
// LINKEDIN INTEGRATION API
// ============================================

// Get LinkedIn session status
app.get('/api/v1/integrations/linkedin/session', (req, res) => {
  const sessionInfo = linkedInScraper.getSessionInfo();
  res.json({
    connected: sessionInfo.exists,
    lastUpdated: sessionInfo.lastUpdated,
  });
});

// Login to LinkedIn and save session
app.post('/api/v1/integrations/linkedin/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email and password are required' 
    });
  }
  
  const progressMessages: string[] = [];
  const result = await linkedInScraper.loginAndSaveSession(
    email, 
    password,
    (message) => progressMessages.push(message)
  );
  
  res.json({
    success: result.success,
    error: result.error,
    messages: progressMessages,
  });
});

// Logout from LinkedIn (delete session)
app.post('/api/v1/integrations/linkedin/logout', (req, res) => {
  const success = linkedInScraper.deleteSession();
  res.json({ success });
});

// ============================================
// NOTES API
// ============================================

// Get notes for a lead
app.get('/api/v1/leads/:id/notes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM lead_notes WHERE lead_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows.map(note => ({
      id: note.id,
      content: note.content,
      createdBy: note.created_by || 'User',
      createdAt: note.created_at,
    })));
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Add note to lead
app.post('/api/v1/leads/:id/notes', async (req, res) => {
  try {
    const { content, createdBy = 'User' } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ code: 400, message: 'Note content is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO lead_notes (lead_id, content, created_by) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, content.trim(), createdBy]
    );
    
    res.json({
      id: result.rows[0].id,
      content: result.rows[0].content,
      createdBy: result.rows[0].created_by,
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Delete note
app.delete('/api/v1/leads/:leadId/notes/:noteId', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM lead_notes WHERE id = $1 AND lead_id = $2',
      [req.params.noteId, req.params.leadId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ code: 404, message: 'Note not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// ============================================
// TAGS API
// ============================================

// Get all unique tags
app.get('/api/v1/tags', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT unnest(tags) as tag FROM leads WHERE tags IS NOT NULL ORDER BY tag'
    );
    res.json(result.rows.map(r => r.tag));
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Add tags to lead
app.post('/api/v1/leads/:id/tags', async (req, res) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      return res.status(400).json({ code: 400, message: 'Tags must be an array' });
    }
    
    // Get current tags and merge
    const current = await pool.query('SELECT tags FROM leads WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ code: 404, message: 'Lead not found' });
    }
    
    const currentTags = current.rows[0].tags || [];
    const newTags = [...new Set([...currentTags, ...tags])];
    
    const result = await pool.query(
      'UPDATE leads SET tags = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newTags, req.params.id]
    );
    
    res.json(formatLead(result.rows[0]));
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Remove tag from lead
app.delete('/api/v1/leads/:id/tags/:tag', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE leads SET tags = array_remove(tags, $1), updated_at = NOW() WHERE id = $2 RETURNING *',
      [req.params.tag, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 404, message: 'Lead not found' });
    }
    
    res.json(formatLead(result.rows[0]));
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// ============================================
// LOCATION SUGGESTIONS API
// ============================================

// Common cities for autocomplete
const popularLocations = [
  'New York, USA', 'Los Angeles, USA', 'San Francisco, USA', 'Chicago, USA', 
  'Boston, USA', 'Seattle, USA', 'Austin, USA', 'Denver, USA', 'Miami, USA',
  'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Edinburgh, UK',
  'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada',
  'Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia',
  'Berlin, Germany', 'Munich, Germany', 'Frankfurt, Germany',
  'Paris, France', 'Lyon, France', 'Marseille, France',
  'Amsterdam, Netherlands', 'Dublin, Ireland', 'Singapore',
  'Hong Kong', 'Tokyo, Japan', 'Bangalore, India', 'Mumbai, India',
  'Dubai, UAE', 'Tel Aviv, Israel', 'Stockholm, Sweden', 'Zurich, Switzerland'
];

app.get('/api/v1/locations/suggest', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase();
  if (!query || query.length < 2) {
    return res.json(popularLocations.slice(0, 10));
  }
  
  const matches = popularLocations.filter(loc => 
    loc.toLowerCase().includes(query)
  ).slice(0, 10);
  
  res.json(matches);
});

// ============================================
// KEYWORD SUGGESTIONS API
// ============================================

// Common job titles and keywords for autocomplete
const popularKeywords = [
  'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'VP', 'Director', 'Manager',
  'Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer',
  'Marketing Manager', 'Sales Manager', 'Account Executive', 'Business Development',
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'DevOps Engineer',
  'HR Manager', 'Recruiter', 'Financial Analyst', 'Consultant',
  'Founder', 'Co-Founder', 'Entrepreneur', 'Investor',
  'Healthcare', 'Fintech', 'SaaS', 'E-commerce', 'AI', 'Machine Learning',
  'Blockchain', 'Cybersecurity', 'Cloud Computing', 'Real Estate'
];

app.get('/api/v1/keywords/suggest', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase();
  if (!query || query.length < 2) {
    return res.json(popularKeywords.slice(0, 10));
  }
  
  const matches = popularKeywords.filter(kw => 
    kw.toLowerCase().includes(query)
  ).slice(0, 10);
  
  res.json(matches);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', scrapers: scraperEngine.getScraperTypes() });
});

// Helper function to format job for response
function formatJob(job: Job) {
  return {
    ID: job.id,
    Name: job.name,
    Type: job.type,
    Status: job.status,
    Data: job.data, // Already parsed from JSONB
    ResultsCount: job.results_count,
    Error: job.error,
    Date: job.created_at,
    UpdatedAt: job.updated_at,
    CompletedAt: job.completed_at,
  };
}

// Helper function to format lead for response
function formatLead(lead: {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: string;
  source: string;
  source_details: string;
  tags: string[];
  custom_fields: Record<string, unknown>;
  latitude: number;
  longitude: number;
  place_id: string;
  google_maps_url: string;
  linkedin_url: string;
  rating: number;
  review_count: number;
  categories: string[];
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
}) {
  return {
    id: lead.id,
    firstName: lead.first_name || '',
    lastName: lead.last_name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    company: lead.company || '',
    jobTitle: lead.job_title || '',
    website: lead.website || '',
    address: lead.address || '',
    city: lead.city || '',
    state: lead.state || '',
    country: lead.country || '',
    status: lead.status,
    source: lead.source,
    sourceDetails: lead.source_details || '',
    tags: lead.tags || [],
    customFields: lead.custom_fields || {},
    latitude: lead.latitude,
    longitude: lead.longitude,
    placeId: lead.place_id || '',
    googleMapsUrl: lead.google_maps_url || '',
    linkedinUrl: lead.linkedin_url || '',
    rating: lead.rating,
    reviewCount: lead.review_count,
    categories: lead.categories || [],
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
    lastContactedAt: lead.last_contacted_at,
  };
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  scraperEngine.stop();
  await pool.end();
  console.log('📦 PostgreSQL pool closed');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Scraper API server running on http://localhost:${PORT}`);
  console.log(`📊 Available scrapers: ${scraperEngine.getScraperTypes().join(', ')}`);
});

export default app;