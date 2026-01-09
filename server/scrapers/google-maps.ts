import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BaseScraper } from '../scraper-engine';

// ============================================
// TYPES
// ============================================

interface GoogleMapsJobData {
  businessTypes: string[];
  location: string;
  maxResults?: number;
  extractEmail?: boolean;
  lang?: string;
}

interface PlaceResult {
  input_id: string;
  title: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  review_count: number;
  latitude: number;
  longitude: number;
  place_id: string;
  google_maps_url: string;
  emails: string[];
}

// ============================================
// FAST GOOGLE MAPS SCRAPER
// Uses data extraction from search results without visiting each place
// ============================================

export class GoogleMapsScraper implements BaseScraper {
  name = 'Google Maps Scraper';
  description = 'Fast business data extraction from Google Maps';
  
  private browser: Browser | null = null;
  private shouldStop: boolean = false;

  validateJobData(data: GoogleMapsJobData): { valid: boolean; error?: string } {
    if (!data.businessTypes || !Array.isArray(data.businessTypes) || data.businessTypes.length === 0) {
      return { valid: false, error: 'At least one business type is required' };
    }
    if (!data.location || data.location.trim() === '') {
      return { valid: false, error: 'Location is required' };
    }
    return { valid: true };
  }

  async execute(
    jobId: string,
    data: GoogleMapsJobData,
    onResult: (result: PlaceResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    this.shouldStop = false;
    
    const lang = data.lang || 'en';
    const maxResults = data.maxResults || 20;
    const location = data.location.trim();
    
    onProgress(`Starting scrape for ${data.businessTypes.length} business type(s) in "${location}"`);
    
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
      
      const context = await this.browser.newContext({
        locale: lang,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });
      
      let totalResults = 0;
      
      for (const businessType of data.businessTypes) {
        if (this.shouldStop) break;
        
        const searchQuery = `${businessType} in ${location}`;
        onProgress(`Searching: "${searchQuery}"`);
        
        try {
          const results = await this.fastScrape(context, searchQuery, lang, maxResults, data.extractEmail || false, onProgress);
          
          for (const result of results) {
            result.input_id = jobId;
            onResult(result);
            totalResults++;
            onProgress(`✓ ${result.title} (${totalResults}/${maxResults})`);
          }
          
        } catch (err) {
          onProgress(`Error: ${(err as Error).message}`);
        }
      }
      
      onProgress(`✅ Completed! Total: ${totalResults} results`);
      
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  stop(): void {
    this.shouldStop = true;
    if (this.browser) {
      this.browser.close().catch(() => {});
    }
  }

  // ============================================
  // FAST SCRAPE - Extract data directly from search results
  // ============================================

  private async fastScrape(
    context: BrowserContext,
    query: string,
    lang: string,
    maxResults: number,
    extractEmail: boolean,
    onProgress: (message: string) => void
  ): Promise<PlaceResult[]> {
    const page = await context.newPage();
    const results: PlaceResult[] = [];
    
    try {
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=${lang}`;
      
      onProgress('Loading search results...');
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      // Accept cookies if present
      await this.acceptCookies(page);
      
      // Scroll to load results
      onProgress('Loading more results...');
      await this.scrollResults(page, maxResults, onProgress);
      
      // Extract all data at once using JavaScript
      onProgress('Extracting data...');
      const places = await this.extractAllPlaces(page);
      
      onProgress(`Found ${places.length} places, getting details...`);
      
      // Process results up to maxResults - click each to get full details
      for (let i = 0; i < Math.min(places.length, maxResults); i++) {
        if (this.shouldStop) break;
        
        const place = places[i];
        
        // Try to get more details by clicking on the place
        try {
          const details = await this.getPlaceDetails(page, i);
          if (details.phone) place.phone = details.phone;
          if (details.website) place.website = details.website;
          if (details.address) place.address = details.address;
        } catch (e) {
          // Continue with what we have
        }
        
        // Extract emails from website if requested
        if (extractEmail && place.website && this.isValidWebsite(place.website)) {
          place.emails = await this.extractEmails(context, place.website);
        }
        
        onProgress(`Processed ${i + 1}/${Math.min(places.length, maxResults)}: ${place.title}`);
        results.push(place);
      }
      
    } finally {
      await page.close();
    }
    
    return results;
  }

  private async acceptCookies(page: Page): Promise<void> {
    try {
      const acceptBtn = page.locator('button:has-text("Accept all")').first();
      if (await acceptBtn.isVisible({ timeout: 2000 })) {
        await acceptBtn.click();
        await page.waitForTimeout(500);
      }
    } catch { /* no dialog */ }
  }

  private async scrollResults(page: Page, target: number, onProgress: (msg: string) => void): Promise<void> {
    let count = 0;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (count < target && attempts < maxAttempts) {
      // Get current count
      count = await page.locator('div[role="feed"] > div > div').count();
      
      if (count >= target) break;
      
      // Scroll
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollBy(0, 1000);
      });
      
      await page.waitForTimeout(500);
      attempts++;
    }
    
    onProgress(`Loaded ${count} results`);
  }

  // ============================================
  // GET PLACE DETAILS - Click on place to get phone/website
  // ============================================
  
  private async getPlaceDetails(page: Page, index: number): Promise<{ phone: string; website: string; address: string }> {
    const result = { phone: '', website: '', address: '' };
    
    try {
      // Click on the place in the list
      const placeLinks = page.locator('a[href*="/maps/place/"]');
      const count = await placeLinks.count();
      
      if (index >= count) return result;
      
      await placeLinks.nth(index).click();
      
      // Wait for the side panel to load
      await page.waitForTimeout(1500);
      
      // Extract phone number - look for phone icon/link
      try {
        // Phone is usually in a button with data-item-id starting with "phone:"
        const phoneBtn = page.locator('button[data-item-id^="phone:"]');
        if (await phoneBtn.count() > 0) {
          const phoneId = await phoneBtn.first().getAttribute('data-item-id');
          if (phoneId) {
            result.phone = phoneId.replace('phone:tel:', '').replace('phone:', '');
          }
        }
        
        // Fallback: look for phone pattern in aria-labels
        if (!result.phone) {
          const phoneLink = page.locator('a[href^="tel:"]');
          if (await phoneLink.count() > 0) {
            const href = await phoneLink.first().getAttribute('href');
            if (href) {
              result.phone = href.replace('tel:', '');
            }
          }
        }
      } catch { /* no phone */ }
      
      // Extract website
      try {
        const websiteBtn = page.locator('a[data-item-id="authority"]');
        if (await websiteBtn.count() > 0) {
          result.website = await websiteBtn.first().getAttribute('href') || '';
        }
      } catch { /* no website */ }
      
      // Extract full address
      try {
        const addressBtn = page.locator('button[data-item-id="address"]');
        if (await addressBtn.count() > 0) {
          result.address = await addressBtn.first().getAttribute('aria-label') || '';
          // Clean up the address (remove "Address: " prefix if present)
          result.address = result.address.replace(/^Address:\s*/i, '');
        }
      } catch { /* no address */ }
      
      // Go back to list view
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      
    } catch (e) {
      // Try to go back to list
      try {
        await page.keyboard.press('Escape');
      } catch { /* ignore */ }
    }
    
    return result;
  }

  // ============================================
  // FAST DATA EXTRACTION - Get all places at once
  // ============================================

  private async extractAllPlaces(page: Page): Promise<PlaceResult[]> {
    // Use page.evaluate to extract all data in one call - FAST!
    return await page.evaluate(() => {
      const results: Array<{
        input_id: string;
        title: string;
        category: string;
        address: string;
        phone: string;
        website: string;
        rating: number;
        review_count: number;
        latitude: number;
        longitude: number;
        place_id: string;
        google_maps_url: string;
        emails: string[];
      }> = [];
      
      // Find all place links
      const placeLinks = document.querySelectorAll('a[href*="/maps/place/"]');
      
      placeLinks.forEach((link) => {
        try {
          const container = link.closest('div[role="feed"] > div > div');
          if (!container) return;
          
          const href = link.getAttribute('href') || '';
          
          // Extract title from aria-label first (most reliable)
          let title = '';
          const ariaLabel = link.getAttribute('aria-label') || '';
          if (ariaLabel && ariaLabel !== 'Results') {
            title = ariaLabel;
          }
          
          // If no aria-label, try the fontHeadlineSmall element
          if (!title) {
            const titleEl = container.querySelector('div.fontHeadlineSmall');
            const elText = titleEl?.textContent?.trim() || '';
            if (elText && elText !== 'Results') {
              title = elText;
            }
          }
          
          // If still no title, extract from URL
          if (!title) {
            const urlTitleMatch = href.match(/\/maps\/place\/([^/@]+)/);
            if (urlTitleMatch) {
              title = decodeURIComponent(urlTitleMatch[1].replace(/\+/g, ' '));
            }
          }
          
          if (!title || title === 'Results') return;
          
          // Extract rating
          let rating = 0;
          let reviewCount = 0;
          const ratingEl = container.querySelector('span[role="img"]');
          if (ratingEl) {
            const label = ratingEl.getAttribute('aria-label') || '';
            const ratingMatch = label.match(/([\d.]+)/);
            if (ratingMatch) rating = parseFloat(ratingMatch[1]);
          }
          
          // Extract review count
          const reviewText = container.textContent || '';
          const reviewMatch = reviewText.match(/\(([\d,]+)\)/);
          if (reviewMatch) {
            reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
          }
          
          // Extract category and address
          let category = '';
          let address = '';
          
          // Try to find category in the container
          const categoryEl = container.querySelector('button[jsaction*="category"]');
          if (categoryEl) {
            category = categoryEl.textContent?.trim() || '';
          }
          
          // Get all text spans for address
          const spans = container.querySelectorAll('span');
          spans.forEach((span) => {
            const text = span.textContent || '';
            // Address usually contains street/city patterns
            if (text.includes(',') && !text.includes('Open') && !text.includes('Closed') && !address) {
              address = text.trim();
            }
          });
          
          // Extract coordinates from URL
          let latitude = 0;
          let longitude = 0;
          const coordMatch = href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (coordMatch) {
            latitude = parseFloat(coordMatch[1]);
            longitude = parseFloat(coordMatch[2]);
          }
          
          // Extract place ID
          let placeId = '';
          const placeIdMatch = href.match(/place\/[^/]+\/([^/?]+)/);
          if (placeIdMatch) {
            placeId = placeIdMatch[1];
          }
          
          // Extract website (look for website link)
          let website = '';
          const websiteLinks = container.querySelectorAll('a[href]');
          websiteLinks.forEach((a) => {
            const h = a.getAttribute('href') || '';
            if (h.startsWith('http') && !h.includes('google.com') && !h.includes('maps')) {
              website = h;
            }
          });
          
          // Extract phone if visible
          let phone = '';
          const phoneMatch = (container.textContent || '').match(/(\+\d[\d\s().-]{8,}|\(\d{3}\)\s?\d{3}[.-]?\d{4})/);
          if (phoneMatch) {
            phone = phoneMatch[1].trim();
          }
          
          // Only add if we haven't seen this place
          if (!results.some(r => r.title === title && r.address === address)) {
            results.push({
              input_id: '',
              title,
              category,
              address,
              phone,
              website,
              rating,
              review_count: reviewCount,
              latitude,
              longitude,
              place_id: placeId,
              google_maps_url: href,
              emails: [],
            });
          }
        } catch { /* skip this place */ }
      });
      
      return results;
    });
  }

  private isValidWebsite(website: string): boolean {
    const skip = ['facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'youtube.com'];
    return !skip.some(s => website.toLowerCase().includes(s));
  }

  private async extractEmails(context: BrowserContext, websiteUrl: string): Promise<string[]> {
    const emails: string[] = [];
    const page = await context.newPage();
    
    try {
      await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
      
      const content = await page.content();
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = content.match(emailRegex) || [];
      
      const invalid = ['example.com', 'domain.com', 'wixpress', 'sentry', '.png', '.jpg', 'email@'];
      
      for (const email of matches) {
        const lower = email.toLowerCase();
        if (!invalid.some(p => lower.includes(p)) && !emails.includes(lower)) {
          emails.push(lower);
        }
      }
    } catch { /* ignore */ }
    finally {
      await page.close();
    }
    
    return emails.slice(0, 5);
  }
}
