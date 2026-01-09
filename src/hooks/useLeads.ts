import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import leadsService, { Lead, Note } from '@/services/leadsService';
import { useToast } from '@/hooks/use-toast';

export function useLeads(params?: {
  status?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => leadsService.getLeads(params),
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsService.getLead(id),
    enabled: !!id,
  });
}

export function useLeadStats() {
  return useQuery({
    queryKey: ['leadStats'],
    queryFn: () => leadsService.getStats(),
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Lead> }) =>
      leadsService.updateLead(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leadStats'] });
      toast({ title: 'Lead updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update lead', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => leadsService.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leadStats'] });
      toast({ title: 'Lead deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete lead', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (ids: string[]) => leadsService.bulkDelete(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leadStats'] });
      toast({ title: `${data.deleted} leads deleted` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete leads', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      leadsService.bulkUpdateStatus(ids, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leadStats'] });
      toast({ title: `${data.updated} leads updated` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update leads', description: error.message, variant: 'destructive' });
    },
  });
}

export function useImportFromJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (jobId: string) => leadsService.importFromJob(jobId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leadStats'] });
      toast({ title: `Imported ${data.imported} of ${data.total} leads` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to import leads', description: error.message, variant: 'destructive' });
    },
  });
}

// ============================================
// NOTES HOOKS
// ============================================

export function useLeadNotes(leadId: string) {
  return useQuery({
    queryKey: ['leadNotes', leadId],
    queryFn: () => leadsService.getNotes(leadId),
    enabled: !!leadId,
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ leadId, content }: { leadId: string; content: string }) =>
      leadsService.addNote(leadId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leadNotes', variables.leadId] });
      toast({ title: 'Note added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add note', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ leadId, noteId }: { leadId: string; noteId: string }) =>
      leadsService.deleteNote(leadId, noteId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leadNotes', variables.leadId] });
      toast({ title: 'Note deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete note', description: error.message, variant: 'destructive' });
    },
  });
}

// ============================================
// TAGS HOOKS
// ============================================

export function useAllTags() {
  return useQuery({
    queryKey: ['allTags'],
    queryFn: () => leadsService.getAllTags(),
  });
}

export function useAddTags() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ leadId, tags }: { leadId: string; tags: string[] }) =>
      leadsService.addTags(leadId, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['allTags'] });
      toast({ title: 'Tags added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add tags', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ leadId, tag }: { leadId: string; tag: string }) =>
      leadsService.removeTag(leadId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['allTags'] });
      toast({ title: 'Tag removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove tag', description: error.message, variant: 'destructive' });
    },
  });
}

// ============================================
// SUGGESTIONS HOOKS
// ============================================

export function useLocationSuggestions(query: string) {
  return useQuery({
    queryKey: ['locationSuggestions', query],
    queryFn: () => leadsService.getLocationSuggestions(query),
    enabled: query.length >= 2,
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useKeywordSuggestions(query: string) {
  return useQuery({
    queryKey: ['keywordSuggestions', query],
    queryFn: () => leadsService.getKeywordSuggestions(query),
    enabled: query.length >= 2,
    staleTime: 60000, // Cache for 1 minute
  });
}
