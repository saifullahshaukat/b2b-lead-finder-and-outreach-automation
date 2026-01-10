import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLocationSuggestions, useKeywordSuggestions } from '@/hooks/useLeads';
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
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Linkedin,
  Trash2,
  Download,
  Clock,
  RotateCcw,
  Search,
  Users,
  Building2,
  Globe,
  Lock,
  AlertCircle,
  Settings,
  X,
  Tag,
  MapPin,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useScraperJobs,
  useCreateScraperJob,
  useDeleteScraperJob,
  useDownloadJobResults,
} from '@/hooks/useGoogleMapsScraper';
import type { ScraperJob } from '@/services/googleMapsScraper';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

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

export default function LinkedInSource() {
  const { toast } = useToast();
  
  // LinkedIn session state
  const [linkedInSession, setLinkedInSession] = useState<{ connected: boolean; lastUpdated: string | null }>({
    connected: false,
    lastUpdated: null
  });
  
  // Form state
  const [scrapeMode, setScrapeMode] = useState<'google' | 'login'>('google');
  const [searchType, setSearchType] = useState<'people' | 'companies'>('people');
  const [keywords, setKeywords] = useState('');
  const [keywordTags, setKeywordTags] = useState<string[]>([]);
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);
  const [location, setLocation] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [maxResults, setMaxResults] = useState('50');
  
  // Refs for click outside
  const keywordInputRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLDivElement>(null);
  
  // Suggestions hooks
  const { data: keywordSuggestions = [] } = useKeywordSuggestions(keywords);
  const { data: locationSuggestions = [] } = useLocationSuggestions(location);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (keywordInputRef.current && !keywordInputRef.current.contains(event.target as Node)) {
        setShowKeywordSuggestions(false);
      }
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const addKeywordTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !keywordTags.includes(trimmed)) {
      setKeywordTags([...keywordTags, trimmed]);
    }
    setKeywords('');
    setShowKeywordSuggestions(false);
  };
  
  const removeKeywordTag = (tag: string) => {
    setKeywordTags(keywordTags.filter(t => t !== tag));
  };
