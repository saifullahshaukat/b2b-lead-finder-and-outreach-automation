import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Trash2, Globe, Settings, Users,
  CheckCircle, XCircle, Clock, Loader2, RefreshCw,
  Play, Square, AlertCircle, Check, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const API_BASE = 'http://localhost:3001/api/v1';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  website: string;
  email: string;
}

// Web Form Config hook
function useWebFormConfig() {
  return useQuery({
    queryKey: ['webform-config'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/webform-outreach/config`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
  });
}

// Web Form Jobs hook
function useWebFormJobs() {
  return useQuery({
    queryKey: ['webform-jobs'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/webform-outreach/jobs`);
      if (!response.ok) return { jobs: [], stats: { total: 0, pending: 0, submitted: 0, failed: 0 }, isRunning: false };
      return response.json();
    },
    refetchInterval: 2000,
  });
}

// Leads hook
function useLeads() {
  return useQuery({
    queryKey: ['leads-for-outreach'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/leads?limit=500`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.leads || data || [];
    },
  });
}

export default function WebFormOutreach() {
  const queryClient = useQueryClient();
  const [showAddUrlsDialog, setShowAddUrlsDialog] = useState(false);
  const [showLeadsDialog, setShowLeadsDialog] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [urlsInput, setUrlsInput] = useState('');
  const [configSaved, setConfigSaved] = useState(false);
  const [config, setConfig] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    subject: 'Business Inquiry',
    message: '',
    delayBetweenRequests: 3,
  });

  const { data: savedConfig, isLoading: configLoading } = useWebFormConfig();
  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useWebFormJobs();
  const { data: leads = [], isLoading: leadsLoading } = useLeads();

  // Load saved config into form
  useEffect(() => {
    if (savedConfig) {
      setConfig({
        firstName: savedConfig.firstName || '',
        lastName: savedConfig.lastName || '',
        email: savedConfig.email || '',
        phone: savedConfig.phone || '',
        company: savedConfig.company || '',
        subject: savedConfig.subject || 'Business Inquiry',
        message: savedConfig.message || '',
        delayBetweenRequests: savedConfig.delayBetweenRequests || 3,
      });
    }
  }, [savedConfig]);

  const jobs = jobsData?.jobs || [];
  const stats = jobsData?.stats || { total: 0, pending: 0, submitted: 0, failed: 0 };
  const isRunning = jobsData?.isRunning || false;

  // Filter leads with websites
  const leadsWithWebsites = leads.filter((lead: Lead) => lead.website);

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: typeof config) => {
      const response = await fetch(`${API_BASE}/webform-outreach/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save config');
      return response.json();
    },
    onSuccess: () => {
      setConfigSaved(true);
      toast.success('Configuration saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['webform-config'] });
      setTimeout(() => setConfigSaved(false), 3000);
    },
    onError: () => toast.error('Failed to save configuration'),
  });

  // Add URLs mutation
  const addUrlsMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const response = await fetch(`${API_BASE}/webform-outreach/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      if (!response.ok) throw new Error('Failed to add URLs');
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Added ${data.added} URLs to queue`);
      queryClient.invalidateQueries({ queryKey: ['webform-jobs'] });
      setShowAddUrlsDialog(false);
      setShowLeadsDialog(false);
      setUrlsInput('');
      setSelectedLeads([]);
    },
    onError: () => toast.error('Failed to add URLs'),
  });

  // Start outreach mutation
  const startOutreachMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/webform-outreach/start`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Web form outreach started');
      queryClient.invalidateQueries({ queryKey: ['webform-jobs'] });
    },
    onError: () => toast.error('Failed to start outreach'),
  });

  // Stop outreach mutation
  const stopOutreachMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/webform-outreach/stop`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to stop');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Stopping outreach...');
      queryClient.invalidateQueries({ queryKey: ['webform-jobs'] });
    },
    onError: () => toast.error('Failed to stop outreach'),
  });

  // Delete jobs mutation
  const deleteJobsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`${API_BASE}/webform-outreach/jobs/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Jobs deleted');
      queryClient.invalidateQueries({ queryKey: ['webform-jobs'] });
      setSelectedJobs([]);
    },
  });

  const handleAddUrls = () => {
    const urls = urlsInput.split('\n').map(u => u.trim()).filter(u => u);
    if (urls.length === 0) {
      toast.error('Please enter at least one URL');
      return;
    }
    addUrlsMutation.mutate(urls);
  };

  const handleAddLeads = () => {
    const urls = selectedLeads
      .map(id => {
        const lead = leadsWithWebsites.find((l: Lead) => l.id === id);
        return lead?.website;
      })
      .filter(Boolean) as string[];
    
    if (urls.length === 0) {
      toast.error('No websites found for selected leads');
      return;
    }
    addUrlsMutation.mutate(urls);
  };

  const toggleJobSelection = (id: string) => {
    setSelectedJobs(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleAllJobs = () => {
    if (selectedJobs.length === jobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(jobs.map((j: { id: string }) => j.id));
    }
  };

  const toggleLeadSelection = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleAllLeads = () => {
    if (selectedLeads.length === leadsWithWebsites.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leadsWithWebsites.map((l: Lead) => l.id));
    }
  };

  const progress = stats.total > 0 ? ((Number(stats.submitted) + Number(stats.failed)) / Number(stats.total)) * 100 : 0;

  return (
    <Tabs defaultValue="queue" className="space-y-6">
      <TabsList>
        <TabsTrigger value="queue">Outreach Queue</TabsTrigger>
        <TabsTrigger value="leads">Select Leads</TabsTrigger>
        <TabsTrigger value="config">Configuration</TabsTrigger>
      </TabsList>

      {/* Queue Tab */}
      <TabsContent value="queue" className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total URLs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.submitted}</p>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress bar when running */}
        {isRunning && (
          <Card className="border-blue-500/50 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="font-medium">Outreach in progress...</span>
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedJobs.length > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedJobs.length} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteJobsMutation.mutate(selectedJobs)}
                  disabled={deleteJobsMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchJobs()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddUrlsDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add URLs
            </Button>
            {isRunning ? (
              <Button 
                variant="destructive" 
                onClick={() => stopOutreachMutation.mutate()}
                disabled={stopOutreachMutation.isPending}
              >
                {stopOutreachMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-1" />
                )}
                Stop Outreach
              </Button>
            ) : (
              <Button 
                onClick={() => startOutreachMutation.mutate()}
                disabled={Number(stats.pending) === 0 || startOutreachMutation.isPending || !savedConfig?.email}
              >
                {startOutreachMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Start Outreach
              </Button>
            )}
          </div>
        </div>

        {/* Warning if no config */}
        {!savedConfig?.email && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium">Configuration Required</p>
                <p className="text-sm text-muted-foreground">
                  Please configure your contact details before starting outreach.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Jobs Table */}
        <Card>
          <CardContent className="p-0">
            {jobsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No URLs in queue</p>
                <p className="text-sm mb-4">Add website URLs or select leads to start</p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddUrlsDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add URLs
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowLeadsDialog(true)}>
                    <Users className="h-4 w-4 mr-1" />
                    Select from Leads
                  </Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedJobs.length === jobs.length && jobs.length > 0}
                        onCheckedChange={toggleAllJobs}
                      />
                    </TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Form Found</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job: { 
                    id: string; 
                    url: string; 
                    status: string; 
                    form_found: boolean;
                    created_at: string;
                    error_message?: string;
                  }) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedJobs.includes(job.id)}
                          onCheckedChange={() => toggleJobSelection(job.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
                          {job.url}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          job.status === 'submitted' ? 'default' :
                          job.status === 'failed' ? 'destructive' :
                          job.status === 'processing' ? 'secondary' : 'outline'
                        }>
                          {job.status === 'processing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.form_found ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : job.status !== 'pending' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {job.error_message || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add URLs Dialog */}
        <Dialog open={showAddUrlsDialog} onOpenChange={setShowAddUrlsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add URLs for Outreach</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Website URLs (one per line)</Label>
                <Textarea
                  value={urlsInput}
                  onChange={(e) => setUrlsInput(e.target.value)}
                  placeholder="https://example.com&#10;https://another-site.com"
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The bot will find contact forms on these websites automatically
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddUrlsDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUrls} disabled={addUrlsMutation.isPending}>
                {addUrlsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Add URLs
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Select Leads Dialog */}
        <Dialog open={showLeadsDialog} onOpenChange={setShowLeadsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Leads for Outreach</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {leadsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : leadsWithWebsites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leads with websites found</p>
                  <p className="text-sm">Import leads with website URLs first</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {leadsWithWebsites.length} leads with websites
                    </p>
                    <Button variant="ghost" size="sm" onClick={toggleAllLeads}>
                      {selectedLeads.length === leadsWithWebsites.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedLeads.length === leadsWithWebsites.length && leadsWithWebsites.length > 0}
                              onCheckedChange={toggleAllLeads}
                            />
                          </TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Website</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leadsWithWebsites.map((lead: Lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={() => toggleLeadSelection(lead.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{lead.company || '-'}</TableCell>
                            <TableCell>{lead.firstName} {lead.lastName}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-blue-600">
                              {lead.website}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLeadsDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddLeads} 
                disabled={selectedLeads.length === 0 || addUrlsMutation.isPending}
              >
                {addUrlsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Add {selectedLeads.length} Lead{selectedLeads.length !== 1 ? 's' : ''} to Queue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* Leads Tab */}
      <TabsContent value="leads" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Leads for Web Form Outreach
            </CardTitle>
            <CardDescription>
              Choose leads with websites to add to the outreach queue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : leadsWithWebsites.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No leads with websites found</p>
                <p className="text-sm">Import leads with website URLs from Google Maps, LinkedIn, or CSV</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      {leadsWithWebsites.length} leads with websites available
                    </p>
                    {selectedLeads.length > 0 && (
                      <Badge variant="secondary">{selectedLeads.length} selected</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={toggleAllLeads}>
                      {selectedLeads.length === leadsWithWebsites.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button 
                      onClick={handleAddLeads} 
                      disabled={selectedLeads.length === 0 || addUrlsMutation.isPending}
                    >
                      {addUrlsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      Add to Queue
                    </Button>
                  </div>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedLeads.length === leadsWithWebsites.length && leadsWithWebsites.length > 0}
                            onCheckedChange={toggleAllLeads}
                          />
                        </TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Website</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leadsWithWebsites.slice(0, 100).map((lead: Lead) => (
                        <TableRow 
                          key={lead.id} 
                          className={selectedLeads.includes(lead.id) ? 'bg-primary/5' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedLeads.includes(lead.id)}
                              onCheckedChange={() => toggleLeadSelection(lead.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{lead.company || '-'}</TableCell>
                          <TableCell>{lead.firstName} {lead.lastName}</TableCell>
                          <TableCell className="text-muted-foreground">{lead.email || '-'}</TableCell>
                          <TableCell className="max-w-[250px] truncate">
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {lead.website}
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {leadsWithWebsites.length > 100 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Showing 100 of {leadsWithWebsites.length} leads
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Configuration Tab */}
      <TabsContent value="config" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Outreach Configuration
                </CardTitle>
                <CardDescription>
                  Configure the details that will be filled in contact forms
                </CardDescription>
              </div>
              {configSaved && (
                <Badge variant="default" className="bg-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Saved
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {configLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={config.firstName}
                      onChange={(e) => setConfig({ ...config, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={config.lastName}
                      onChange={(e) => setConfig({ ...config, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={config.email}
                      onChange={(e) => setConfig({ ...config, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={config.phone}
                      onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={config.company}
                      onChange={(e) => setConfig({ ...config, company: e.target.value })}
                      placeholder="Your Company"
                    />
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={config.subject}
                      onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                      placeholder="Business Inquiry"
                    />
                  </div>
                </div>

                <div>
                  <Label>Message *</Label>
                  <Textarea
                    value={config.message}
                    onChange={(e) => setConfig({ ...config, message: e.target.value })}
                    placeholder="Hi, I'm reaching out regarding..."
                    rows={6}
                  />
                </div>

                <div>
                  <Label>Delay Between Requests (seconds)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={config.delayBetweenRequests}
                    onChange={(e) => setConfig({ ...config, delayBetweenRequests: parseInt(e.target.value) || 3 })}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Wait time between form submissions (recommended: 3-5 seconds)
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={() => saveConfigMutation.mutate(config)}
                    disabled={saveConfigMutation.isPending || !config.email}
                    size="lg"
                  >
                    {saveConfigMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : configSaved ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {configSaved ? 'Saved!' : 'Save Configuration'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How Web Form Outreach Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">1</span>
              </div>
              <p>Configure your contact details (name, email, message) in the Configuration tab</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">2</span>
              </div>
              <p>Select leads with websites or manually add URLs to the queue</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">3</span>
              </div>
              <p>The bot automatically finds contact forms on each website</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">4</span>
              </div>
              <p>Forms are filled with your details and submitted automatically</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
