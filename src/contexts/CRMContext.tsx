import React, { createContext, useContext, useState, useCallback } from 'react';
import { Lead, SavedView, CustomField, OutreachTemplate, Workflow, LeadSourceConfig, Integration, Conversation } from '@/types/crm';
import { mockLeads, mockSavedViews, mockCustomFields, mockTemplates, mockWorkflows, mockLeadSources, mockIntegrations, mockConversations } from '@/data/mockData';

interface CRMContextType {
  // Leads
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  selectedLeadIds: string[];
  setSelectedLeadIds: React.Dispatch<React.SetStateAction<string[]>>;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  addLead: (lead: Lead) => void;
  
  // Views
  savedViews: SavedView[];
  activeViewId: string;
  setActiveViewId: (id: string) => void;
  
  // Custom Fields
  customFields: CustomField[];
  addCustomField: (field: CustomField) => void;
  
  // Templates
  templates: OutreachTemplate[];
  
  // Workflows
  workflows: Workflow[];
  
  // Lead Sources
  leadSources: LeadSourceConfig[];
  
  // Integrations
  integrations: Integration[];
  
  // Conversations
  conversations: Conversation[];
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [savedViews] = useState<SavedView[]>(mockSavedViews);
  const [activeViewId, setActiveViewId] = useState<string>('v1');
  const [customFields, setCustomFields] = useState<CustomField[]>(mockCustomFields);
  const [templates] = useState<OutreachTemplate[]>(mockTemplates);
  const [workflows] = useState<Workflow[]>(mockWorkflows);
  const [leadSources] = useState<LeadSourceConfig[]>(mockLeadSources);
  const [integrations] = useState<Integration[]>(mockIntegrations);
  const [conversations] = useState<Conversation[]>(mockConversations);

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, ...updates, updatedAt: new Date() } : lead
    ));
  }, []);

  const deleteLead = useCallback((id: string) => {
    setLeads(prev => prev.filter(lead => lead.id !== id));
    setSelectedLeadIds(prev => prev.filter(selectedId => selectedId !== id));
  }, []);

  const addLead = useCallback((lead: Lead) => {
    setLeads(prev => [lead, ...prev]);
  }, []);

  const addCustomField = useCallback((field: CustomField) => {
    setCustomFields(prev => [...prev, field]);
  }, []);

  return (
    <CRMContext.Provider value={{
      leads,
      setLeads,
      selectedLeadIds,
      setSelectedLeadIds,
      updateLead,
      deleteLead,
      addLead,
      savedViews,
      activeViewId,
      setActiveViewId,
      customFields,
      addCustomField,
      templates,
      workflows,
      leadSources,
      integrations,
      conversations,
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (context === undefined) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
}
