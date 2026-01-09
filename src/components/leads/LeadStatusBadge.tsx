import { Badge } from '@/components/ui/badge';
import { LeadStatus } from '@/types/crm';
import { cn } from '@/lib/utils';

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  contacted: { label: 'Contacted', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  replied: { label: 'Replied', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  qualified: { label: 'Qualified', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  closed: { label: 'Closed', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  lost: { label: 'Lost', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, 'font-medium', className)}
    >
      {config.label}
    </Badge>
  );
}
