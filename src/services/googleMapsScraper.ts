// Unified Scraper API Service
// This service communicates with the integrated Node.js backend

const API_BASE = 'http://localhost:3001/api/v1';

export type ScraperType = 'google_maps' | 'linkedin' | 'csv' | 'website' | 'api';

export interface ScraperJobData {
  // Google Maps fields
  businessTypes?: string[];
  location?: string;
  maxResults?: number;
  extractEmail?: boolean;
  lang?: string;
  // LinkedIn fields
  scrapeMode?: 'google' | 'login';
  searchType?: 'people' | 'companies';
  keywords?: string;
}

export interface ScraperJob {
  ID: string;
  Name: string;
  Type: ScraperType;
  Status: 'pending' | 'working' | 'ok' | 'failed';
  Data: ScraperJobData;
  ResultsCount: number;
  Error: string | null;
  Date: string;
  UpdatedAt: string;
  CompletedAt: string | null;
}

export interface CreateJobRequest {
  name: string;
  type: ScraperType;
  // Google Maps specific
  businessTypes?: string[];
  location?: string;
  maxResults?: number;
  extractEmail?: boolean;
  lang?: string;
  // LinkedIn specific
  scrapeMode?: 'google' | 'login';
  searchType?: 'people' | 'companies';
  keywords?: string;
  email?: string;
  password?: string;
  // Tags to apply to imported leads
  tags?: string[];
}

export interface CreateJobResponse {
  id: string;
}

export interface ApiError {
  code: number;
  message: string;
}

export interface ScrapedPlace {
  input_id: string;
  title: string;
  category: string;
  categories: string[];
  address: string;
  phone: string;
  website: string;
  rating: number;
  review_count: number;
  latitude: number;
  longitude: number;
  place_id: string;
  google_maps_url: string;
  opening_hours: Record<string, string[]>;
  emails: string[];
  plus_code: string;
  price_range: string;
}

class ScraperService {
  async createJob(request: CreateJobRequest): Promise<CreateJobResponse> {
    const response = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || 'Failed to create job');
    }

    return response.json();
  }

  async getJobs(type?: ScraperType): Promise<ScraperJob[]> {
    const url = type ? `${API_BASE}/jobs?type=${type}` : `${API_BASE}/jobs`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || 'Failed to fetch jobs');
    }

    return response.json();
  }

  async getJob(id: string): Promise<ScraperJob> {
    const response = await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || 'Failed to fetch job');
    }

    return response.json();
  }

  async deleteJob(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || 'Failed to delete job');
    }
  }

  async getJobResults(id: string): Promise<ScrapedPlace[]> {
    const response = await fetch(`${API_BASE}/jobs/${id}/results`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch results');
    }

    const results = await response.json();
    return results.map((r: { data: ScrapedPlace }) => r.data);
  }

  async downloadJobResults(id: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/jobs/${id}/download`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to download results');
    }

    return response.blob();
  }

  getDownloadUrl(id: string): string {
    return `${API_BASE}/jobs/${id}/download`;
  }

  async getAvailableScrapers(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/scrapers`, {
      method: 'GET',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const scraperService = new ScraperService();
export default scraperService;
