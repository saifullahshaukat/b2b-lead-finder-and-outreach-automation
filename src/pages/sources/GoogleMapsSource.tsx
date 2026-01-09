import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  MapPin,
  Trash2,
  Download,
  Clock,
  Mail,
  RotateCcw,
  Search,
  UserPlus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useScraperJobs,
  useCreateScraperJob,
  useDeleteScraperJob,
  useDownloadJobResults,
} from '@/hooks/useGoogleMapsScraper';
import { useImportFromJob } from '@/hooks/useLeads';
import type { ScraperJob } from '@/services/googleMapsScraper';
import { TagInput } from '@/components/ui/tag-input';
import { useToast } from '@/hooks/use-toast';

function getStatusBadge(status: ScraperJob['Status']) {
  switch (status) {
    case 'ok':
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    case 'working':
      return (
        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Running
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    default:
      return null;
  }
}

export default function GoogleMapsSource() {
  // Form state - simplified
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState('20');
  const [extractEmail, setExtractEmail] = useState(false);

  // Hooks
  const { data: jobs = [], isLoading, refetch } = useScraperJobs('google_maps');
  const createJob = useCreateScraperJob();
  const deleteJob = useDeleteScraperJob();
  const downloadResults = useDownloadJobResults();
  const importFromJob = useImportFromJob();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (businessTypes.length === 0 || !location.trim()) {
      return;
    }

    await createJob.mutateAsync({
      name: `${businessTypes[0]}${businessTypes.length > 1 ? ` +${businessTypes.length - 1}` : ''} in ${location}`,
      type: 'google_maps',
      businessTypes,
      location: location.trim(),
      maxResults: parseInt(maxResults),
      extractEmail,
      lang: 'en',
    });
    
    // Reset form
    setBusinessTypes([]);
    setLocation('');
  };

  const handleDelete = async (id: string) => {
    await deleteJob.mutateAsync(id);
  };

  const handleDownload = async (job: ScraperJob) => {
    await downloadResults.mutateAsync({ id: job.ID, name: job.Name });
  };

  const handleImportToLeads = async (job: ScraperJob) => {
    try {
      const result = await importFromJob.mutateAsync(job.ID);
      toast({
        title: "Imported to Leads",
        description: `Successfully imported ${result.imported} out of ${result.total} leads`,
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import leads. Please try again.",
        variant: "destructive",
      });
    }
  };

  const runningJobs = jobs.filter(j => j.Status === 'working' || j.Status === 'pending');
  const completedJobs = jobs.filter(j => j.Status === 'ok');
  const totalLeads = jobs.reduce((sum, j) => sum + j.ResultsCount, 0);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{jobs.length}</p>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{runningJobs.length}</p>
                <p className="text-sm text-muted-foreground">Running</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedJobs.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLeads.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Leads Found</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Scrape Form */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Start New Scrape</CardTitle>
              <CardDescription>
                Find businesses on Google Maps and extract their contact info
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Main Inputs */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessTypes" className="text-base font-medium">
                    What businesses are you looking for?
                  </Label>
                  <TagInput
                    value={businessTypes}
                    onChange={setBusinessTypes}
                    placeholder="Type a business type and press Enter..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Add multiple types to search for different businesses in the same location
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-base font-medium">
                    Where should we search?
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g., New York, NY or Miami, Florida"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    City, state, country, or any location
                  </p>
                </div>
              </div>

              {/* Right Column - Options */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">How many results per business type?</Label>
                  <Select value={maxResults} onValueChange={setMaxResults}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 results (Quick)</SelectItem>
                      <SelectItem value="20">20 results (Recommended)</SelectItem>
                      <SelectItem value="50">50 results</SelectItem>
                      <SelectItem value="100">100 results (Deep)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="extractEmail" className="text-base font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Extract Emails
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Visit websites to find email addresses (slower but more data)
                    </p>
                  </div>
                  <Switch
                    id="extractEmail"
                    checked={extractEmail}
                    onCheckedChange={setExtractEmail}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {businessTypes.length > 0 && location && (
                  <span>
                    Will search for <strong>{businessTypes.length}</strong> business type{businessTypes.length > 1 ? 's' : ''} 
                    {' '}in <strong>{location}</strong>
                  </span>
                )}
              </div>
              <Button
                type="submit"
                disabled={createJob.isPending || businessTypes.length === 0 || !location.trim()}
                className="min-w-[140px]"
              >
                {createJob.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Scraping Jobs</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No scraping jobs yet</p>
              <p className="text-sm">Create your first job above to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Results</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.ID}>
                    <TableCell className="font-medium">{job.Name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(job.Status)}
                        {job.Error && (
                          <span className="text-xs text-red-500 truncate max-w-[200px]">
                            {job.Error}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {job.ResultsCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(job.Date), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {job.Status === 'ok' && job.ResultsCount > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleImportToLeads(job)}
                              disabled={importFromJob.isPending}
                              title="Import to Leads"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(job)}
                              disabled={downloadResults.isPending}
                              title="Download CSV"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Job?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this job and all its results.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(job.ID)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
