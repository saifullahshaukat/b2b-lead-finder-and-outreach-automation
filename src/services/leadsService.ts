// Leads API Service

const API_BASE = 'http://localhost:3001/api/v1';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: 'new' | 'contacted' | 'replied' | 'qualified' | 'closed' | 'lost';
  source: 'google_maps' | 'linkedin' | 'csv' | 'website' | 'api' | 'manual';
  sourceDetails: string;
  tags: string[];
  customFields: Record<string, unknown>;
  latitude: number;
  longitude: number;
  placeId: string;
  googleMapsUrl: string;
  linkedinUrl: string;
  rating: number;
  reviewCount: number;
  categories: string[];
  createdAt: string;
  updatedAt: string;
  lastContactedAt: string | null;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
}

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  replied: number;
  qualified: number;
  closed: number;
  lost: number;
  from_google_maps: number;
  from_linkedin: number;
  from_csv: number;
}

class LeadsService {
  async getLeads(params?: {
    status?: string;
    source?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<LeadsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    const response = await fetch(`${API_BASE}/leads?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch leads');
    }
    return response.json();
  }

  async getLead(id: string): Promise<Lead> {
    const response = await fetch(`${API_BASE}/leads/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch lead');
    }
    return response.json();
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const response = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update lead');
    }
    return response.json();
  }

  async deleteLead(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete lead');
    }
  }

  async bulkDelete(ids: string[]): Promise<{ deleted: number }> {
    const response = await fetch(`${API_BASE}/leads/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
      throw new Error('Failed to delete leads');
    }
    return response.json();
  }

  async bulkUpdateStatus(ids: string[], status: string): Promise<{ updated: number }> {
    const response = await fetch(`${API_BASE}/leads/bulk-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status }),
    });
    if (!response.ok) {
      throw new Error('Failed to update leads');
    }
    return response.json();
  }

  async getStats(): Promise<LeadStats> {
    const response = await fetch(`${API_BASE}/leads/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    return response.json();
  }

  async importFromJob(jobId: string): Promise<{ imported: number; total: number }> {
    const response = await fetch(`${API_BASE}/jobs/${jobId}/import`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to import leads');
    }
    return response.json();
  }

  // Notes API
  async getNotes(leadId: string): Promise<Note[]> {
    const response = await fetch(`${API_BASE}/leads/${leadId}/notes`);
    if (!response.ok) {
      throw new Error('Failed to fetch notes');
    }
    return response.json();
  }

  async addNote(leadId: string, content: string): Promise<Note> {
    const response = await fetch(`${API_BASE}/leads/${leadId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error('Failed to add note');
    }
    return response.json();
  }

  async deleteNote(leadId: string, noteId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/leads/${leadId}/notes/${noteId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete note');
    }
  }

  // Tags API
  async getAllTags(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/tags`);
    if (!response.ok) {
      throw new Error('Failed to fetch tags');
    }
    return response.json();
  }

  async addTags(leadId: string, tags: string[]): Promise<Lead> {
    const response = await fetch(`${API_BASE}/leads/${leadId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    if (!response.ok) {
      throw new Error('Failed to add tags');
    }
    return response.json();
  }

  async removeTag(leadId: string, tag: string): Promise<Lead> {
    const response = await fetch(`${API_BASE}/leads/${leadId}/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to remove tag');
    }
    return response.json();
  }

  // Location suggestions
  async getLocationSuggestions(query: string): Promise<string[]> {
    const response = await fetch(`${API_BASE}/locations/suggest?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch location suggestions');
    }
    return response.json();
  }

  // Keyword suggestions
  async getKeywordSuggestions(query: string): Promise<string[]> {
    const response = await fetch(`${API_BASE}/keywords/suggest?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch keyword suggestions');
    }
    return response.json();
  }
}

export interface Note {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export const leadsService = new LeadsService();
export default leadsService;
