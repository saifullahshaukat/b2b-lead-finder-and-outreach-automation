-- OutreachCRM PostgreSQL Schema
-- Run this file to create all necessary tables
-- Usage: psql -U postgres -d outreach_crm -f schema.sql

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================
-- ENUM TYPES
-- ============================================

-- Lead status
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'replied', 'qualified', 'closed', 'lost');

-- Lead source types
CREATE TYPE lead_source AS ENUM ('google_maps', 'linkedin', 'csv', 'website', 'api', 'manual');

-- Outreach channels
CREATE TYPE outreach_channel AS ENUM ('email', 'sms', 'whatsapp', 'linkedin', 'call', 'form');

-- Outreach event types
CREATE TYPE outreach_event_type AS ENUM ('sent', 'received', 'opened', 'clicked', 'replied', 'bounced');

-- Message direction
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');

-- Message status
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');

-- Conversation status
CREATE TYPE conversation_status AS ENUM ('open', 'replied', 'closed');

-- Scraper job status
CREATE TYPE job_status AS ENUM ('pending', 'working', 'ok', 'failed');

-- Integration types
CREATE TYPE integration_type AS ENUM ('email', 'sms', 'whatsapp', 'voice');

-- Custom field types
CREATE TYPE field_type AS ENUM ('text', 'number', 'date', 'email', 'phone', 'url', 'boolean', 'dropdown');

-- ============================================
-- SCRAPER TABLES (Core functionality)
-- ============================================

-- Scraper Jobs
CREATE TABLE scraper_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'google_maps', 'linkedin', etc.
    status job_status NOT NULL DEFAULT 'pending',
    data JSONB NOT NULL DEFAULT '{}', -- Job configuration (keywords, depth, etc.)
    results_count INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster status queries
CREATE INDEX idx_scraper_jobs_status ON scraper_jobs(status);
CREATE INDEX idx_scraper_jobs_type ON scraper_jobs(type);
CREATE INDEX idx_scraper_jobs_created_at ON scraper_jobs(created_at DESC);

-- Scraper Results (raw scraped data)
CREATE TABLE scraper_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES scraper_jobs(id) ON DELETE CASCADE,
    data JSONB NOT NULL, -- The scraped data (title, phone, email, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scraper_results_job_id ON scraper_results(job_id);

-- ============================================
-- CRM CORE TABLES
-- ============================================

-- Custom Fields Definition
CREATE TABLE custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    key VARCHAR(100) NOT NULL UNIQUE,
    type field_type NOT NULL DEFAULT 'text',
    options JSONB, -- For dropdown type: ["option1", "option2"]
    required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    job_title VARCHAR(255),
    website VARCHAR(500),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    status lead_status NOT NULL DEFAULT 'new',
    source lead_source NOT NULL,
    source_details VARCHAR(255), -- e.g., job_id for scraped leads
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    
    -- Google Maps specific fields (when source = google_maps)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    place_id VARCHAR(255),
    google_maps_url TEXT,
    rating DECIMAL(2, 1),
    review_count INTEGER,
    categories TEXT[],
    opening_hours JSONB,
    price_range VARCHAR(10),
    plus_code VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_contacted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for leads
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_company ON leads(company);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);
CREATE INDEX idx_leads_custom_fields ON leads USING GIN(custom_fields);
CREATE INDEX idx_leads_full_text ON leads USING GIN(
    to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(company, '') || ' ' || COALESCE(email, ''))
);

-- Lead Notes
CREATE TABLE lead_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lead_notes_lead_id ON lead_notes(lead_id);

-- ============================================
-- OUTREACH TABLES
-- ============================================

-- Outreach Templates
CREATE TABLE outreach_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    channel outreach_channel NOT NULL,
    subject VARCHAR(500),
    content TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}', -- e.g., ["firstName", "company"]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_outreach_templates_channel ON outreach_templates(channel);

-- Outreach Sequences
CREATE TABLE outreach_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    channel outreach_channel NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sequence Steps
CREATE TABLE sequence_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES outreach_sequences(id) ON DELETE CASCADE,
    template_id UUID REFERENCES outreach_templates(id) ON DELETE SET NULL,
    step_order INTEGER NOT NULL,
    delay_days INTEGER DEFAULT 0,
    delay_hours INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sequence_steps_sequence_id ON sequence_steps(sequence_id);

-- Outreach Events (tracking sent messages, opens, clicks, etc.)
CREATE TABLE outreach_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    channel outreach_channel NOT NULL,
    event_type outreach_event_type NOT NULL,
    subject VARCHAR(500),
    content TEXT,
    template_id UUID REFERENCES outreach_templates(id) ON DELETE SET NULL,
    sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_outreach_events_lead_id ON outreach_events(lead_id);
