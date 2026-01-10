import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import csvParser from 'csv-parser';
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

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
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

// ============================================
// CSV IMPORT API
// ============================================

// Preview CSV columns for mapping
app.post('/api/v1/csv/preview', upload.single('file'), async (req, res) => {
  console.log('📥 CSV Preview request received');
  try {
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ code: 400, message: 'No file uploaded' });
    }
    
    console.log('📄 File received:', req.file.originalname);
    const filePath = req.file.path;
    const columns: string[] = [];
    const preview: Record<string, unknown>[] = [];
    let rowCount = 0;
    
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('headers', (headers: string[]) => {
          columns.push(...headers);
        })
        .on('data', (row: Record<string, unknown>) => {
          if (rowCount < 5) {
            preview.push(row);
            rowCount++;
          }
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
    
    res.json({
      success: true,
      filename: req.file.originalname,
      filePath: req.file.filename,
      columns,
      preview,
      totalPreview: rowCount
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Import CSV with field mapping
app.post('/api/v1/csv/import', async (req, res) => {
  try {
    const { filePath, mapping, tags } = req.body;
    
    if (!filePath || !mapping || !mapping.email) {
      return res.status(400).json({ 
        code: 400, 
        message: 'File path and email column mapping are required' 
      });
    }
    
    const fullPath = path.join(uploadsDir, filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ code: 404, message: 'File not found' });
    }
    
    const rows: Record<string, string>[] = [];
    
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(fullPath)
        .pipe(csvParser())
        .on('data', (row: Record<string, string>) => rows.push(row))
        .on('end', () => resolve())
        .on('error', reject);
    });
    
    let imported = 0;
    let skipped = 0;
    
    for (const row of rows) {
      const email = row[mapping.email]?.trim();
      if (!email || !email.includes('@')) {
        skipped++;
        continue;
      }
      
      // Check if lead already exists
      const existing = await pool.query(
        'SELECT id FROM leads WHERE email = $1',
        [email]
      );
      
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }
      
      // Build lead data from mapping
      const firstName = mapping.firstName ? row[mapping.firstName]?.trim() || '' : '';
      const lastName = mapping.lastName ? row[mapping.lastName]?.trim() || '' : '';
      const company = mapping.company ? row[mapping.company]?.trim() || '' : '';
      const phone = mapping.phone ? row[mapping.phone]?.trim() || '' : '';
      const website = mapping.website ? row[mapping.website]?.trim() || '' : '';
      const jobTitle = mapping.jobTitle ? row[mapping.jobTitle]?.trim() || '' : '';
      
      // Collect custom fields (any mapping that's not a standard field)
      const standardFields = ['email', 'firstName', 'lastName', 'company', 'phone', 'website', 'jobTitle'];
      const customFields: Record<string, string> = {};
      for (const [field, column] of Object.entries(mapping)) {
        if (!standardFields.includes(field) && column && row[column as string]) {
          customFields[field] = row[column as string];
        }
      }
      
      await pool.query(`
        INSERT INTO leads (
          first_name, last_name, email, phone, company, job_title, website,
          status, source, tags, custom_fields
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', 'csv', $8, $9)
      `, [
        firstName, lastName, email, phone, company, jobTitle, website,
        tags || [], JSON.stringify(customFields)
      ]);
      
      imported++;
    }
    
    // Clean up uploaded file
    fs.unlinkSync(fullPath);
    
    res.json({
      success: true,
      imported,
      skipped,
      total: rows.length,
      message: `Imported ${imported} leads. Skipped ${skipped} duplicates.`
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// ============================================
// EMAIL CREDENTIALS API
// ============================================

// Get all email credentials
app.get('/api/v1/email-credentials', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, smtp_server, smtp_port, is_default, created_at FROM email_credentials ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Add email credentials
app.post('/api/v1/email-credentials', async (req, res) => {
  try {
    const { email, password, smtpServer, smtpPort, isDefault } = req.body;
    
    if (!email || !password || !smtpServer || !smtpPort) {
      return res.status(400).json({ code: 400, message: 'All fields are required' });
    }
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await pool.query('UPDATE email_credentials SET is_default = false');
    }
    
    const id = uuidv4();
    await pool.query(`
      INSERT INTO email_credentials (id, email, password, smtp_server, smtp_port, is_default)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, email, password, smtpServer, smtpPort, isDefault || false]);
    
    res.status(201).json({ success: true, id });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Delete email credentials
app.delete('/api/v1/email-credentials/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM email_credentials WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ code: 404, message: 'Credentials not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Set default email credentials
app.post('/api/v1/email-credentials/:id/set-default', async (req, res) => {
  try {
    await pool.query('UPDATE email_credentials SET is_default = false');
    const result = await pool.query(
      'UPDATE email_credentials SET is_default = true WHERE id = $1',
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ code: 404, message: 'Credentials not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// ============================================
// EMAIL TEMPLATES API
// ============================================

// Get all email templates (from outreach_templates where channel = 'email')
app.get('/api/v1/email-templates', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM outreach_templates WHERE channel = 'email' ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Create email template
app.post('/api/v1/email-templates', async (req, res) => {
  try {
    const { name, subject, content, variables } = req.body;
    
    if (!name || !subject || !content) {
      return res.status(400).json({ code: 400, message: 'Name, subject, and content are required' });
    }
    
    const id = uuidv4();
    await pool.query(`
      INSERT INTO outreach_templates (id, name, channel, subject, content, variables)
      VALUES ($1, $2, 'email', $3, $4, $5)
    `, [id, name, subject, content, variables || []]);
    
    res.status(201).json({ success: true, id });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Update email template
app.patch('/api/v1/email-templates/:id', async (req, res) => {
  try {
    const { name, subject, content, variables } = req.body;
    
    const result = await pool.query(`
      UPDATE outreach_templates 
      SET name = COALESCE($1, name),
          subject = COALESCE($2, subject),
          content = COALESCE($3, content),
          variables = COALESCE($4, variables),
          updated_at = NOW()
      WHERE id = $5 AND channel = 'email'
    `, [name, subject, content, variables, req.params.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ code: 404, message: 'Template not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Delete email template
app.delete('/api/v1/email-templates/:id', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM outreach_templates WHERE id = $1 AND channel = 'email'`, [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ code: 404, message: 'Template not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// ============================================
// EMAIL OUTREACH API
// ============================================

// Get email outreach records
app.get('/api/v1/email-outreach', async (req, res) => {
  try {
    const { status, limit = '100', offset = '0' } = req.query;
    
    let query = 'SELECT * FROM email_outreach';
    const params: (string | number)[] = [];
    
    if (status) {
      params.push(status as string);
      query += ` WHERE status = $${params.length}`;
    }
    
    query += ' ORDER BY created_at DESC';
    params.push(parseInt(limit as string));
    query += ` LIMIT $${params.length}`;
    params.push(parseInt(offset as string));
    query += ` OFFSET $${params.length}`;
    
    const result = await pool.query(query, params);
    
    // Get stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM email_outreach
    `);
    
    res.json({
      emails: result.rows,
      stats: stats.rows[0]
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Create email outreach record
app.post('/api/v1/email-outreach', async (req, res) => {
  try {
    const { email, leadId, subject, message, customFields } = req.body;
    
    if (!email) {
      return res.status(400).json({ code: 400, message: 'Email is required' });
    }
    
    const id = uuidv4();
    await pool.query(`
      INSERT INTO email_outreach (id, email, lead_id, subject, message, custom_fields, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    `, [id, email, leadId || null, subject || '', message || '', JSON.stringify(customFields || {})]);
    
    res.status(201).json({ success: true, id });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Bulk create from leads
app.post('/api/v1/email-outreach/from-leads', async (req, res) => {
  try {
    const { leadIds, subject, message, templateId } = req.body;
    
    if (!leadIds || leadIds.length === 0) {
      return res.status(400).json({ code: 400, message: 'Lead IDs are required' });
    }
    
    // Get template if provided
    let templateSubject = subject || '';
    let templateMessage = message || '';
    
    if (templateId) {
      const templateResult = await pool.query(
        'SELECT subject, content FROM email_templates WHERE id = $1',
        [templateId]
      );
      if (templateResult.rows.length > 0) {
        templateSubject = templateResult.rows[0].subject;
        templateMessage = templateResult.rows[0].content;
      }
    }
    
    // Get leads
    const leadsResult = await pool.query(
      'SELECT id, email, first_name, last_name, company FROM leads WHERE id = ANY($1) AND email IS NOT NULL AND email != \'\'',
      [leadIds]
    );
    
    let created = 0;
    let skipped = 0;
    
    for (const lead of leadsResult.rows) {
      // Check if already exists
      const existing = await pool.query(
        'SELECT id FROM email_outreach WHERE lead_id = $1 AND status = \'pending\'',
        [lead.id]
      );
      
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }
      
      // Process template variables
      const processedSubject = templateSubject
        .replace(/\(firstName\)/gi, lead.first_name || '')
        .replace(/\(lastName\)/gi, lead.last_name || '')
        .replace(/\(company\)/gi, lead.company || '')
        .replace(/\(email\)/gi, lead.email || '');
      
      const processedMessage = templateMessage
        .replace(/\(firstName\)/gi, lead.first_name || '')
        .replace(/\(lastName\)/gi, lead.last_name || '')
        .replace(/\(company\)/gi, lead.company || '')
        .replace(/\(email\)/gi, lead.email || '');
      
      const id = uuidv4();
      await pool.query(`
        INSERT INTO email_outreach (id, email, lead_id, subject, message, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
      `, [id, lead.email, lead.id, processedSubject, processedMessage]);
      
      created++;
    }
    
    res.json({
      success: true,
      created,
      skipped,
      message: `Created ${created} email outreach records. Skipped ${skipped} duplicates.`
    });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Update email outreach status
app.patch('/api/v1/email-outreach/:id', async (req, res) => {
  try {
    const { subject, message, status } = req.body;
    
    const result = await pool.query(`
      UPDATE email_outreach 
      SET subject = COALESCE($1, subject),
          message = COALESCE($2, message),
          status = COALESCE($3, status),
          updated_at = NOW()
      WHERE id = $4
    `, [subject, message, status, req.params.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ code: 404, message: 'Record not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Bulk update status
app.post('/api/v1/email-outreach/bulk-status', async (req, res) => {
  try {
    const { ids, status } = req.body;
    
    if (!ids || ids.length === 0 || !status) {
      return res.status(400).json({ code: 400, message: 'IDs and status are required' });
    }
    
    const result = await pool.query(
      'UPDATE email_outreach SET status = $1, updated_at = NOW() WHERE id = ANY($2)',
      [status, ids]
    );
    
    res.json({ success: true, updated: result.rowCount });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
});

// Delete email outreach records
app.post('/api/v1/email-outreach/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || ids.length === 0) {
      return res.status(400).json({ code: 400, message: 'IDs are required' });
    }
    
    const result = await pool.query('DELETE FROM email_outreach WHERE id = ANY($1)', [ids]);
    
    res.json({ success: true, deleted: result.rowCount });
  } catch (error) {
    res.status(500).json({ code: 500, message: (error as Error).message });
  }
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

// ============ WEB FORM OUTREACH ENDPOINTS ============

// State for web form outreach
let webformOutreachRunning = false;
let webformOutreachAbort = false;

// Get web form config
app.get('/api/v1/webform-outreach/config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM webform_config ORDER BY id DESC LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No configuration found' });
    }
    const config = result.rows[0];
    res.json({
      firstName: config.first_name || '',
      lastName: config.last_name || '',
      email: config.email || '',
      phone: config.phone || '',
      company: config.company || '',
      subject: config.subject || 'Business Inquiry',
      message: config.message || '',
      delayBetweenRequests: config.delay_between_requests || 3,
    });
  } catch (error) {
    console.error('Error fetching webform config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Save web form config
app.post('/api/v1/webform-outreach/config', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, company, subject, message, delayBetweenRequests } = req.body;
    
    // Upsert config (delete old, insert new)
    await pool.query('DELETE FROM webform_config');
    const result = await pool.query(
      `INSERT INTO webform_config (first_name, last_name, email, phone, company, subject, message, delay_between_requests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [firstName, lastName, email, phone, company, subject, message, delayBetweenRequests || 3]
    );
    
    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('Error saving webform config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Get web form jobs
app.get('/api/v1/webform-outreach/jobs', async (req, res) => {
  try {
    const jobsResult = await pool.query(
      'SELECT * FROM webform_jobs ORDER BY created_at DESC LIMIT 500'
    );
    
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM webform_jobs
    `);
    
    res.json({
      jobs: jobsResult.rows,
      stats: statsResult.rows[0],
      isRunning: webformOutreachRunning,
    });
  } catch (error) {
    console.error('Error fetching webform jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Add URLs to web form jobs
app.post('/api/v1/webform-outreach/jobs', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'No URLs provided' });
    }
    
    let added = 0;
    for (const url of urls) {
      // Normalize URL
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
      
      // Skip if already exists
      const exists = await pool.query('SELECT id FROM webform_jobs WHERE url = $1', [normalizedUrl]);
      if (exists.rows.length > 0) continue;
      
      await pool.query(
        'INSERT INTO webform_jobs (url) VALUES ($1)',
        [normalizedUrl]
      );
      added++;
    }
    
    res.json({ success: true, added });
  } catch (error) {
    console.error('Error adding webform jobs:', error);
    res.status(500).json({ error: 'Failed to add URLs' });
  }
});

// Delete web form jobs
app.post('/api/v1/webform-outreach/jobs/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    
    await pool.query('DELETE FROM webform_jobs WHERE id = ANY($1::uuid[])', [ids]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting webform jobs:', error);
    res.status(500).json({ error: 'Failed to delete jobs' });
  }
});

// Start web form outreach (uses Puppeteer)
app.post('/api/v1/webform-outreach/start', async (req, res) => {
  try {
    if (webformOutreachRunning) {
      return res.status(400).json({ error: 'Outreach already running' });
    }
    
    // Get config
    const configResult = await pool.query('SELECT * FROM webform_config ORDER BY id DESC LIMIT 1');
    if (configResult.rows.length === 0) {
      return res.status(400).json({ error: 'No configuration found' });
    }
    
    const config = configResult.rows[0];
    if (!config.email) {
      return res.status(400).json({ error: 'Email is required in configuration' });
    }
    
    webformOutreachRunning = true;
    webformOutreachAbort = false;
    
    res.json({ success: true, message: 'Outreach started' });
    
    // Run outreach in background
    runWebFormOutreach(config).catch(err => {
      console.error('Webform outreach error:', err);
    }).finally(() => {
      webformOutreachRunning = false;
    });
    
  } catch (error) {
    console.error('Error starting webform outreach:', error);
    res.status(500).json({ error: 'Failed to start outreach' });
  }
});

// Stop web form outreach
app.post('/api/v1/webform-outreach/stop', async (req, res) => {
  webformOutreachAbort = true;
  res.json({ success: true, message: 'Stop signal sent' });
});

// Web form outreach worker function
async function runWebFormOutreach(config: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
  delay_between_requests: number;
}) {
  // Dynamic import for puppeteer
  const puppeteer = await import('puppeteer');
  
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    while (!webformOutreachAbort) {
      // Get next pending job
      const result = await pool.query(
        `UPDATE webform_jobs 
         SET status = 'processing', updated_at = NOW()
         WHERE id = (SELECT id FROM webform_jobs WHERE status = 'pending' LIMIT 1)
         RETURNING *`
      );
      
      if (result.rows.length === 0) {
        console.log('No more pending webform jobs');
        break;
      }
      
      const job = result.rows[0];
      console.log(`Processing webform job: ${job.url}`);
      
      try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Try to find and fill contact form
        const formResult = await findAndFillContactForm(page, job.url, config, puppeteer);
        
        if (formResult.success) {
          await pool.query(
            `UPDATE webform_jobs SET status = 'submitted', form_found = true, submitted_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [job.id]
          );
          console.log(`✅ Form submitted on: ${job.url}`);
        } else {
          await pool.query(
            `UPDATE webform_jobs SET status = 'failed', form_found = $1, error_message = $2, updated_at = NOW() WHERE id = $3`,
            [formResult.formFound, formResult.error, job.id]
          );
          console.log(`❌ Failed on ${job.url}: ${formResult.error}`);
        }
        
        await page.close();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        await pool.query(
          `UPDATE webform_jobs SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
          [errorMsg, job.id]
        );
        console.error(`Error processing ${job.url}:`, err);
      }
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, (config.delay_between_requests || 3) * 1000));
    }
  } finally {
    await browser.close();
    webformOutreachRunning = false;
  }
}

// Find and fill contact form on a page
async function findAndFillContactForm(
  page: any,
  url: string,
  config: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    subject: string;
    message: string;
  },
  puppeteer: any
): Promise<{ success: boolean; formFound: boolean; error?: string }> {
  try {
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Common contact page paths to try
    const contactPaths = ['/contact', '/contact-us', '/contactus', '/kontakt', '/get-in-touch', '/reach-us'];
    
    // First check if current page has a form
    let hasForm = await checkForContactForm(page);
    
    // If no form on homepage, try common contact page paths
    if (!hasForm) {
      for (const contactPath of contactPaths) {
        try {
          const contactUrl = new URL(contactPath, url).href;
          await page.goto(contactUrl, { waitUntil: 'networkidle2', timeout: 15000 });
          hasForm = await checkForContactForm(page);
          if (hasForm) break;
        } catch {
          // Path doesn't exist, continue
        }
      }
    }
    
    // If still no form, try to find and click contact links
    if (!hasForm) {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      const clicked = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const contactLink = links.find(link => {
          const text = link.textContent?.toLowerCase() || '';
          const href = link.href?.toLowerCase() || '';
          return text.includes('contact') || href.includes('contact');
        });
        if (contactLink) {
          contactLink.click();
          return true;
        }
        return false;
      });
      
      if (clicked) {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        hasForm = await checkForContactForm(page);
      }
    }
    
    if (!hasForm) {
      return { success: false, formFound: false, error: 'No contact form found' };
    }
    
    // Fill the form
    const fillResult = await fillContactForm(page, config);
    if (!fillResult.success) {
      return { success: false, formFound: true, error: fillResult.error };
    }
    
    // Submit the form
    const submitted = await submitForm(page);
    if (!submitted) {
      return { success: false, formFound: true, error: 'Failed to submit form' };
    }
    
    return { success: true, formFound: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Navigation error';
    return { success: false, formFound: false, error };
  }
}

// Check if page has a contact form
async function checkForContactForm(page: any): Promise<boolean> {
  return page.evaluate(() => {
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const formText = form.innerHTML.toLowerCase();
      const hasEmail = form.querySelector('input[type="email"], input[name*="email"], input[placeholder*="email"]');
      const hasMessage = form.querySelector('textarea, input[name*="message"], input[name*="comment"]');
      if (hasEmail || (hasMessage && formText.includes('contact'))) {
        return true;
      }
    }
    return false;
  });
}

// Fill contact form fields
async function fillContactForm(page: any, config: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await page.evaluate((cfg: typeof config) => {
      const findAndFill = (selectors: string[], value: string) => {
        if (!value) return;
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
              el.value = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return;
            }
          }
        }
      };
      
      // Fill email (required)
      findAndFill([
        'input[type="email"]',
        'input[name*="email"]',
        'input[id*="email"]',
        'input[placeholder*="email" i]',
      ], cfg.email);
      
      // Fill name fields
      findAndFill([
        'input[name*="first_name"]',
        'input[name*="firstname"]',
        'input[name*="fname"]',
        'input[id*="first"]',
        'input[placeholder*="first name" i]',
      ], cfg.first_name);
      
      findAndFill([
        'input[name*="last_name"]',
        'input[name*="lastname"]',
        'input[name*="lname"]',
        'input[id*="last"]',
        'input[placeholder*="last name" i]',
      ], cfg.last_name);
      
      // Full name if no first/last split
      const fullName = `${cfg.first_name} ${cfg.last_name}`.trim();
      findAndFill([
        'input[name="name"]',
        'input[name*="your_name"]',
        'input[name*="yourname"]',
        'input[id="name"]',
        'input[placeholder*="your name" i]',
        'input[placeholder*="full name" i]',
      ], fullName);
      
      // Fill phone
      findAndFill([
        'input[type="tel"]',
        'input[name*="phone"]',
        'input[name*="telephone"]',
        'input[id*="phone"]',
        'input[placeholder*="phone" i]',
      ], cfg.phone);
      
      // Fill company
      findAndFill([
        'input[name*="company"]',
        'input[name*="organization"]',
        'input[name*="business"]',
        'input[id*="company"]',
        'input[placeholder*="company" i]',
      ], cfg.company);
      
      // Fill subject
      findAndFill([
        'input[name*="subject"]',
        'input[id*="subject"]',
        'input[placeholder*="subject" i]',
      ], cfg.subject);
      
      // Fill message (required)
      const messageSelectors = [
        'textarea[name*="message"]',
        'textarea[name*="comment"]',
        'textarea[name*="inquiry"]',
        'textarea[id*="message"]',
        'textarea',
      ];
      for (const selector of messageSelectors) {
        const el = document.querySelector(selector);
        if (el instanceof HTMLTextAreaElement) {
          el.value = cfg.message;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }, config);
    
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Failed to fill form';
    return { success: false, error };
  }
}

// Submit the form
async function submitForm(page: any): Promise<boolean> {
  try {
    // Look for submit button
    const clicked = await page.evaluate(() => {
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Submit")',
        'button:contains("Send")',
        'button:contains("Contact")',
        'input[value*="Submit" i]',
        'input[value*="Send" i]',
        'button.submit',
        'button.send',
      ];
      
      for (const selector of submitSelectors) {
        try {
          const btn = document.querySelector(selector);
          if (btn instanceof HTMLElement) {
            btn.click();
            return true;
          }
        } catch {}
      }
      
      // Fallback: find any button in a form
      const forms = document.querySelectorAll('form');
      for (const form of forms) {
        const btn = form.querySelector('button, input[type="submit"]');
        if (btn instanceof HTMLElement) {
          btn.click();
          return true;
        }
      }
      
      return false;
    });
    
    if (clicked) {
      // Wait for potential navigation or form response
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  webformOutreachAbort = true;
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