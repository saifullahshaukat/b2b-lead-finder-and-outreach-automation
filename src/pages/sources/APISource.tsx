import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Webhook, Copy, Check, RefreshCw, Code, Clock } from 'lucide-react';

export default function APISource() {
  const [copied, setCopied] = useState(false);
  const webhookUrl = 'https://api.outreachcrm.io/webhook/abc123xyz';

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="webhook" className="space-y-6">
        <TabsList>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="api">REST API</TabsTrigger>
        </TabsList>

        <TabsContent value="webhook" className="space-y-6">
          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="h-5 w-5 text-orange-500" />
                Webhook Endpoint
              </CardTitle>
              <CardDescription>
                Receive leads automatically via webhook from external services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Webhook URL</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" onClick={copyWebhookUrl}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send POST requests to this URL to create leads automatically
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regenerate URL
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Payload Format */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expected Payload Format</CardTitle>
              <CardDescription>
                Send JSON data in the following format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Inc",
  "jobTitle": "CEO",
  "customFields": {
    "industry": "Technology",
    "source": "Partner Referral"
  }
}`}
              </pre>
            </CardContent>
          </Card>

          {/* Recent Webhook Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { time: '2 min ago', status: 'success', leads: 1 },
                  { time: '15 min ago', status: 'success', leads: 3 },
                  { time: '1 hour ago', status: 'error', error: 'Invalid email format' },
                  { time: '2 hours ago', status: 'success', leads: 1 },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{activity.time}</span>
                      {activity.status === 'success' ? (
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                          {activity.leads} lead{activity.leads > 1 ? 's' : ''} created
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                          Error: {activity.error}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          {/* API Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-500" />
                REST API
              </CardTitle>
              <CardDescription>
                Programmatically create and manage leads via our API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input 
                    type="password" 
                    value="your-api-key-here" 
                    readOnly 
                    className="font-mono text-sm" 
                  />
                  <Button variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input 
                  value="https://api.outreachcrm.io/v1" 
                  readOnly 
                  className="font-mono text-sm" 
                />
              </div>
            </CardContent>
          </Card>

          {/* API Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Lead</CardTitle>
              <CardDescription>POST /v1/leads</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST https://api.outreachcrm.io/v1/leads \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "company": "Acme Inc"
  }'`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">List Leads</CardTitle>
              <CardDescription>GET /v1/leads</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`curl https://api.outreachcrm.io/v1/leads \\
  -H "Authorization: Bearer sk_live_xxx"`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
