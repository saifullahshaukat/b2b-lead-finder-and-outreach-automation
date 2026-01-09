import { Pool } from 'pg';

// Base interface for all scrapers
export interface BaseScraper {
  name: string;
  description: string;
  
  // Validate job data before starting
  validateJobData(data: any): { valid: boolean; error?: string };
  
  // Execute the scraping job
  execute(
    jobId: string,
    data: any,
    onResult: (result: any) => void,
    onProgress: (message: string) => void
  ): Promise<void>;
  
  // Stop the scraper if running
  stop(): void;
}

export class ScraperEngine {
  private scrapers: Map<string, BaseScraper> = new Map();
  private pool: Pool;
  private isRunning: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private currentJob: { id: string; scraper: BaseScraper } | null = null;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  registerScraper(type: string, scraper: BaseScraper): void {
    this.scrapers.set(type, scraper);
    console.log(`📝 Registered scraper: ${type} - ${scraper.name}`);
  }

  hasScraperType(type: string): boolean {
    return this.scrapers.has(type);
  }

  getScraperTypes(): string[] {
    return Array.from(this.scrapers.keys());
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Scraper engine started');
    
    // Poll for pending jobs every 2 seconds
    this.pollInterval = setInterval(() => {
      this.processNextJob();
    }, 2000);
    
    // Process immediately on start
    this.processNextJob();
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    if (this.currentJob) {
      this.currentJob.scraper.stop();
    }
    
    console.log('⏹️ Scraper engine stopped');
  }

  private async processNextJob(): Promise<void> {
    // Don't process if already working on a job
    if (this.currentJob) return;
    
    try {
      // Get next pending job
      const result = await this.pool.query(`
        SELECT * FROM scraper_jobs 
        WHERE status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 1
      `);
      
      const job = result.rows[0];
      if (!job) return;
      
      console.log(`📋 Found pending job: ${job.id} - ${job.name}`);
      
      const scraper = this.scrapers.get(job.type);
      if (!scraper) {
        await this.updateJobStatus(job.id, 'failed', `Unknown scraper type: ${job.type}`);
        return;
      }
      
      // Job data is already a JSONB object from PostgreSQL
      const jobData = job.data;
      console.log(`📋 Job data:`, JSON.stringify(jobData));
      
      // Validate job data
      const validation = scraper.validateJobData(jobData);
      if (!validation.valid) {
        console.error(`❌ Job validation failed: ${validation.error}`);
        await this.updateJobStatus(job.id, 'failed', validation.error || 'Invalid job data');
        return;
      }
      
      // Update job status to working
      await this.updateJobStatus(job.id, 'working');
      this.currentJob = { id: job.id, scraper };
      
      console.log(`🔍 Starting job: ${job.name} (${job.type})`);
      
      // Execute the scraper
      let resultsCount = 0;
      
      await scraper.execute(
        job.id,
        jobData,
        // onResult callback
        async (result) => {
          await this.saveResult(job.id, result);
          resultsCount++;
          await this.updateResultsCount(job.id, resultsCount);
        },
        // onProgress callback
        (message) => {
          console.log(`  📊 [${job.name}] ${message}`);
        }
      );
      
      // Mark job as complete
      await this.updateJobStatus(job.id, 'ok');
      console.log(`✅ Job completed: ${job.name} (${resultsCount} results)`);
      
    } catch (error) {
      console.error(`❌ Error in processNextJob:`, error);
      if (this.currentJob) {
        await this.updateJobStatus(this.currentJob.id, 'failed', (error as Error).message);
        console.error(`❌ Job failed: ${(error as Error).message}`);
      }
    } finally {
      this.currentJob = null;
    }
  }

  private async updateJobStatus(jobId: string, status: string, error?: string): Promise<void> {
    await this.pool.query(`
      UPDATE scraper_jobs 
      SET status = $1::job_status, 
          error = $2,
          updated_at = NOW(),
          completed_at = CASE WHEN $1 IN ('ok', 'failed') THEN NOW() ELSE completed_at END
      WHERE id = $3
    `, [status, error || null, jobId]);
  }

  private async updateResultsCount(jobId: string, count: number): Promise<void> {
    await this.pool.query(`
      UPDATE scraper_jobs SET results_count = $1, updated_at = NOW() WHERE id = $2
    `, [count, jobId]);
  }

  private async saveResult(jobId: string, data: any, jobData?: any): Promise<void> {
    // Save to scraper_results
    await this.pool.query(`
      INSERT INTO scraper_results (job_id, data) VALUES ($1, $2)
    `, [jobId, data]);
    
    // Auto-import to leads table (without auto-tagging - lead tags are managed separately)
    await this.importToLeads(jobId, data);
  }
  
  private async importToLeads(jobId: string, data: any): Promise<void> {
    try {
      // Detect source type and import accordingly
      if (data.profile_url) {
        // LinkedIn Person result
        await this.importLinkedInPerson(jobId, data);
      } else if (data.company_url) {
        // LinkedIn Company result
        await this.importLinkedInCompany(jobId, data);
      } else if (data.title || data.google_maps_url) {
        // Google Maps result
        await this.importGoogleMapsResult(jobId, data);
      }
    } catch (error) {
      console.error('Error auto-importing lead:', error);
      // Don't throw - we still want to save the result even if lead import fails
    }
  }
  
  private async importGoogleMapsResult(jobId: string, data: any): Promise<void> {
    // Skip if no title (business name)
    if (!data.title || data.title === 'Results') {
      return;
    }
    
    // Check if lead already exists by google_maps_url or phone
    const existsResult = await this.pool.query(
      `SELECT id FROM leads WHERE google_maps_url = $1 OR (phone = $2 AND phone != '')`,
      [data.google_maps_url || '', data.phone || '']
    );
    
    if (existsResult.rows.length === 0) {
      await this.pool.query(`
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
        jobId, // source_details
        data.latitude || 0,
        data.longitude || 0,
        data.place_id || '',
        data.google_maps_url || '',
        data.rating || 0,
        data.review_count || 0,
        data.category ? [data.category] : [],
      ]);
    }
  }
  
  private async importLinkedInPerson(jobId: string, data: any): Promise<void> {
    if (!data.name) return;
    
    // Check if already exists by profile URL
    const existsResult = await this.pool.query(
      `SELECT id FROM leads WHERE linkedin_url = $1`,
      [data.profile_url || '']
    );
    
    if (existsResult.rows.length === 0) {
      // Parse name into first/last
      const nameParts = (data.name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      await this.pool.query(`
        INSERT INTO leads (
          first_name, last_name, company, job_title, address,
          status, source, source_details, linkedin_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        firstName,
        lastName,
        data.company || '',
        data.headline || '', // job_title
        data.location || '', // address (using for location)
        'new', // status
        'linkedin', // source
        jobId, // source_details
        data.profile_url || '',
      ]);
    }
  }
  
  private async importLinkedInCompany(jobId: string, data: any): Promise<void> {
    if (!data.name) return;
    
    // Check if already exists by company URL
    const existsResult = await this.pool.query(
      `SELECT id FROM leads WHERE linkedin_url = $1`,
      [data.company_url || '']
    );
    
    if (existsResult.rows.length === 0) {
      await this.pool.query(`
        INSERT INTO leads (
          company, address, status, source, source_details, linkedin_url
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        data.name || '',
        data.location || '', // address (using for location)
        'new', // status
        'linkedin', // source
        jobId, // source_details
        data.company_url || '',
      ]);
    }
  }
}
