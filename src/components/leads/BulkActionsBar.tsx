import { useCRM } from '@/contexts/CRMContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { X, Tag, Send, Trash2, GitBranch, ChevronDown } from 'lucide-react';
import { LeadStatus } from '@/types/crm';

export function BulkActionsBar() {
  const { selectedLeadIds, setSelectedLeadIds, leads, updateLead, deleteLead } = useCRM();

  if (selectedLeadIds.length === 0) return null;

  const handleBulkStatusChange = (status: LeadStatus) => {
    selectedLeadIds.forEach(id => updateLead(id, { status }));
  };

  const handleBulkDelete = () => {
    selectedLeadIds.forEach(id => deleteLead(id));
    setSelectedLeadIds([]);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg shadow-lg p-3 flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-sm">
          {selectedLeadIds.length} selected
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setSelectedLeadIds([])}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        {/* Status Change */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              Status
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleBulkStatusChange('new')}>
              New
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkStatusChange('contacted')}>
              Contacted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkStatusChange('replied')}>
              Replied
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkStatusChange('qualified')}>
              Qualified
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkStatusChange('closed')}>
              Closed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkStatusChange('lost')}>
              Lost
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Tags */}
        <Button variant="outline" size="sm" className="gap-1">
          <Tag className="h-3 w-3" />
          Tag
        </Button>

        {/* Send Outreach */}
        <Button variant="outline" size="sm" className="gap-1">
          <Send className="h-3 w-3" />
          Outreach
        </Button>

        {/* Add to Workflow */}
        <Button variant="outline" size="sm" className="gap-1">
          <GitBranch className="h-3 w-3" />
          Workflow
        </Button>

        <div className="h-6 w-px bg-border" />

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive gap-1"
          onClick={handleBulkDelete}
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
      </div>
    </div>
  );
}
