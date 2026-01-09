import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BaseScraper } from '../scraper-engine';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

interface LinkedInJobData {
  searchType: 'people' | 'companies';
  scrapeMode: 'google' | 'login';  // google = no login, login = requires auth
  keywords: string;
  location?: string;
  industry?: string;
  maxResults?: number;
  // LinkedIn credentials - only for login mode
  email?: string;
  password?: string;
}

interface PersonResult {
  input_id: string;
  name: string;
  headline: string;
  location: string;
  profile_url: string;
  company: string;
  connection_degree: string;
  profile_image_url: string;
  scrape_mode: string;
}

interface CompanyResult {
  input_id: string;
  name: string;
  industry: string;
  location: string;
  company_url: string;
  employee_count: string;
  description: string;
  logo_url: string;
  scrape_mode: string;
}

type LinkedInResult = PersonResult | CompanyResult;

// ============================================
// LINKEDIN SCRAPER
// Supports two modes:
// 1. Google-based (recommended) - No login required, uses Google search
// 2. Login-based - Requires LinkedIn credentials for deeper scraping
// ============================================

export class LinkedInScraper implements BaseScraper {
  name = 'LinkedIn Scraper';
  description = 'Scrape people and companies from LinkedIn';
  
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private shouldStop: boolean = false;
  private sessionPath = path.join(process.cwd(), 'linkedin-session.json');

  validateJobData(data: LinkedInJobData): { valid: boolean; error?: string } {
    if (!data.searchType || !['people', 'companies'].includes(data.searchType)) {
      return { valid: false, error: 'Search type must be "people" or "companies"' };
    }
    if (!data.keywords || data.keywords.trim() === '') {
      return { valid: false, error: 'Keywords are required' };
    }
    return { valid: true };
  }

