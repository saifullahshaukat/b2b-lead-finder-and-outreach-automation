import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import scraperService, { CreateJobRequest, ScraperJob, ScraperType } from '@/services/googleMapsScraper';
import { useToast } from '@/hooks/use-toast';

export function useScraperJobs(type?: ScraperType) {
  return useQuery<ScraperJob[], Error>({
    queryKey: ['scraperJobs', type],
    queryFn: () => scraperService.getJobs(type),
    refetchInterval: 5000, // Poll every 5 seconds to check job status
    retry: 1,
  });
}

export function useScraperJob(id: string) {
  return useQuery<ScraperJob, Error>({
    queryKey: ['scraperJob', id],
    queryFn: () => scraperService.getJob(id),
    enabled: !!id,
    refetchInterval: (query) => {
      // Stop polling when job is complete or failed
      const status = query.state.data?.Status;
      if (status === 'ok' || status === 'failed') {
        return false;
      }
      return 3000; // Poll every 3 seconds while in progress
    },
  });
}

export function useCreateScraperJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: CreateJobRequest) => scraperService.createJob(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scraperJobs'] });
      toast({
        title: 'Scraping job created',
        description: `Job ID: ${data.id}. The scraper is now running.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create job',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteScraperJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => scraperService.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraperJobs'] });
      toast({
        title: 'Job deleted',
        description: 'The scraping job has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete job',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDownloadJobResults() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const blob = await scraperService.downloadJobResults(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}_results.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: 'Download started',
        description: 'Your results are being downloaded.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useScraperHealth() {
  return useQuery({
    queryKey: ['scraperHealth'],
    queryFn: () => scraperService.healthCheck(),
    refetchInterval: 10000, // Check every 10 seconds
    retry: false,
  });
}