const API_BASE = 'http://localhost:3001/api/v1';

  // Hooks
  const { data: jobs = [], isLoading, refetch } = useScraperJobs('linkedin');
  const createJob = useCreateScraperJob();
  const deleteJob = useDeleteScraperJob();
  const downloadResults = useDownloadJobResults();

  // Fetch LinkedIn session status
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`${API_BASE}/integrations/linkedin/session`);
        const data = await response.json();
        setLinkedInSession(data);
      } catch (error) {
        console.error('Failed to fetch LinkedIn session:', error);
      }
    };
    fetchSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine current input with tags
    const allKeywords = [...keywordTags];
    if (keywords.trim()) {
      allKeywords.push(keywords.trim());
    }
    
    if (allKeywords.length === 0) {
      toast({
        title: "Keywords required",
        description: "Please enter search keywords",
        variant: "destructive",
      });
      return;
    }

    // Check if login mode is selected but no session exists
    if (scrapeMode === 'login' && !linkedInSession.connected) {
      toast({
        title: "LinkedIn not connected",
        description: "Please connect your LinkedIn account in Integrations first, or use Google-based mode.",
        variant: "destructive",
      });
      return;
    }

    const modeLabel = scrapeMode === 'google' ? '🔍' : '🔐';
    const keywordsString = allKeywords.join(', ');
    
    await createJob.mutateAsync({
      name: `${modeLabel} ${searchType === 'people' ? 'People' : 'Companies'}: ${keywordsString}${location ? ` in ${location}` : ''}`,
      type: 'linkedin',
      scrapeMode,
      searchType,
      keywords: keywordsString,
      location: location.trim(),
      maxResults: parseInt(maxResults),
      // Note: keywords are for search, NOT auto-added as lead tags
    });
    
    toast({
      title: "Scraping started",
      description: `LinkedIn ${scrapeMode === 'google' ? 'Google-based' : 'login-based'} scraping job has been queued`,
    });
    
    setKeywords('');
    setKeywordTags([]);
    setLocation('');
  };

  const handleDelete = async (id: string) => {
    await deleteJob.mutateAsync(id);
  };

  const handleDownload = async (job: ScraperJob) => {
    await downloadResults.mutateAsync({ id: job.ID, name: job.Name });
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
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLeads.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Leads Found</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LinkedIn Session Status */}
      {!linkedInSession.connected && scrapeMode === 'login' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Login-based scraping requires a LinkedIn connection. 
            </span>
            <Button variant="link" asChild className="p-0 h-auto">
              <Link to="/integrations">
                <Settings className="h-4 w-4 mr-1" />
                Connect in Integrations
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* New Scrape Form */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600/10 flex items-center justify-center">
              <Linkedin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">LinkedIn Search</CardTitle>
              <CardDescription>
                Search for people or companies on LinkedIn
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Scraping Mode Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Scraping Mode</Label>
              <RadioGroup
                value={scrapeMode}
                onValueChange={(value) => setScrapeMode(value as 'google' | 'login')}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className={`relative flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  scrapeMode === 'google' 
                    ? 'border-green-500 bg-green-500/5' 
                    : 'border-border hover:border-muted-foreground/50'
                }`}>
                  <RadioGroupItem value="google" id="mode-google" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="mode-google" className="flex items-center gap-2 cursor-pointer">
                      <Globe className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Google-based</span>
                      <Badge className="bg-green-500/10 text-green-600 text-xs">Recommended</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      No login required. Uses Google search to find LinkedIn profiles.
                      Works without any account.
                    </p>
                  </div>
                </div>
                
                <div className={`relative flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  scrapeMode === 'login' 
                    ? 'border-blue-500 bg-blue-500/5' 
                    : 'border-border hover:border-muted-foreground/50'
                }`}>
                  <RadioGroupItem value="login" id="mode-login" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="mode-login" className="flex items-center gap-2 cursor-pointer">
                      <Lock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Login-based</span>
                      {linkedInSession.connected ? (
                        <Badge className="bg-green-500/10 text-green-600 text-xs">Connected</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Not Connected</Badge>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Requires LinkedIn connection. Gets more detailed data including
                      connection degree and profile images.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Search Options */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Search For</Label>
                  <Select value={searchType} onValueChange={(v: 'people' | 'companies') => setSearchType(v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="people">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          People / Professionals
                        </div>
                      </SelectItem>
                      <SelectItem value="companies">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Companies
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords" className="text-base font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Keywords *
                  </Label>
                  
                  {/* Keyword Tags */}
                  {keywordTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {keywordTags.map(tag => (
                        <Badge 
                          key={tag} 
                          variant="secondary"
                          className="flex items-center gap-1 pr-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeKeywordTag(tag)}
                            className="ml-1 bg-blue-200 dark:bg-blue-800 hover:bg-red-500 hover:text-white rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Keyword Input with Autocomplete */}
                  <div ref={keywordInputRef} className="relative">
                    <Input
                      id="keywords"
                      placeholder={searchType === 'people' 
                        ? "Type and press Enter (e.g., CEO, Software Engineer)" 
                        : "Type and press Enter (e.g., SaaS, Fintech, AI)"}
                      value={keywords}
                      onChange={(e) => {
                        setKeywords(e.target.value);
                        setShowKeywordSuggestions(e.target.value.length >= 2);
                      }}
                      onFocus={() => setShowKeywordSuggestions(keywords.length >= 2)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && keywords.trim()) {
                          e.preventDefault();
                          addKeywordTag(keywords);
                        }
                      }}
                      className="h-11"
                    />
                    
                    {/* Keyword Suggestions Dropdown */}
                    {showKeywordSuggestions && keywordSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-auto">
                        {keywordSuggestions.filter(s => !keywordTags.includes(s)).map(suggestion => (
                          <button
                            key={suggestion}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                            onClick={() => addKeywordTag(suggestion)}
                          >
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press Enter to add multiple keywords as tags
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-base font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location (optional)
                  </Label>
                  
                  {/* Location Input with Autocomplete */}
                  <div ref={locationInputRef} className="relative">
                    <Input
                      id="location"
                      placeholder="e.g., San Francisco, New York, London"
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setShowLocationSuggestions(e.target.value.length >= 2);
                      }}
                      onFocus={() => setShowLocationSuggestions(location.length >= 2 || location.length === 0)}
                      className="h-11"
                    />
                    
                    {/* Location Suggestions Dropdown */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-auto">
                        {locationSuggestions.map(suggestion => (
                          <button
                            key={suggestion}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                            onClick={() => {
                              setLocation(suggestion);
                              setShowLocationSuggestions(false);
                            }}
                          >
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Max Results</Label>
                  <Select value={maxResults} onValueChange={setMaxResults}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 results (Quick)</SelectItem>
                      <SelectItem value="50">50 results (Recommended)</SelectItem>
                      <SelectItem value="100">100 results</SelectItem>
                      <SelectItem value="200">200 results (Deep)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {(keywordTags.length > 0 || keywords) && (
                  <span>
                    Will search for <strong>{searchType}</strong> matching "
                    {[...keywordTags, keywords].filter(Boolean).join(', ')}"
                    {location && <> in <strong>{location}</strong></>}
                    {' '}using <strong>{scrapeMode === 'google' ? 'Google' : 'LinkedIn login'}</strong>
                  </span>
                )}
              </div>
              <Button
                type="submit"
                disabled={
                  createJob.isPending || 
                  (keywordTags.length === 0 && !keywords.trim()) || 
                  (scrapeMode === 'login' && !linkedInSession.connected)
                }
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
                    Start Search
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
            <CardTitle className="text-lg">LinkedIn Jobs</CardTitle>
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
              <Linkedin className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No LinkedIn jobs yet</p>
              <p className="text-sm">Create your first search above to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Mode</TableHead>
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
                      {job.Data?.scrapeMode === 'login' ? (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Login
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-green-500/30 text-green-600">
                          <Globe className="h-3 w-3" />
                          Google
                        </Badge>
                      )}
                    </TableCell>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(job)}
                            disabled={downloadResults.isPending}
                            title="Download CSV"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
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

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Linkedin className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">How it works</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Google-based:</strong> Searches Google for LinkedIn profiles (site:linkedin.com). No account needed.</li>
                <li>• <strong>Login-based:</strong> Uses your LinkedIn session for deeper scraping. Requires connection in Integrations.</li>
                <li>• Leads are automatically added to your Leads page in real-time.</li>
                <li>• Use responsibly and respect LinkedIn's terms of service.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
