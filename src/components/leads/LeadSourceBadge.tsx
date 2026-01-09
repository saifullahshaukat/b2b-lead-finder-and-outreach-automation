import { Badge } from '@/components/ui/badge';
import { LeadSource } from '@/types/crm';
import { cn } from '@/lib/utils';
import { MapPin, Linkedin, FileSpreadsheet, Globe, Webhook, UserPlus } from 'lucide-react';

const sourceConfig: Record<LeadSource, { label: string; icon: React.ElementType; className: string }> = {
  google_maps: { label: 'Google Maps', icon: MapPin, className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  csv: { label: 'CSV Import', icon: FileSpreadsheet, className: 'bg-green-500/10 text-green-400 border-green-500/20' },
  website: { label: 'Website', icon: Globe, className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  api: { label: 'API', icon: Webhook, className: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  manual: { label: 'Manual', icon: UserPlus, className: 'bg-muted text-muted-foreground border-border' },
};

interface LeadSourceBadgeProps {
  source: LeadSource;
  className?: string;
}

export function LeadSourceBadge({ source, className }: LeadSourceBadgeProps) {
  const config = sourceConfig[source];
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, 'font-medium gap-1', className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
