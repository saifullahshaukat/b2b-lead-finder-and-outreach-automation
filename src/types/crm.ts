// Core CRM Types

export type FieldType = 'text' | 'number' | 'date' | 'email' | 'phone' | 'url' | 'boolean' | 'dropdown';

export interface CustomField {
  id: string;
  name: string;
  key: string;
  type: FieldType;
  options?: string[]; // For dropdown type
  required?: boolean;
  createdAt: Date;
}

export type LeadStatus = 'new' | 'contacted' | 'replied' | 'qualified' | 'closed' | 'lost';
export type LeadSource = 'google_maps' | 'linkedin' | 'csv' | 'website' | 'api' | 'manual';

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  website?: string;
  linkedinUrl?: string;
  status: LeadStatus;
  source: LeadSource;
  sourceDetails?: string;
  tags: string[];
  notes: Note[];
  customFields: Record<string, any>;
  outreachHistory: OutreachEvent[];
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
}

export interface Note {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: string;
}

export interface OutreachEvent {
  id: string;
  channel: OutreachChannel;
  type: 'sent' | 'received' | 'opened' | 'clicked' | 'replied' | 'bounced';
  subject?: string;
  content?: string;
  templateId?: string;
  sequenceId?: string;
  createdAt: Date;
}

export type OutreachChannel = 'email' | 'sms' | 'whatsapp' | 'linkedin' | 'call' | 'form';

export interface OutreachTemplate {
  id: string;
  name: string;
  channel: OutreachChannel;
  subject?: string;
  content: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OutreachSequence {
  id: string;
  name: string;
  channel: OutreachChannel;
  steps: SequenceStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SequenceStep {
  id: string;
  order: number;
  templateId: string;
  delayDays: number;
  delayHours: number;
}

export interface SavedView {
  id: string;
  name: string;
  filters: FilterCondition[];
  columns: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDefault?: boolean;
  createdAt: Date;
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface Conversation {
  id: string;
  leadId: string;
  channel: OutreachChannel;
  messages: Message[];
  status: 'open' | 'replied' | 'closed';
  lastMessageAt: Date;
  createdAt: Date;
}

export interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  subject?: string;
  createdAt: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface LeadSourceConfig {
  id: string;
  type: LeadSource;
  name: string;
  config: Record<string, any>;
  fieldMapping: FieldMapping[];
  isActive: boolean;
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'error' | 'running';
  leadsImported: number;
  createdAt: Date;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  isCustomField: boolean;
}

export interface Integration {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'voice';
  provider: string;
  name: string;
  isConnected: boolean;
  config: Record<string, any>;
  lastTestedAt?: Date;
  createdAt: Date;
}

// Workflow Types
export type WorkflowNodeType = 
  | 'trigger_new_lead'
  | 'trigger_csv_import'
  | 'trigger_manual'
  | 'trigger_webhook'
  | 'action_email'
  | 'action_sms'
  | 'action_whatsapp'
  | 'action_linkedin'
  | 'action_call'
  | 'action_update_field'
  | 'action_add_tag'
  | 'action_update_status'
  | 'logic_delay'
  | 'logic_condition'
  | 'logic_filter'
  | 'logic_split';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  stats: {
    leadsProcessed: number;
    conversions: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