CREATE INDEX idx_outreach_events_created_at ON outreach_events(created_at DESC);

-- ============================================
-- EMAIL OUTREACH TABLES
-- ============================================

-- Email Credentials (SMTP settings)
CREATE TABLE email_credentials (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    smtp_server VARCHAR(255) NOT NULL DEFAULT 'smtp.gmail.com',
    smtp_port INTEGER NOT NULL DEFAULT 587,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Outreach Queue
CREATE TABLE email_outreach (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    subject VARCHAR(500),
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_outreach_status ON email_outreach(status);
CREATE INDEX idx_email_outreach_email ON email_outreach(email);
CREATE INDEX idx_email_outreach_created_at ON email_outreach(created_at DESC);

-- ============================================
-- WEB FORM OUTREACH TABLES
-- ============================================

-- Web Form Outreach Configuration
CREATE TABLE webform_config (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(255),
    company VARCHAR(255),
    subject VARCHAR(500),
    message TEXT,
    delay_between_requests INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Web Form Outreach Jobs
CREATE TABLE webform_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    form_found BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webform_jobs_status ON webform_jobs(status);
CREATE INDEX idx_webform_jobs_created_at ON webform_jobs(created_at DESC);

-- Trigger for webform_jobs updated_at
CREATE TRIGGER update_webform_jobs_updated_at
    BEFORE UPDATE ON webform_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for webform_config updated_at
CREATE TRIGGER update_webform_config_updated_at
    BEFORE UPDATE ON webform_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INBOX / CONVERSATIONS
-- ============================================

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    channel outreach_channel NOT NULL,
    status conversation_status NOT NULL DEFAULT 'open',
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX idx_conversations_status ON conversations(status);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction message_direction NOT NULL,
    content TEXT NOT NULL,
    subject VARCHAR(500),
    status message_status NOT NULL DEFAULT 'sent',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- ============================================
-- LEAD SOURCE CONFIGURATIONS
-- ============================================

CREATE TABLE lead_source_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type lead_source NOT NULL,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}', -- Source-specific configuration
    field_mapping JSONB DEFAULT '[]', -- Array of {sourceField, targetField, isCustomField}
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_status VARCHAR(20), -- 'success', 'error', 'running'
    leads_imported INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INTEGRATIONS
-- ============================================

CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type integration_type NOT NULL,
    provider VARCHAR(100) NOT NULL, -- e.g., 'sendgrid', 'twilio', 'mailgun'
    name VARCHAR(255) NOT NULL,
    is_connected BOOLEAN DEFAULT FALSE,
    config JSONB DEFAULT '{}', -- Encrypted API keys, settings
    last_tested_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EMAIL CREDENTIALS
-- ============================================

CREATE TABLE email_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(500) NOT NULL,
    smtp_server VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EMAIL TEMPLATES
-- ============================================

-- Already exists in outreach_templates, but adding specific email template support

-- ============================================
-- EMAIL OUTREACH
-- ============================================

CREATE TABLE email_outreach (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    subject VARCHAR(500),
    message TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, failed
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_outreach_status ON email_outreach(status);
CREATE INDEX idx_email_outreach_lead_id ON email_outreach(lead_id);
CREATE INDEX idx_email_outreach_created_at ON email_outreach(created_at DESC);

-- ============================================
-- SAVED VIEWS
-- ============================================

CREATE TABLE saved_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    filters JSONB DEFAULT '[]', -- Array of filter conditions
    columns TEXT[] DEFAULT '{}',
    sort_by VARCHAR(100),
    sort_order VARCHAR(4) DEFAULT 'asc',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WORKFLOWS
-- ============================================

CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]', -- Workflow node definitions
    edges JSONB NOT NULL DEFAULT '[]', -- Connections between nodes
    is_active BOOLEAN DEFAULT FALSE,
    leads_processed INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_scraper_jobs_updated_at
    BEFORE UPDATE ON scraper_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outreach_templates_updated_at
    BEFORE UPDATE ON outreach_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outreach_sequences_updated_at
    BEFORE UPDATE ON outreach_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - remove in production)
-- ============================================

-- Insert default saved view
INSERT INTO saved_views (id, name, columns, is_default) VALUES 
(uuid_generate_v4(), 'All Leads', ARRAY['firstName', 'lastName', 'email', 'company', 'status', 'source', 'createdAt'], TRUE);

-- ============================================
-- GRANTS (adjust user as needed)
-- ============================================

-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
