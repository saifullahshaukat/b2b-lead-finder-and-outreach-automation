import { useState } from 'react';
import { Lead } from '@/types/crm';
import { useCRM } from '@/contexts/CRMContext';
import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LeadSourceBadge } from './LeadSourceBadge';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Mail, MessageSquare, Phone, Eye, Trash2, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export function LeadsTable({ leads, onLeadClick }: LeadsTableProps) {
  const { selectedLeadIds, setSelectedLeadIds, deleteLead } = useCRM();

  const allSelected = leads.length > 0 && selectedLeadIds.length === leads.length;
  const someSelected = selectedLeadIds.length > 0 && selectedLeadIds.length < leads.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map(l => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as any).indeterminate = someSelected;
                  }
                }}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead className="min-w-[200px]">Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Last Contact</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map(lead => (
            <TableRow
              key={lead.id}
              className={cn(
                'cursor-pointer transition-colors',
                selectedLeadIds.includes(lead.id) && 'bg-muted/30'
              )}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedLeadIds.includes(lead.id)}
                  onCheckedChange={() => toggleSelect(lead.id)}
                />
              </TableCell>
              <TableCell onClick={() => onLeadClick(lead)}>
                <div>
                  <p className="font-medium">
                    {lead.firstName} {lead.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{lead.email}</p>
                </div>
              </TableCell>
              <TableCell onClick={() => onLeadClick(lead)}>
                <div>
                  <p className="font-medium">{lead.company || '—'}</p>
                  {lead.jobTitle && (
                    <p className="text-sm text-muted-foreground">{lead.jobTitle}</p>
                  )}
                </div>
              </TableCell>
              <TableCell onClick={() => onLeadClick(lead)}>
                <LeadStatusBadge status={lead.status} />
              </TableCell>
              <TableCell onClick={() => onLeadClick(lead)}>
                <LeadSourceBadge source={lead.source} />
              </TableCell>
              <TableCell onClick={() => onLeadClick(lead)}>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {lead.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {lead.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{lead.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell onClick={() => onLeadClick(lead)}>
                <span className="text-sm text-muted-foreground">
                  {lead.lastContactedAt
                    ? formatDistanceToNow(lead.lastContactedAt, { addSuffix: true })
                    : 'Never'}
                </span>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onLeadClick(lead)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send SMS
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Tag className="h-4 w-4 mr-2" />
                      Add Tag
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteLead(lead.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                No leads found. Import some leads to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
