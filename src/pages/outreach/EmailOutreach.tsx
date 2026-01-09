import { useCRM } from '@/contexts/CRMContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Copy, Trash2, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function EmailOutreach() {
  const { templates } = useCRM();
  const emailTemplates = templates.filter(t => t.channel === 'email');

  return (
    <Tabs defaultValue="templates" className="space-y-6">
      <TabsList>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="sequences">Sequences</TabsTrigger>
        <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
      </TabsList>

      <TabsContent value="templates" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Email Templates</h3>
            <p className="text-sm text-muted-foreground">
              Create and manage reusable email templates
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
        </div>

        <div className="grid gap-4">
          {emailTemplates.map(template => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.subject && (
                      <CardDescription className="mt-1">
                        Subject: {template.subject}
                      </CardDescription>
                    )}
                  </div>
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
                <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-32 overflow-hidden relative">
                  {template.content}
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted/50 to-transparent" />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Variables:</span>
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
        </div>
      </TabsContent>

      <TabsContent value="sequences" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Email Sequences</h3>
            <p className="text-sm text-muted-foreground">
              Automated multi-step email follow-ups
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            New Sequence
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Initial Outreach Sequence</CardTitle>
                <CardDescription>3 steps • 5 day duration</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  Active
                </Badge>
                <Button variant="outline" size="sm">
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Cold Outreach - Initial</p>
                  <p className="text-xs text-muted-foreground">Sent immediately</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Follow-up #1</p>
                  <p className="text-xs text-muted-foreground">Wait 2 days</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Final Follow-up</p>
                  <p className="text-xs text-muted-foreground">Wait 3 days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="campaigns" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Email Campaigns</h3>
            <p className="text-sm text-muted-foreground">
              View and manage active campaigns
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            New Campaign
          </Button>
        </div>

        <div className="text-center py-12 text-muted-foreground">
          No active campaigns. Create a campaign to start sending emails to your leads.
        </div>
      </TabsContent>
    </Tabs>
  );
}
