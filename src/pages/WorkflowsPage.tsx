import { TopBar } from '@/components/layout/TopBar';
import { useCRM } from '@/contexts/CRMContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Copy, Trash2, Play, Pause, GitBranch } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function WorkflowsPage() {
  const { workflows } = useCRM();

  return (
    <>
      <TopBar
        title="Workflows"
        subtitle="Visual automation builder"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            New Workflow
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Workflow Templates */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Start from Template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: 'New Lead Nurture',
                description: 'Email → Wait → SMS follow-up sequence',
                steps: 5,
              },
              {
                name: 'Google Maps → Multi-Channel',
                description: 'Full sequence for scraped leads',
                steps: 8,
              },
              {
                name: 'Re-engagement Campaign',
                description: 'Wake up cold leads with fresh outreach',
                steps: 4,
              },
            ].map(template => (
              <Card
                key={template.name}
                className="cursor-pointer hover:border-primary/50 transition-colors"
              >
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <GitBranch className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Badge variant="secondary">{template.steps} steps</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* My Workflows */}
        <div>
          <h2 className="text-lg font-semibold mb-4">My Workflows</h2>
          <div className="space-y-4">
            {workflows.map(workflow => (
              <Card key={workflow.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <GitBranch className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{workflow.name}</h3>
                          <Badge
                            variant={workflow.isActive ? 'default' : 'secondary'}
                            className={
                              workflow.isActive
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : ''
                            }
                          >
                            {workflow.isActive ? 'Active' : 'Draft'}
                          </Badge>
                        </div>
                        {workflow.description && (
                          <p className="text-sm text-muted-foreground">
                            {workflow.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{workflow.nodes.length} nodes</span>
                          <span>•</span>
                          <span>{workflow.stats.leadsProcessed} leads processed</span>
                          <span>•</span>
                          <span>{workflow.stats.conversions} conversions</span>
                          <span>•</span>
                          <span>
                            Updated {formatDistanceToNow(workflow.updatedAt, { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {workflow.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <Switch checked={workflow.isActive} />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {workflows.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No workflows yet. Create your first workflow or start from a template.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
