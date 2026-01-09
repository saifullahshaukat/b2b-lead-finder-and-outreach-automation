import { useCRM } from '@/contexts/CRMContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Copy, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function SMSOutreach() {
  const { templates } = useCRM();
  const smsTemplates = templates.filter(t => t.channel === 'sms');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">SMS Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create short, impactful SMS messages
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      <div className="grid gap-4">
        {smsTemplates.map(template => (
          <Card key={template.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                {template.content}
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {template.content.length} chars
                  </Badge>
                  {template.variables.map(v => (
                    <Badge key={v} variant="secondary" className="text-xs">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(template.updatedAt, { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

        {smsTemplates.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No SMS templates yet. Create your first template to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
