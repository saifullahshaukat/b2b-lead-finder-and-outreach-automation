import { useState, useMemo, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { LeadProfile } from '@/components/leads/LeadProfile';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { LeadSourceBadge } from '@/components/leads/LeadSourceBadge';
import { useLeads, useLeadStats, useBulkDeleteLeads, useBulkUpdateStatus } from '@/hooks/useLeads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Download,
  Search,
  Loader2,
  Users,
  UserPlus,
  MessageSquare,
  CheckCircle,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  Phone,
  Mail,
  Building2,
  MapPin,
  Star,
  RefreshCw,
  Linkedin,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Lead as ApiLead } from '@/services/leadsService';
import { Lead, LeadStatus, LeadSource } from '@/types/crm';

// Convert API lead to CRM lead format
function apiLeadToCrmLead(apiLead: ApiLead): Lead {
  return {
    id: apiLead.id,
    firstName: apiLead.firstName || apiLead.company?.split(' ')[0] || '',
    lastName: apiLead.lastName || '',
    email: apiLead.email || '',
    phone: apiLead.phone || '',
    company: apiLead.company || '',
    jobTitle: apiLead.jobTitle || '',
    website: apiLead.website || '',
    linkedinUrl: apiLead.linkedinUrl || '',
    status: apiLead.status as LeadStatus,
    source: apiLead.source as LeadSource,
    sourceDetails: apiLead.sourceDetails || '',
    tags: apiLead.tags || [],
    notes: [],
    customFields: apiLead.customFields || {},
    outreachHistory: [],
    createdAt: new Date(apiLead.createdAt),
    updatedAt: new Date(apiLead.updatedAt),
    lastContactedAt: apiLead.lastContactedAt ? new Date(apiLead.lastContactedAt) : undefined,
  };
}

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Fetch leads from API
  const { data, isLoading, refetch, isFetching } = useLeads({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    search: searchQuery || undefined,
    limit: 200,
  });

  const { data: stats } = useLeadStats();
  const bulkDelete = useBulkDeleteLeads();
  const bulkUpdateStatus = useBulkUpdateStatus();

  const leads = useMemo(() => {
    return (data?.leads || []).map(apiLeadToCrmLead);
  }, [data]);

  // Keep selectedLead in sync with latest data
  useEffect(() => {
    if (selectedLead && leads.length > 0) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead && JSON.stringify(updatedLead) !== JSON.stringify(selectedLead)) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads, selectedLead]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(leads.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectLead = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setProfileOpen(true);
  };

  const handleBulkDelete = async () => {
    await bulkDelete.mutateAsync(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkStatus = async (status: string) => {
    await bulkUpdateStatus.mutateAsync({ ids: selectedIds, status });
    setSelectedIds([]);
  };

  return (
    <>
      <TopBar
        title="Leads"
        subtitle={`${data?.total || 0} total leads`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Lead
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.new || 0}</p>
                <p className="text-xs text-muted-foreground">New</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.contacted || 0}</p>
                <p className="text-xs text-muted-foreground">Contacted</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Mail className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.replied || 0}</p>
                <p className="text-xs text-muted-foreground">Replied</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.qualified || 0}</p>
                <p className="text-xs text-muted-foreground">Qualified</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <MapPin className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.from_google_maps || 0}</p>
                <p className="text-xs text-muted-foreground">From Maps</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="google_maps">Google Maps</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="csv">CSV Import</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Change Status</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkStatus('contacted')}>Mark Contacted</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatus('qualified')}>Mark Qualified</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatus('closed')}>Mark Closed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatus('lost')}>Mark Lost</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDelete.isPending}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No leads yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by scraping businesses from Google Maps or importing a CSV
            </p>
            <Button asChild>
              <a href="/sources/google-maps">
                <MapPin className="h-4 w-4 mr-2" />
                Scrape Google Maps
              </a>
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === leads.length && leads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleLeadClick(lead)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {lead.source === 'linkedin' ? (
                            <Linkedin className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Building2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {lead.source === 'linkedin' 
                              ? `${lead.firstName} ${lead.lastName}`.trim() || lead.company || 'Unknown'
                              : lead.company || lead.firstName || 'Unknown'
                            }
                          </p>
                          {lead.jobTitle && (
                            <p className="text-xs text-muted-foreground">{lead.jobTitle}</p>
                          )}
                          {lead.website && (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {lead.email}
                          </div>
                        )}
                        {lead.linkedinUrl && (
                          <a
                            href={lead.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Linkedin className="h-3 w-3" />
                            LinkedIn Profile
                          </a>
                        )}
                        {!lead.phone && !lead.email && !lead.linkedinUrl && (
                          <span className="text-muted-foreground text-sm">No contact info</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>
                      <LeadSourceBadge source={lead.source} />
                    </TableCell>
                    <TableCell>
                      {(lead.customFields as { rating?: number })?.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{(lead.customFields as { rating?: number }).rating}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(lead.createdAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleLeadClick(lead)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Lead Profile Drawer */}
      <LeadProfile
        lead={selectedLead}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </>
  );
}
