import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ChannelPlaceholderProps {
  channel: string;
  description: string;
}

export default function ChannelPlaceholder({ channel, description }: ChannelPlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{channel} Templates</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No {channel.toLowerCase()} templates yet. Create your first template to get started.
        </CardContent>
      </Card>
    </div>
  );
}
