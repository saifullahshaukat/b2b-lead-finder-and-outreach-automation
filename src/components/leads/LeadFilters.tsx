import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Plus, Save } from 'lucide-react';
import { LeadStatus, LeadSource } from '@/types/crm';

interface LeadFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: LeadStatus | 'all';
  onStatusChange: (status: LeadStatus | 'all') => void;
  sourceFilter: LeadSource | 'all';
  onSourceChange: (source: LeadSource | 'all') => void;
}

const statusOptions: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'closed', label: 'Closed' },
  { value: 'lost', label: 'Lost' },
];

const sourceOptions: { value: LeadSource | 'all'; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'csv', label: 'CSV Import' },
  { value: 'website', label: 'Website' },
  { value: 'api', label: 'API' },
  { value: 'manual', label: 'Manual' },
];

export function LeadFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
}: LeadFiltersProps) {
  const activeFiltersCount = 
    (statusFilter !== 'all' ? 1 : 0) + 
    (sourceFilter !== 'all' ? 1 : 0);

  const clearFilters = () => {
    onStatusChange('all');
    onSourceChange('all');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads by name, email, company..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as LeadStatus | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={(v) => onSourceChange(v as LeadSource | 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {sourceOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="h-5 w-5 p-0 flex items-center justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Advanced Filters</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    Tags
                  </label>
                  <Input placeholder="Filter by tag..." />
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    Company
                  </label>
                  <Input placeholder="Filter by company..." />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    Last Contacted
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This week</SelectItem>
                      <SelectItem value="month">This month</SelectItem>
                      <SelectItem value="never">Never contacted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Condition
                </Button>
                <Button size="sm" className="flex-1">
                  <Save className="h-3 w-3 mr-1" />
                  Save View
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