  stop(): void {
    this.shouldStop = true;
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  // Check if we have a valid saved session
  hasSession(): boolean {
    try {
      if (!fs.existsSync(this.sessionPath)) return false;
      const stats = fs.statSync(this.sessionPath);
      // Session expires after 7 days
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return stats.mtimeMs > sevenDaysAgo;
    } catch {
      return false;
    }
  }

  // Get session info
  getSessionInfo(): { exists: boolean; lastUpdated: string | null } {
    try {
      if (!fs.existsSync(this.sessionPath)) {
        return { exists: false, lastUpdated: null };
      }
      const stats = fs.statSync(this.sessionPath);
      return { exists: true, lastUpdated: stats.mtime.toISOString() };
    } catch {
      return { exists: false, lastUpdated: null };
    }
  }

  // Delete saved session
  deleteSession(): boolean {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.unlinkSync(this.sessionPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  // Login and save session (called from integrations)
  async loginAndSaveSession(
    email: string,
    password: string,
    onProgress: (message: string) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });

      const page = await context.newPage();

      onProgress('Navigating to LinkedIn...');
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      onProgress('Entering credentials...');
      await page.fill('#username', email);
      await page.fill('#password', password);

      onProgress('Signing in...');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Check for checkpoint/verification
      if (page.url().includes('checkpoint') || page.url().includes('challenge')) {
        return { 
          success: false, 
          error: 'LinkedIn security checkpoint detected. Please try logging in manually first, then retry.' 
        };
      }

      // Verify login
      const isLoggedIn = await this.isLoggedIn(page);
      
      if (isLoggedIn) {
        await this.saveSession(context);
        onProgress('Session saved successfully!');
        return { success: true };
      } else {
        return { success: false, error: 'Login failed. Please check your credentials.' };
      }

    } catch (error) {
      return { success: false, error: (error as Error).message };
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  async execute(
    jobId: string,
    data: LinkedInJobData,
    onResult: (result: LinkedInResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    this.shouldStop = false;
    
    const scrapeMode = data.scrapeMode || 'google';
    const maxResults = data.maxResults || 25;
    
    onProgress(`Starting LinkedIn ${data.searchType} search (${scrapeMode} mode) for "${data.keywords}"`);
    
    try {
      if (scrapeMode === 'google') {
        // Google Custom Search API - no browser needed!
        // Create a dummy page object (won't be used if API is configured)
        await this.scrapeViaGoogle(null as any, jobId, data, maxResults, onResult, onProgress);
      } else {
        // Login-based scraping - needs browser
        const userDataDir = path.join(process.cwd(), '.chrome-profile');
        
        if (!fs.existsSync(userDataDir)) {
          fs.mkdirSync(userDataDir, { recursive: true });
        }
        
        onProgress(`Using Chrome profile: ${userDataDir}`);
        
        const context = await chromium.launchPersistentContext(userDataDir, {
          channel: 'chrome',
          headless: false,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--start-maximized',
          ],
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ignoreDefaultArgs: ['--enable-automation'],
        });
        
        this.context = context;
        const page = await context.newPage();
        
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
        
        // Login-based scraping
        const loggedIn = await this.ensureLoggedIn(page, context, data, onProgress);
        
        if (!loggedIn) {
          throw new Error('Failed to login to LinkedIn. Please connect your account in Integrations first.');
        }
        
        onProgress('Logged in to LinkedIn');
        
        if (data.searchType === 'people') {
          await this.searchPeople(page, jobId, data, maxResults, onResult, onProgress);
        } else {
          await this.searchCompanies(page, jobId, data, maxResults, onResult, onProgress);
        }
        
        await this.saveSession(context);
      }
      
    } catch (error) {
      onProgress(`Error: ${(error as Error).message}`);
      throw error;
    } finally {
      // Close persistent context (this also closes browser)
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  // ============================================
  // SEARCH ENGINE SCRAPING (No Login Required)
  // Uses DuckDuckGo Standard - works without blocking!
  // ============================================

  private async scrapeViaGoogle(
    page: Page,
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: LinkedInResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    // Use DuckDuckGo Standard (JS version) - works with headless=false
    await this.scrapeViaDuckDuckGoStandard(jobId, data, maxResults, onResult, onProgress);
  }

  // DuckDuckGo Standard (JS-enabled) - Works with headless=false
  // Based on updated ScrapedIn logic
  private async scrapeViaDuckDuckGoStandard(
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: LinkedInResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    const siteFilter = data.searchType === 'people'
      ? 'site:linkedin.com/in'
      : 'site:linkedin.com/company';

    let searchQuery = `${siteFilter} ${data.keywords}`;
    if (data.location) {
      searchQuery += ` ${data.location}`;
    }

    onProgress(`🦆 DuckDuckGo search: ${searchQuery}`);

    // Launch browser - headless=false required to bypass DDG bot detection
    const browser = await chromium.launch({
      headless: false, // REQUIRED for DuckDuckGo
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-setuid-sandbox',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });

    const page2 = await context.newPage();

    // Basic stealth
    await page2.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    let resultsCount = 0;
    const seenUrls = new Set<string>();
    const profilePath = data.searchType === 'people' ? '/in/' : '/company/';

    try {
      // DuckDuckGo search URL
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&t=h_&ia=web`;
      
      onProgress(`🔍 Loading DuckDuckGo search...`);
      await page2.goto(searchUrl, { timeout: 30000 });

      // Wait for results to appear
      try {
        await page2.waitForSelector("a[data-testid='result-title-a']", { timeout: 10000 });
        onProgress(`✅ Search results loaded`);
      } catch {
        onProgress(`⚠️ Waiting for results...`);
        await page2.waitForTimeout(3000);
      }

      // Scroll to load more results (DDG uses infinite scroll)
      onProgress(`📜 Scrolling to load more results...`);
      for (let i = 0; i < 5; i++) {
        await page2.keyboard.press('End');
        await page2.waitForTimeout(1500);
        
        // Check if we have enough results
        const currentCount = await page2.evaluate((path) => {
          const links = document.querySelectorAll("a[data-testid='result-title-a']");
          let count = 0;
          links.forEach((a) => {
            const href = a.getAttribute('href') || '';
            if (href.includes(`linkedin.com${path}`)) count++;
          });
          return count;
        }, profilePath);
        
        onProgress(`   Found ${currentCount} LinkedIn results so far...`);
        if (currentCount >= maxResults) break;
      }

      // Extract LinkedIn URLs with titles and snippets
      const linkedInResults = await page2.evaluate((path) => {
        const results: Array<{url: string; title: string; snippet: string}> = [];
        
        // Try DDG-specific result containers
        const resultContainers = document.querySelectorAll('article[data-testid="result"]');
        
        if (resultContainers.length > 0) {
          resultContainers.forEach((container) => {
            const titleLink = container.querySelector("a[data-testid='result-title-a']");
            const snippetEl = container.querySelector("span[data-testid='result-snippet']") || 
                              container.querySelector(".result__snippet") ||
                              container.querySelector("p");
            
            if (titleLink) {
              const href = titleLink.getAttribute('href') || '';
              if (href.includes(`linkedin.com${path}`)) {
                let clean = href;
                if (clean.includes('?')) clean = clean.split('?')[0];
                if (clean.includes('#')) clean = clean.split('#')[0];
                if (!clean.startsWith('http')) clean = 'https://' + clean;
                
                const title = titleLink.textContent?.trim() || '';
                const snippet = snippetEl?.textContent?.trim() || '';
                
                results.push({
                  url: clean.replace(/\/$/, ''),
                  title,
                  snippet
                });
              }
            }
          });
        }
        
        // Fallback: just get links if no containers found
        if (results.length === 0) {
          const anchors = document.querySelectorAll("a[data-testid='result-title-a'], a[href*='linkedin.com']");
          anchors.forEach((anchor) => {
            const href = anchor.getAttribute('href') || '';
            if (href.includes(`linkedin.com${path}`)) {
              let clean = href;
              if (clean.includes('?')) clean = clean.split('?')[0];
              if (clean.includes('#')) clean = clean.split('#')[0];
              if (!clean.startsWith('http')) clean = 'https://' + clean;
              
              const title = anchor.textContent?.trim() || '';
              const parent = anchor.closest('article, div, li');
              const snippet = parent?.querySelector('p, span.snippet')?.textContent?.trim() || '';
              
              results.push({
                url: clean.replace(/\/$/, ''),
                title,
                snippet
              });
            }
          });
        }
        
        // Dedupe by URL
        const seen = new Set<string>();
        return results.filter(r => {
          if (seen.has(r.url)) return false;
          seen.add(r.url);
          return true;
        });
      }, profilePath);

      onProgress(`✅ Found ${linkedInResults.length} unique LinkedIn profiles`);

      // Process found results
      for (const result of linkedInResults) {
        if (resultsCount >= maxResults || this.shouldStop) break;
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);

        if (data.searchType === 'people') {
          const person = this.parseSearchResult(result.url, result.title, result.snippet, jobId, data.location);
          if (person && person.name && person.name.length > 2) {
            onResult(person);
            resultsCount++;
            onProgress(`✓ Found (${resultsCount}/${maxResults}): ${person.name} - ${person.headline || 'No title'}`);
          }
        } else {
          const company = this.parseCompanySearchResult(result.url, result.title, result.snippet, jobId);
          if (company && company.name && company.name.length > 1) {
            onResult(company);
            resultsCount++;
            onProgress(`✓ Found (${resultsCount}/${maxResults}): ${company.name}`);
          }
        }
      }

    } catch (error) {
      onProgress(`❌ Error: ${(error as Error).message}`);
    } finally {
      await context.close();
      await browser.close();
    }

    onProgress(`🎉 Completed! Found ${resultsCount} ${data.searchType}`);
  }

  // DuckDuckGo HTML version - uses fetch, no browser needed, no CAPTCHAs
  private async scrapeViaDuckDuckGoHTML(
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: LinkedInResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    const siteFilter = data.searchType === 'people'
      ? 'site:linkedin.com/in'
      : 'site:linkedin.com/company';

    let searchQuery = `${siteFilter} ${data.keywords}`;
    if (data.location) {
      searchQuery += ` ${data.location}`;
    }

    onProgress(`🦆 DuckDuckGo HTML search: ${searchQuery}`);

    let resultsCount = 0;
    const seenUrls = new Set<string>();

    try {
      // DuckDuckGo HTML endpoint - works without JavaScript
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
      
      onProgress(`📡 Fetching results...`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (!response.ok) {
        onProgress(`❌ HTTP Error: ${response.status}`);
        return;
      }

      const html = await response.text();
      onProgress(`📄 Got ${html.length} chars of HTML`);

      // Parse LinkedIn URLs from the HTML using regex
      const linkedinUrlPattern = data.searchType === 'people'
        ? /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/gi
        : /https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9\-_%]+/gi;

      const matches = html.match(linkedinUrlPattern) || [];
      onProgress(`🔗 Found ${matches.length} LinkedIn URLs`);

      // Also try to extract from result links
      const resultPattern = /<a[^>]+href="([^"]*linkedin\.com[^"]*)"[^>]*>/gi;
      let match;
      while ((match = resultPattern.exec(html)) !== null) {
        let url = match[1];
        // Decode HTML entities
        url = url.replace(/&amp;/g, '&');
        // Extract actual URL if it's a redirect
        if (url.includes('uddg=')) {
          const uddgMatch = url.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            url = decodeURIComponent(uddgMatch[1]);
          }
        }
        if (url.includes('linkedin.com')) {
          matches.push(url);
        }
      }

      // Process unique URLs
      const uniqueUrls = [...new Set(matches)].map(url => {
        // Clean URL
        url = decodeURIComponent(url);
        if (url.includes('?')) url = url.split('?')[0];
        if (url.includes('#')) url = url.split('#')[0];
        return url.replace(/\/+$/, '');
      });

      onProgress(`✅ Found ${uniqueUrls.length} unique LinkedIn profiles`);

      for (const linkedinUrl of uniqueUrls) {
        if (resultsCount >= maxResults || this.shouldStop) break;
        if (seenUrls.has(linkedinUrl)) continue;
        
        // Validate URL format
        const expectedPath = data.searchType === 'people' ? '/in/' : '/company/';
        if (!linkedinUrl.includes(expectedPath)) continue;
        
        seenUrls.add(linkedinUrl);

        if (data.searchType === 'people') {
          const person = this.parseLinkedInUrl(linkedinUrl, jobId, data.location);
          if (person && person.name && person.name.length > 1) {
            onResult(person);
            resultsCount++;
            onProgress(`✓ Found (${resultsCount}/${maxResults}): ${person.name}`);
          }
        } else {
          const company = this.parseCompanyUrl(linkedinUrl, jobId);
          if (company && company.name && company.name.length > 1) {
            onResult(company);
            resultsCount++;
            onProgress(`✓ Found (${resultsCount}/${maxResults}): ${company.name}`);
          }
        }
      }

      // If no results, try the ScrapedIn Google approach as fallback
      if (resultsCount === 0) {
        onProgress(`⚠️ No results from DuckDuckGo, trying Google with stealth...`);
        await this.scrapeViaGoogleStealth(jobId, data, maxResults, onResult, onProgress);
        return;
      }

    } catch (error) {
      onProgress(`❌ Error: ${(error as Error).message}`);
      // Fallback to Google stealth
      onProgress(`⚠️ Falling back to Google with stealth...`);
      await this.scrapeViaGoogleStealth(jobId, data, maxResults, onResult, onProgress);
      return;
    }

    onProgress(`🎉 Completed! Found ${resultsCount} ${data.searchType}`);
  }

  // ScrapedIn-style Google scraping with stealth measures
  // Based on: https://github.com/sohom2004/ScrapedIn-Agentic-LinkedIn-Scraper-
  private async scrapeViaGoogleStealth(
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: LinkedInResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    const siteFilter = data.searchType === 'people'
      ? 'site:linkedin.com/in'
      : 'site:linkedin.com/company';

    let searchQuery = `${siteFilter} ${data.keywords}`;
    if (data.location) {
      searchQuery += ` ${data.location}`;
    }

    onProgress(`🔍 Google search: ${searchQuery}`);

    // Launch browser with stealth configuration (like ScrapedIn)
    const browser = await chromium.launch({
      headless: true,  // Can be headless with stealth
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    // Add stealth script to hide automation
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // @ts-ignore
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    let resultsCount = 0;
    const seenUrls = new Set<string>();
    const maxPages = Math.ceil(maxResults / 10);

    try {
      for (let pageIndex = 0; pageIndex < maxPages && resultsCount < maxResults && !this.shouldStop; pageIndex++) {
        const start = pageIndex * 10;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&start=${start}`;

        onProgress(`🔍 Fetching page ${pageIndex + 1}/${maxPages}`);

        try {
          // Navigate with retry logic
          let success = false;
          for (let retry = 0; retry < 3; retry++) {
            try {
              const response = await page.goto(searchUrl, { 
                timeout: 30000, 
                waitUntil: 'domcontentloaded' 
              });
              if (response && response.status() === 200) {
                success = true;
                break;
              }
              onProgress(`⚠️ Response status: ${response?.status()}, retrying...`);
            } catch (e) {
              onProgress(`⚠️ Navigation error (retry ${retry + 1}): ${(e as Error).message}`);
              if (retry === 2) throw e;
              await page.waitForTimeout(2000);
            }
          }

          if (!success) continue;

          // Wait for content to load
          await page.waitForTimeout(2000);

          // Check for CAPTCHA/blocking
          const pageContent = await page.content();
          const isBlocked = ['captcha', 'unusual traffic', 'blocked', 'robot'].some(
            keyword => pageContent.toLowerCase().includes(keyword)
          );

          if (isBlocked) {
            onProgress(`🚫 Google blocking detected. Waiting 30s before retry...`);
            await page.waitForTimeout(30000);
            continue;
          }

          // Extract LinkedIn URLs using multiple selectors (ScrapedIn approach)
          const linkedInUrls = await page.evaluate((searchType) => {
            const urls: string[] = [];
            const profilePath = searchType === 'people' ? '/in/' : '/company/';
            
            // Multiple selectors to try (like ScrapedIn)
            const selectorsToTry = [
              `a[href*='linkedin.com${profilePath}']`,
              'div.g a[href]',
              'h3 a[href]',
              "a[href^='/url?']",
              'a[data-ved]',
            ];

            const cleanLinkedInUrl = (url: string): string => {
              // Handle Google redirect URLs
              if (url.startsWith('/url?')) {
                const params = new URLSearchParams(url.slice(5));
                url = params.get('url') || params.get('q') || url;
              }
              
              // Decode URL
              url = decodeURIComponent(url);
              
              // Clean the LinkedIn URL
              if (url.includes(`linkedin.com${profilePath}`)) {
                const idx = url.indexOf('linkedin.com');
                if (idx !== -1) {
                  let linkedinPart = url.slice(idx);
                  linkedinPart = linkedinPart.split('?')[0].split('#')[0];
                  return `https://${linkedinPart}`;
                }
              }
              return '';
            };

            for (const selector of selectorsToTry) {
              const anchors = document.querySelectorAll(selector);
              anchors.forEach((anchor) => {
                const href = anchor.getAttribute('href') || '';
                if (href.includes('linkedin.com') || href.startsWith('/url?')) {
                  const cleaned = cleanLinkedInUrl(href);
                  if (cleaned && cleaned.includes(profilePath)) {
                    urls.push(cleaned);
                  }
                }
              });
            }

            return [...new Set(urls)]; // Dedupe
          }, data.searchType);

          onProgress(`✅ Found ${linkedInUrls.length} LinkedIn URLs on page ${pageIndex + 1}`);

          // Process found URLs
          for (const linkedinUrl of linkedInUrls) {
            if (resultsCount >= maxResults || this.shouldStop) break;
            if (seenUrls.has(linkedinUrl)) continue;
            seenUrls.add(linkedinUrl);

            // Extract info from URL and create result
            if (data.searchType === 'people') {
              const person = this.parseLinkedInUrl(linkedinUrl, jobId, data.location);
              if (person && person.name && person.name.length > 1) {
                onResult(person);
                resultsCount++;
                onProgress(`✓ Found (${resultsCount}/${maxResults}): ${person.name}`);
              }
            } else {
              const company = this.parseCompanyUrl(linkedinUrl, jobId);
              if (company && company.name && company.name.length > 1) {
                onResult(company);
                resultsCount++;
                onProgress(`✓ Found (${resultsCount}/${maxResults}): ${company.name}`);
              }
            }
          }

          if (linkedInUrls.length === 0 && pageIndex === 0) {
            onProgress('⚠️ No results on first page. Google might be blocking.');
            break;
          }

          // Random delay between requests (like ScrapedIn)
          const delay = 2000 + Math.random() * 3000;
          onProgress(`⏳ Waiting ${(delay / 1000).toFixed(1)}s...`);
          await page.waitForTimeout(delay);

        } catch (error) {
          onProgress(`❌ Error on page ${pageIndex + 1}: ${(error as Error).message}`);
          continue;
        }
      }
    } finally {
      await context.close();
      await browser.close();
    }

    onProgress(`🎉 Completed! Found ${resultsCount} ${data.searchType}`);
  }

  // Parse search result with title and snippet to extract better data
  private parseSearchResult(url: string, title: string, snippet: string, jobId: string, location?: string): PersonResult | null {
    try {
      // Title format is usually: "Name - Title at Company - LinkedIn"
      // Examples:
      // "Sean Giancola - CEO and Publisher at NY POST - LinkedIn"
      // "President & CEO at New York Bankers Association - LinkedIn"
      // "Murad Awawdeh - President & CEO @ The New York Immigration..."
      
      let name = '';
      let headline = '';
      let company = '';
      
      // Remove " - LinkedIn" suffix
      let cleanTitle = title.replace(/\s*-\s*LinkedIn\s*$/i, '').trim();
      
      // Try to parse "Name - Title at Company" format
      const dashParts = cleanTitle.split(' - ');
      
      if (dashParts.length >= 2) {
        // First part is usually the name
        name = dashParts[0].trim();
        
        // Rest is the headline/title
        headline = dashParts.slice(1).join(' - ').trim();
        
        // Try to extract company from headline
        const atMatch = headline.match(/(?:at|@)\s+(.+?)(?:\s*[-–|]|$)/i);
        if (atMatch) {
          company = atMatch[1].trim();
        }
      } else if (dashParts.length === 1) {
        // Might be just a name or "Title at Company"
        const atMatch = cleanTitle.match(/(.+?)\s+(?:at|@)\s+(.+)/i);
        if (atMatch) {
          headline = atMatch[1].trim();
          company = atMatch[2].trim();
          // Try to get name from URL
          const urlMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
          if (urlMatch) {
            const slug = urlMatch[1].replace(/-[a-f0-9]{6,}$/, '').replace(/-/g, ' ');
            name = slug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          }
        } else {
          name = cleanTitle;
        }
      }
      
      // If no name found, try to extract from URL
      if (!name) {
        const urlMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
        if (urlMatch) {
          const slug = urlMatch[1].replace(/-[a-f0-9]{6,}$/, '').replace(/-/g, ' ');
          name = slug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
      }
      
      // Clean up name - remove any remaining "LinkedIn" text
      name = name.replace(/linkedin/gi, '').trim();
      
      // If headline mentions snippet content, add it
      if (!headline && snippet) {
        // Try to extract headline from snippet
        const snippetMatch = snippet.match(/^([^.]+?(?:CEO|President|Director|Manager|Engineer|Developer|Founder|Partner|VP|Vice President|Chief|Head)[^.]*)/i);
        if (snippetMatch) {
          headline = snippetMatch[1].trim();
        }
      }

      if (!name || name.length < 2) return null;

      return {
        input_id: jobId,
        name,
        headline: headline || '',
        location: location || '',
        profile_url: url,
        company: company || '',
        connection_degree: '',
        profile_image_url: '',
        scrape_mode: 'google',
      };
    } catch {
      return null;
    }
  }

  // Parse company search result
  private parseCompanySearchResult(url: string, title: string, snippet: string, jobId: string): CompanyResult | null {
    try {
      // Title format: "Company Name - LinkedIn"
      let name = title.replace(/\s*-\s*LinkedIn\s*$/i, '').trim();
      
      // Clean up
      name = name.replace(/\s*\|\s*LinkedIn.*$/i, '').trim();
      
      if (!name || name.length < 2) return null;

      return {
        input_id: jobId,
        name,
        industry: '',
        location: '',
        company_url: url,
        employee_count: '',
        description: snippet || '',
        logo_url: '',
        scrape_mode: 'google',
      };
    } catch {
      return null;
    }
  }

  // Parse LinkedIn profile URL to extract name (fallback)
  private parseLinkedInUrl(url: string, jobId: string, location?: string): PersonResult | null {
    try {
      // Extract name from URL: linkedin.com/in/john-doe-123abc
      const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
      if (!match) return null;

      const slug = match[1];
      // Remove trailing ID numbers and convert dashes to spaces
      const namePart = slug.replace(/-[a-f0-9]{6,}$/, '').replace(/-/g, ' ');
      
      // Capitalize each word
      const name = namePart.split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      return {
        input_id: jobId,
        name,
        headline: '',
        location: location || '',
        profile_url: url,
        company: '',
        connection_degree: '',
        profile_image_url: '',
        scrape_mode: 'google',
      };
    } catch {
      return null;
    }
  }

  // Parse LinkedIn company URL
  private parseCompanyUrl(url: string, jobId: string): CompanyResult | null {
    try {
      const match = url.match(/linkedin\.com\/company\/([^\/\?]+)/);
      if (!match) return null;

      const slug = match[1];
      const name = slug.replace(/-/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      return {
        input_id: jobId,
        name,
        industry: '',
        location: '',
        company_url: url,
        employee_count: '',
        description: '',
        logo_url: '',
        scrape_mode: 'google',
      };
    } catch {
      return null;
    }
  }

  // Google Custom Search API - official API, no CAPTCHAs
  // You need to set up: https://developers.google.com/custom-search/v1/introduction
  // 1. Create API key: https://console.cloud.google.com/apis/credentials
  // 2. Create Custom Search Engine: https://programmablesearchengine.google.com/
  //    - Set it to search only linkedin.com
  private async scrapeViaGoogleCSE(
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: LinkedInResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    // Get API key and CX from environment or use defaults for testing
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_CSE_API_KEY;
    const cx = process.env.GOOGLE_CSE_CX || process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!apiKey || !cx) {
      onProgress('⚠️ Google Custom Search API not configured. Set GOOGLE_API_KEY and GOOGLE_CSE_CX environment variables.');
      onProgress('📖 Setup guide: https://developers.google.com/custom-search/v1/introduction');
      onProgress('Falling back to browser-based search...');
      // Fallback to browser-based search
      const context = await chromium.launchPersistentContext(path.join(process.cwd(), '.chrome-profile'), {
        channel: 'chrome',
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        viewport: { width: 1920, height: 1080 },
      });
      const page = await context.newPage();
      try {
        await this.scrapeViaGoogleSearch(page, jobId, data, maxResults, onResult, onProgress);
      } finally {
        await context.close();
      }
      return;
    }

    onProgress(`Using Google Custom Search API`);
    
    const siteFilter = data.searchType === 'people' ? 'site:linkedin.com/in' : 'site:linkedin.com/company';
    let searchQuery = `${siteFilter} ${data.keywords}`;
    if (data.location) {
      searchQuery += ` ${data.location}`;
    }

    onProgress(`Search query: ${searchQuery}`);

    let resultsCount = 0;
    let startIndex = 1;
    const seenUrls = new Set<string>();

    // Google CSE returns max 10 results per request, max 100 total
    while (resultsCount < maxResults && startIndex <= 91 && !this.shouldStop) {
      try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(searchQuery)}&start=${startIndex}&num=10`;
        
        onProgress(`Fetching results ${startIndex}-${startIndex + 9}...`);
        
        const response = await fetch(url);
        const data_response = await response.json();
        
        if (data_response.error) {
          onProgress(`API Error: ${data_response.error.message}`);
          break;
        }

        const items = data_response.items || [];
        onProgress(`Got ${items.length} results from API`);

        if (items.length === 0) {
          onProgress('No more results from API');
          break;
        }

        for (const item of items) {
          if (resultsCount >= maxResults || this.shouldStop) break;
          
          let linkedinUrl = item.link || item.formattedUrl || '';
          
          // Filter by profile type
          if (data.searchType === 'people' && !linkedinUrl.includes('/in/')) continue;
          if (data.searchType === 'companies' && !linkedinUrl.includes('/company/')) continue;
          
          // Clean URL
          if (linkedinUrl.includes('?')) {
            linkedinUrl = linkedinUrl.split('?')[0];
          }
          
          if (seenUrls.has(linkedinUrl)) continue;
          if (!linkedinUrl.startsWith('http')) continue;
          seenUrls.add(linkedinUrl);

          const title = item.title || '';
          const snippet = item.snippet || '';

          if (data.searchType === 'people') {
            const person = this.parseGooglePersonResult(
              { linkedin_url: linkedinUrl, title, snippet },
              jobId,
              data.location
            );
            if (person && person.name && person.name.length > 1) {
              onResult(person);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${person.name}`);
            }
          } else {
            const company = this.parseGoogleCompanyResult(
              { linkedin_url: linkedinUrl, title, snippet },
              jobId
            );
            if (company && company.name && company.name.length > 1) {
              onResult(company);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${company.name}`);
            }
          }
        }

        startIndex += 10;
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        onProgress(`Error: ${(error as Error).message}`);
        break;
      }
    }

    onProgress(`✅ Completed! Found ${resultsCount} ${data.searchType}`);
  }

  // Google search with persistent profile - solve CAPTCHA once, then it works
  private async scrapeViaGoogleSearch(
    page: Page,
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: LinkedInResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    const siteFilter = data.searchType === 'people'
      ? 'site:linkedin.com/in'
      : 'site:linkedin.com/company';

    let searchQuery = `${siteFilter} ${data.keywords}`;
    if (data.location) {
      searchQuery += ` ${data.location}`;
    }

    onProgress(`Google search: ${searchQuery}`);
    onProgress(`⚠️ If you see a CAPTCHA, solve it manually - it will stay solved for future searches!`);

    let resultsCount = 0;
    let pageNum = 0;
    const seenUrls = new Set<string>();

    while (resultsCount < maxResults && pageNum < 10 && !this.shouldStop) {
      try {
        const start = pageNum * 10;
        const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&start=${start}`;
        
        onProgress(`Loading page ${pageNum + 1}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Wait for user to solve CAPTCHA if present (up to 2 minutes)
        let captchaDetected = false;
        for (let i = 0; i < 24; i++) { // 24 * 5s = 120 seconds max
          const hasCaptcha = await page.evaluate(() => {
            const body = document.body.innerText.toLowerCase();
            return body.includes('unusual traffic') || 
                   body.includes('captcha') ||
                   body.includes('not a robot') ||
                   document.querySelector('iframe[src*="recaptcha"]') !== null;
          });
          
          if (hasCaptcha) {
            if (!captchaDetected) {
              onProgress(`⚠️ CAPTCHA detected! Please solve it in the browser window...`);
              captchaDetected = true;
            }
            await page.waitForTimeout(5000);
          } else {
            if (captchaDetected) {
              onProgress(`✓ CAPTCHA solved! Continuing...`);
            }
            break;
          }
        }
        
        await page.waitForTimeout(1000);

        // Extract results
        const pageResults = await page.evaluate((type) => {
          const items: Array<{ linkedin_url: string; title: string; snippet: string }> = [];
          
          // Google search results
          const results = document.querySelectorAll('div.g, div[data-hveid]');
          
          results.forEach((result) => {
            const link = result.querySelector('a[href*="linkedin.com"]');
            if (!link) return;
            
            const href = link.getAttribute('href') || '';
            const title = link.querySelector('h3')?.textContent?.trim() || link.textContent?.trim() || '';
            
            const snippetEl = result.querySelector('.VwiC3b, .st, span.aCOpRe');
            const snippet = snippetEl?.textContent?.trim() || '';
            
            if (type === 'people' && href.includes('/in/')) {
              items.push({ linkedin_url: href, title, snippet });
            } else if (type === 'companies' && href.includes('/company/')) {
              items.push({ linkedin_url: href, title, snippet });
            }
          });
          
          return items;
        }, data.searchType);

        onProgress(`Found ${pageResults.length} LinkedIn ${data.searchType} on page ${pageNum + 1}`);

        for (const item of pageResults) {
          if (resultsCount >= maxResults || this.shouldStop) break;
          
          let linkedinUrl = item.linkedin_url;
          if (linkedinUrl.includes('?')) {
            linkedinUrl = linkedinUrl.split('?')[0];
          }
          
          if (seenUrls.has(linkedinUrl)) continue;
          if (!linkedinUrl.startsWith('http')) continue;
          seenUrls.add(linkedinUrl);

          if (data.searchType === 'people') {
            const person = this.parseGooglePersonResult(
              { linkedin_url: linkedinUrl, title: item.title, snippet: item.snippet },
              jobId,
              data.location
            );
            if (person && person.name && person.name.length > 1) {
              onResult(person);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${person.name}`);
            }
          } else {
            const company = this.parseGoogleCompanyResult(
              { linkedin_url: linkedinUrl, title: item.title, snippet: item.snippet },
              jobId
            );
            if (company && company.name && company.name.length > 1) {
              onResult(company);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${company.name}`);
            }
          }
        }

        if (pageResults.length === 0 && pageNum === 0) {
          onProgress('No results found on first page');
          break;
        }

        if (pageResults.length === 0) {
          onProgress('No more results');
          break;
        }

        pageNum++;
        await page.waitForTimeout(2000 + Math.random() * 2000);

      } catch (error) {
        onProgress(`Error on page ${pageNum + 1}: ${(error as Error).message}`);
        break;
      }
    }

    onProgress(`✅ Completed! Found ${resultsCount} ${data.searchType}`);
  }

  // Startpage search - uses Google results but privacy-focused, no CAPTCHAs
  private async scrapeViaStartpage(
    page: Page,
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: LinkedInResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    const siteFilter = data.searchType === 'people'
      ? 'site:linkedin.com/in'
      : 'site:linkedin.com/company';

    let searchQuery = `${siteFilter} ${data.keywords}`;
    if (data.location) {
      searchQuery += ` ${data.location}`;
    }

    onProgress(`Startpage search: ${searchQuery}`);

    let resultsCount = 0;
    let pageNum = 1;
    const seenUrls = new Set<string>();

    while (resultsCount < maxResults && pageNum <= 5 && !this.shouldStop) {
      try {
        // Use direct URL with search query
        const searchUrl = `https://www.startpage.com/sp/search?query=${encodeURIComponent(searchQuery)}&page=${pageNum}`;
        onProgress(`Loading page ${pageNum}: ${searchUrl}`);
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Take screenshot for debugging
        await page.screenshot({ path: `debug-startpage-p${pageNum}.png`, fullPage: true });
        onProgress(`Screenshot saved: debug-startpage-p${pageNum}.png`);

        // Extract results
        const pageResults = await page.evaluate((type) => {
          const items: Array<{ linkedin_url: string; title: string; snippet: string }> = [];
          const debug: string[] = [];
          
          // Find all links on the page
          const allLinks = document.querySelectorAll('a');
          debug.push(`Total links: ${allLinks.length}`);
          
          let linkedInCount = 0;
          allLinks.forEach((link) => {
            const href = link.getAttribute('href') || '';
            
            // Check for LinkedIn URLs
            if (href.includes('linkedin.com')) {
              linkedInCount++;
              const title = link.textContent?.trim() || '';
              
              // Get snippet from nearby elements
              let snippet = '';
              const parent = link.closest('.w-gl__result, .result, article, li, div');
              if (parent) {
                const snippetEl = parent.querySelector('p, .w-gl__description, .description');
                snippet = snippetEl?.textContent?.trim() || '';
              }
              
              if (type === 'people' && href.includes('/in/')) {
                items.push({ linkedin_url: href, title, snippet });
              } else if (type === 'companies' && href.includes('/company/')) {
                items.push({ linkedin_url: href, title, snippet });
              }
            }
          });
          
          debug.push(`LinkedIn links: ${linkedInCount}`);
          debug.push(`Filtered items: ${items.length}`);
          debug.push(`Body text preview: ${document.body.innerText.substring(0, 300).replace(/\n/g, ' ')}`);
          
          return { items, debug };
        }, data.searchType);

        // Log debug info
        pageResults.debug.forEach(d => onProgress(`  DEBUG: ${d}`));
        
        onProgress(`Found ${pageResults.items.length} LinkedIn ${data.searchType} on page ${pageNum}`);

        for (const item of pageResults.items) {
          if (resultsCount >= maxResults || this.shouldStop) break;
          
          let linkedinUrl = item.linkedin_url;
          if (linkedinUrl.includes('?')) {
            linkedinUrl = linkedinUrl.split('?')[0];
          }
          
          if (seenUrls.has(linkedinUrl)) continue;
          if (!linkedinUrl.startsWith('http')) continue;
          seenUrls.add(linkedinUrl);

          if (data.searchType === 'people') {
            const person = this.parseGooglePersonResult(
              { linkedin_url: linkedinUrl, title: item.title, snippet: item.snippet },
              jobId,
              data.location
            );
            if (person && person.name && person.name.length > 1) {
              onResult(person);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${person.name}`);
            }
          } else {
            const company = this.parseGoogleCompanyResult(
              { linkedin_url: linkedinUrl, title: item.title, snippet: item.snippet },
              jobId
            );
            if (company && company.name && company.name.length > 1) {
              onResult(company);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${company.name}`);
            }
          }
        }

        if (pageResults.items.length === 0 && pageNum === 1) {
          onProgress('No results found on first page, trying DuckDuckGo...');
          await this.scrapeViaDuckDuckGo(page, jobId, data, maxResults, onResult, onProgress);
          return;
        }

        if (pageResults.items.length === 0) {
          onProgress('No more results, stopping');
          break;
        }

        pageNum++;
        await page.waitForTimeout(1500 + Math.random() * 1000);

      } catch (error) {
        onProgress(`Error on page ${pageNum}: ${(error as Error).message}`);
        break;
      }
    }

    onProgress(`✅ Completed! Found ${resultsCount} ${data.searchType}`);
  }

  private async scrapeViaBing(
    page: Page,
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: LinkedInResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    const siteFilter = data.searchType === 'people'
      ? 'site:linkedin.com/in'
      : 'site:linkedin.com/company';

    let searchQuery = `${siteFilter} ${data.keywords}`;
    if (data.location) {
      searchQuery += ` ${data.location}`;
    }

    onProgress(`Bing search: ${searchQuery}`);

    let resultsCount = 0;
    let pageNum = 1;
    const seenUrls = new Set<string>();

    while (resultsCount < maxResults && pageNum <= 10 && !this.shouldStop) {
      const first = (pageNum - 1) * 10 + 1;
      const url = `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}&first=${first}`;

      try {
        onProgress(`Loading page ${pageNum}: ${url}`);
        
        // Use simpler wait strategy
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Wait for search results to appear
        await page.waitForSelector('body', { timeout: 5000 });
        await page.waitForTimeout(3000);

        // Take screenshot for debugging
        const screenshotPath = `debug-bing-page${pageNum}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        onProgress(`Screenshot saved: ${screenshotPath}`);

        // Get page HTML length for debugging
        const htmlLength = await page.evaluate(() => document.body.innerHTML.length);
        onProgress(`Page HTML length: ${htmlLength} chars`);

        // Extract ALL links that contain linkedin.com
        const allLinkedInData = await page.evaluate((type) => {
          const debug: string[] = [];
          const items: Array<{ linkedin_url: string; title: string; snippet: string }> = [];
          
          // Get all anchor elements
          const allAnchors = document.querySelectorAll('a');
          debug.push(`Total anchors on page: ${allAnchors.length}`);
          
          let linkedInCount = 0;
          allAnchors.forEach((anchor) => {
            const href = anchor.getAttribute('href') || '';
            
            if (href.includes('linkedin.com')) {
              linkedInCount++;
              const title = anchor.textContent?.trim() || '';
              
              // Get parent element for snippet
              let snippet = '';
              const parent = anchor.closest('li, .b_algo, div');
              if (parent) {
                const snippetEl = parent.querySelector('p, .b_caption, span');
                snippet = snippetEl?.textContent?.trim() || '';
              }
              
              // Filter by type
              if (type === 'people' && href.includes('/in/')) {
                items.push({ linkedin_url: href, title, snippet });
              } else if (type === 'companies' && href.includes('/company/')) {
                items.push({ linkedin_url: href, title, snippet });
              }
            }
          });
          
          debug.push(`LinkedIn anchors found: ${linkedInCount}`);
          debug.push(`Filtered items (${type}): ${items.length}`);
          
          // Also log first 500 chars of body for debugging
          debug.push(`Body preview: ${document.body.innerText.substring(0, 500).replace(/\n/g, ' ')}`);
          
          return { items, debug };
        }, data.searchType);

        // Log debug info
        allLinkedInData.debug.forEach(d => onProgress(`  DEBUG: ${d}`));
        
        const pageResults = allLinkedInData.items;
        onProgress(`Found ${pageResults.length} LinkedIn ${data.searchType} on page ${pageNum}`);

        for (const item of pageResults) {
          if (resultsCount >= maxResults || this.shouldStop) break;
          
          // Clean URL
          let linkedinUrl = item.linkedin_url;
          // Remove tracking params
          if (linkedinUrl.includes('?')) {
            linkedinUrl = linkedinUrl.split('?')[0];
          }
          
          if (seenUrls.has(linkedinUrl)) continue;
          if (!linkedinUrl.startsWith('http')) continue;
          seenUrls.add(linkedinUrl);

          if (data.searchType === 'people') {
            const person = this.parseGooglePersonResult(
              { linkedin_url: linkedinUrl, title: item.title, snippet: item.snippet },
              jobId,
              data.location
            );
            if (person && person.name && person.name.length > 1) {
              onResult(person);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${person.name}`);
            }
          } else {
            const company = this.parseGoogleCompanyResult(
              { linkedin_url: linkedinUrl, title: item.title, snippet: item.snippet },
              jobId
            );
            if (company && company.name && company.name.length > 1) {
              onResult(company);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${company.name}`);
            }
          }
        }

        // Check if we got any results, if not on first page, stop
        if (pageResults.length === 0 && pageNum === 1) {
          onProgress('No results found on first page, stopping');
          break;
        }

        // Check for next page
        const hasNextPage = await page.$('a.sb_pagN, a[title="Next page"]');
        if (!hasNextPage) {
          onProgress('No more pages available');
          break;
        }

        pageNum++;
        await page.waitForTimeout(1500 + Math.random() * 1000);

      } catch (error) {
        onProgress(`Error on page ${pageNum}: ${(error as Error).message}`);
        break;
      }
    }

    onProgress(`✅ Completed! Found ${resultsCount} ${data.searchType}`);
  }

  private async scrapeViaDuckDuckGo(
    page: Page,
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: LinkedInResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    const siteFilter = data.searchType === 'people'
      ? 'site:linkedin.com/in'
      : 'site:linkedin.com/company';

    let searchQuery = `${siteFilter} ${data.keywords}`;
    if (data.location) {
      searchQuery += ` ${data.location}`;
    }

    onProgress(`DuckDuckGo search: ${searchQuery}`);

    let resultsCount = 0;
    const seenUrls = new Set<string>();

    // DuckDuckGo HTML search
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Keep loading more results
      let attempts = 0;
      const maxAttempts = 10;

      while (resultsCount < maxResults && attempts < maxAttempts && !this.shouldStop) {
        attempts++;

        // Extract results from current page
        const pageResults = await page.evaluate((type) => {
          const items: Array<{ linkedin_url: string; title: string; snippet: string }> = [];
          const results = document.querySelectorAll('.result');

          results.forEach((result) => {
            const linkEl = result.querySelector('.result__a') as HTMLAnchorElement;
            const snippetEl = result.querySelector('.result__snippet');

            if (linkEl) {
              const href = linkEl.href || '';
              const title = linkEl.textContent || '';
              const snippet = snippetEl?.textContent || '';

              // Only include LinkedIn URLs of correct type
              if (type === 'people' && href.includes('linkedin.com/in/')) {
                items.push({ linkedin_url: href, title, snippet });
              } else if (type === 'companies' && href.includes('linkedin.com/company/')) {
                items.push({ linkedin_url: href, title, snippet });
              }
            }
          });

          return items;
        }, data.searchType);

        onProgress(`Found ${pageResults.length} results on page ${attempts}`);

        for (const item of pageResults) {
          if (resultsCount >= maxResults || this.shouldStop) break;
          
          // Clean up the URL (DuckDuckGo sometimes wraps URLs)
          let linkedinUrl = item.linkedin_url;
          if (linkedinUrl.includes('duckduckgo.com')) {
            const match = linkedinUrl.match(/uddg=([^&]+)/);
            if (match) {
              linkedinUrl = decodeURIComponent(match[1]);
            }
          }
          
          if (seenUrls.has(linkedinUrl)) continue;
          seenUrls.add(linkedinUrl);

          if (data.searchType === 'people') {
            const person = this.parseGooglePersonResult(
              { linkedin_url: linkedinUrl, title: item.title, snippet: item.snippet },
              jobId,
              data.location
            );
            if (person) {
              onResult(person);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${person.name}`);
            }
          } else {
            const company = this.parseGoogleCompanyResult(
              { linkedin_url: linkedinUrl, title: item.title, snippet: item.snippet },
              jobId
            );
            if (company) {
              onResult(company);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${company.name}`);
            }
          }
        }

        // Try to click "More results" button
        if (resultsCount < maxResults) {
          const moreButton = await page.$('input[type="submit"][value="Next"]');
          if (moreButton) {
            await moreButton.click();
            await page.waitForTimeout(2000 + Math.random() * 1000);
          } else {
            onProgress('No more pages available');
            break;
          }
        }
      }

      onProgress(`✅ Completed! Found ${resultsCount} ${data.searchType}`);

    } catch (error) {
      onProgress(`Error: ${(error as Error).message}`);
      throw error;
    }
  }

  private async scrapeViaGoogleDirect(
    page: Page,
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: LinkedInResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    const siteFilter = data.searchType === 'people'
      ? 'site:linkedin.com/in/'
      : 'site:linkedin.com/company/';

    let searchQuery = `${siteFilter} "${data.keywords}"`;
    if (data.location) {
      searchQuery += ` "${data.location}"`;
    }

    onProgress(`Google search: ${searchQuery}`);

    let resultsCount = 0;
    let startIndex = 0;
    const seenUrls = new Set<string>();

    while (resultsCount < maxResults && !this.shouldStop) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&start=${startIndex}`;

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500 + Math.random() * 1500);

        // Check for CAPTCHA
        const hasCaptcha = await page.$('form[action*="recaptcha"], #captcha-form, #recaptcha');
        if (hasCaptcha) {
          onProgress('⚠️ Google CAPTCHA detected. Switching to DuckDuckGo...');
          // Fall back to DuckDuckGo
          await this.scrapeViaDuckDuckGo(page, jobId, data, maxResults - resultsCount, onResult, onProgress);
          return;
        }

        // Extract results
        const pageResults = await page.evaluate((type) => {
          const items: Array<{ linkedin_url: string; title: string; snippet: string }> = [];
          const searchResults = document.querySelectorAll('div.g');

          searchResults.forEach((result) => {
            const linkEl = result.querySelector('a[href*="linkedin.com"]');
            const titleEl = result.querySelector('h3');
            const snippetEl = result.querySelector('div[data-sncf], div.VwiC3b');

            if (linkEl && titleEl) {
              const href = linkEl.getAttribute('href') || '';
              const title = titleEl.textContent || '';
              const snippet = snippetEl?.textContent || '';

              if (type === 'people' && href.includes('linkedin.com/in/')) {
                items.push({ linkedin_url: href, title, snippet });
              } else if (type === 'companies' && href.includes('linkedin.com/company/')) {
                items.push({ linkedin_url: href, title, snippet });
              }
            }
          });

          return items;
        }, data.searchType);

        if (pageResults.length === 0) {
          onProgress('No more results found');
          break;
        }

        for (const item of pageResults) {
          if (resultsCount >= maxResults || this.shouldStop) break;
          if (seenUrls.has(item.linkedin_url)) continue;
          seenUrls.add(item.linkedin_url);

          if (data.searchType === 'people') {
            const person = this.parseGooglePersonResult(item, jobId, data.location);
            if (person) {
              onResult(person);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${person.name}`);
            }
          } else {
            const company = this.parseGoogleCompanyResult(item, jobId);
            if (company) {
              onResult(company);
              resultsCount++;
              onProgress(`✓ Found (${resultsCount}/${maxResults}): ${company.name}`);
            }
          }
        }

        // Check for next page
        const nextButton = await page.$('a#pnnext');
        if (!nextButton) {
          onProgress('Reached last page of results');
          break;
        }

        startIndex += 10;
        await page.waitForTimeout(2000 + Math.random() * 3000);

      } catch (error) {
        onProgress(`Error on page ${startIndex / 10 + 1}: ${(error as Error).message}`);
        await page.waitForTimeout(5000);
      }
    }

    onProgress(`✅ Completed! Found ${resultsCount} ${data.searchType}`);
  }

  private parseGooglePersonResult(
    item: { linkedin_url: string; title: string; snippet: string },
    jobId: string,
    defaultLocation?: string
  ): PersonResult | null {
    const title = item.title || '';
    const snippet = item.snippet || '';

    // Parse: "Name - Title - Company | LinkedIn"
    const titleParts = title.replace(' | LinkedIn', '').split(' - ');
    const name = titleParts[0]?.trim() || '';
    if (!name || name.toLowerCase().includes('linkedin')) return null;

    const headline = titleParts[1]?.trim() || '';
    const company = titleParts[2]?.trim() || '';

    let location = defaultLocation || '';
    const locationMatch = snippet.match(/(?:Location|Based in|Located in)[:\s]+([^·.]+)/i);
    if (locationMatch) location = locationMatch[1].trim();

    return {
      input_id: jobId,
      name,
      headline,
      location,
      profile_url: item.linkedin_url,
      company: company !== headline ? company : '',
      connection_degree: '',
      profile_image_url: '',
      scrape_mode: 'google',
    };
  }

  private parseGoogleCompanyResult(
    item: { linkedin_url: string; title: string; snippet: string },
    jobId: string
  ): CompanyResult | null {
    const title = item.title || '';
    const snippet = item.snippet || '';

    const name = title.replace(' | LinkedIn', '').trim();
    if (!name || name.toLowerCase().includes('linkedin')) return null;

    let industry = '';
    let employeeCount = '';
    let location = '';

    const industryMatch = snippet.match(/Industry[:\s]+([^·\n]+)/i);
    if (industryMatch) industry = industryMatch[1].trim();

    const employeesMatch = snippet.match(/(\d+[\d,]*(?:\+)?)\s*(?:employees|followers)/i);
    if (employeesMatch) employeeCount = employeesMatch[1];

    const locationMatch = snippet.match(/(?:Location|Headquarters)[:\s]+([^·\n]+)/i);
    if (locationMatch) location = locationMatch[1].trim();

    return {
      input_id: jobId,
      name,
      industry,
      location,
      company_url: item.linkedin_url,
      employee_count: employeeCount,
      description: snippet.substring(0, 300),
      logo_url: '',
      scrape_mode: 'google',
    };
  }

  // ============================================
  // LOGIN-BASED AUTHENTICATION
  // ============================================

  private async ensureLoggedIn(
    page: Page,
    context: BrowserContext,
    data: LinkedInJobData,
    onProgress: (message: string) => void
  ): Promise<boolean> {
    // Try to restore session first
    const restored = await this.restoreSession(context);
    
    if (restored) {
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      if (await this.isLoggedIn(page)) {
        onProgress('Session restored');
        return true;
      }
    }
    
    // Need to login - check for credentials
    const email = data.email || process.env.LINKEDIN_EMAIL;
    const password = data.password || process.env.LINKEDIN_PASSWORD;
    
    if (!email || !password) {
      onProgress('No LinkedIn credentials. Please login via Integrations page first.');
      return false;
    }
    
    return await this.login(page, email, password, onProgress);
  }

  private async isLoggedIn(page: Page): Promise<boolean> {
    try {
      const feedSelector = 'div[data-view-name="feed-container"], .feed-shared-update-v2, nav.global-nav';
      const loginSelector = 'form.login__form, a[data-tracking-control-name="guest_homepage-basic_sign-in-button"]';
      
      const [hasFeed, hasLogin] = await Promise.all([
        page.locator(feedSelector).first().isVisible({ timeout: 3000 }).catch(() => false),
        page.locator(loginSelector).first().isVisible({ timeout: 1000 }).catch(() => false),
      ]);
      
      return hasFeed && !hasLogin;
    } catch {
      return false;
    }
  }

  private async login(
    page: Page,
    email: string,
    password: string,
    onProgress: (message: string) => void
  ): Promise<boolean> {
    try {
      onProgress('Logging in to LinkedIn...');
      
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      await page.fill('#username', email);
      await page.fill('#password', password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      if (page.url().includes('checkpoint') || page.url().includes('challenge')) {
        onProgress('LinkedIn security checkpoint detected - manual verification may be required');
        return false;
      }
      
      return await this.isLoggedIn(page);
    } catch (error) {
      onProgress(`Login error: ${(error as Error).message}`);
      return false;
    }
  }

  private async saveSession(context: BrowserContext): Promise<void> {
    try {
      const cookies = await context.cookies();
      const storage = await context.storageState();
      fs.writeFileSync(this.sessionPath, JSON.stringify({ cookies, storage }));
    } catch { /* ignore */ }
  }

  private async restoreSession(context: BrowserContext): Promise<boolean> {
    try {
      if (!fs.existsSync(this.sessionPath)) return false;
      
      const data = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
      if (data.cookies) {
        await context.addCookies(data.cookies);
      }
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // LOGIN-BASED PEOPLE SEARCH
  // ============================================

  private async searchPeople(
    page: Page,
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: PersonResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    const params = new URLSearchParams({
      keywords: data.keywords,
      origin: 'GLOBAL_SEARCH_HEADER',
    });
    
    if (data.location) {
      params.set('geoUrn', data.location);
    }
    
    const searchUrl = `https://www.linkedin.com/search/results/people/?${params.toString()}`;
    
    onProgress(`Searching for people: ${data.keywords}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    let resultsCount = 0;
    let pageNum = 1;
    
    while (resultsCount < maxResults && !this.shouldStop) {
      onProgress(`Processing page ${pageNum}...`);
      
      await this.scrollPage(page);
      const people = await this.extractPeopleFromPage(page, jobId);
      
      for (const person of people) {
        if (this.shouldStop || resultsCount >= maxResults) break;
        
        onResult(person);
        resultsCount++;
        onProgress(`Found ${resultsCount}/${maxResults}: ${person.name}`);
      }
      
      if (resultsCount < maxResults) {
        const hasNext = await this.goToNextPage(page);
        if (!hasNext) break;
        pageNum++;
        await page.waitForTimeout(2000);
      }
    }
    
    onProgress(`Completed: Found ${resultsCount} people`);
  }

  private async extractPeopleFromPage(page: Page, jobId: string): Promise<PersonResult[]> {
    return await page.evaluate((inputId) => {
      const results: PersonResult[] = [];
      const items = document.querySelectorAll('.reusable-search__result-container');
      
      items.forEach((item) => {
        try {
          const nameLink = item.querySelector('a.app-aware-link span[aria-hidden="true"]');
          const profileLink = item.querySelector('a.app-aware-link[href*="/in/"]') as HTMLAnchorElement;
          
          const name = nameLink?.textContent?.trim() || '';
          const profileUrl = profileLink?.href?.split('?')[0] || '';
          
          if (!name || !profileUrl) return;
          
          const headlineEl = item.querySelector('.entity-result__primary-subtitle');
          const headline = headlineEl?.textContent?.trim() || '';
          
          const locationEl = item.querySelector('.entity-result__secondary-subtitle');
          const location = locationEl?.textContent?.trim() || '';
          
          const degreeEl = item.querySelector('.entity-result__badge-text');
          const connectionDegree = degreeEl?.textContent?.trim() || '';
          
          let company = '';
          if (headline.includes(' at ')) {
            company = headline.split(' at ').pop()?.trim() || '';
          } else if (headline.includes(' @ ')) {
            company = headline.split(' @ ').pop()?.trim() || '';
          }
          
          const img = item.querySelector('img.presence-entity__image') as HTMLImageElement;
          const profileImageUrl = img?.src || '';
          
          results.push({
            input_id: inputId,
            name,
            headline,
            location,
            profile_url: profileUrl,
            company,
            connection_degree: connectionDegree,
            profile_image_url: profileImageUrl,
            scrape_mode: 'login',
          });
        } catch { /* skip */ }
      });
      
      return results;
    }, jobId);
  }

  // ============================================
  // LOGIN-BASED COMPANY SEARCH
  // ============================================

  private async searchCompanies(
    page: Page,
    jobId: string,
    data: LinkedInJobData,
    maxResults: number,
    onResult: (result: CompanyResult) => void,
    onProgress: (message: string) => void
  ): Promise<void> {
    const params = new URLSearchParams({
      keywords: data.keywords,
      origin: 'GLOBAL_SEARCH_HEADER',
    });
    
    const searchUrl = `https://www.linkedin.com/search/results/companies/?${params.toString()}`;
    
    onProgress(`Searching for companies: ${data.keywords}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    let resultsCount = 0;
    let pageNum = 1;
    
    while (resultsCount < maxResults && !this.shouldStop) {
      onProgress(`Processing page ${pageNum}...`);
      
      await this.scrollPage(page);
      const companies = await this.extractCompaniesFromPage(page, jobId);
      
      for (const company of companies) {
        if (this.shouldStop || resultsCount >= maxResults) break;
        
        onResult(company);
        resultsCount++;
        onProgress(`Found ${resultsCount}/${maxResults}: ${company.name}`);
      }
      
      if (resultsCount < maxResults) {
        const hasNext = await this.goToNextPage(page);
        if (!hasNext) break;
        pageNum++;
        await page.waitForTimeout(2000);
      }
    }
    
    onProgress(`Completed: Found ${resultsCount} companies`);
  }

  private async extractCompaniesFromPage(page: Page, jobId: string): Promise<CompanyResult[]> {
    return await page.evaluate((inputId) => {
      const results: CompanyResult[] = [];
      const items = document.querySelectorAll('.reusable-search__result-container');
      
      items.forEach((item) => {
        try {
          const nameLink = item.querySelector('a.app-aware-link span[aria-hidden="true"]');
          const companyLink = item.querySelector('a.app-aware-link[href*="/company/"]') as HTMLAnchorElement;
          
          const name = nameLink?.textContent?.trim() || '';
          const companyUrl = companyLink?.href?.split('?')[0] || '';
          
          if (!name || !companyUrl) return;
          
          const industryEl = item.querySelector('.entity-result__primary-subtitle');
          const industry = industryEl?.textContent?.trim() || '';
          
          const secondaryEl = item.querySelector('.entity-result__secondary-subtitle');
          const secondaryText = secondaryEl?.textContent?.trim() || '';
          
          let location = '';
          let employeeCount = '';
          
          if (secondaryText.includes('•')) {
            const parts = secondaryText.split('•').map(s => s.trim());
            location = parts[0] || '';
            employeeCount = parts[1] || '';
          } else {
            location = secondaryText;
          }
          
          const descEl = item.querySelector('.entity-result__summary');
          const description = descEl?.textContent?.trim() || '';
          
          const logo = item.querySelector('img.presence-entity__image, img.EntityPhoto-square-3') as HTMLImageElement;
          const logoUrl = logo?.src || '';
          
          results.push({
            input_id: inputId,
            name,
            industry,
            location,
            company_url: companyUrl,
            employee_count: employeeCount,
            description,
            logo_url: logoUrl,
            scrape_mode: 'login',
          });
        } catch { /* skip */ }
      });
      
      return results;
    }, jobId);
  }

  // ============================================
  // HELPERS
  // ============================================

  private async scrollPage(page: Page): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(500);
    }
  }

  private async goToNextPage(page: Page): Promise<boolean> {
    try {
      const nextBtn = page.locator('button[aria-label="Next"]');
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        return true;
      }
    } catch { /* no next page */ }
    return false;
  }
}
