import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useCRM } from '@/contexts/CRMContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Mail,
  MessageSquare,
  MessagesSquare,
  Phone,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  Plus,
  Linkedin,
  Loader2,
  Eye,
  EyeOff,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const integrationConfig = {
  email: {
    icon: Mail,
    label: 'Email',
    providers: ['SendGrid', 'Mailgun', 'AWS SES', 'Custom SMTP'],
  },
  sms: {
    icon: MessageSquare,
    label: 'SMS',
    providers: ['Twilio', 'MessageBird', 'Vonage'],
  },
  whatsapp: {
    icon: MessagesSquare,
    label: 'WhatsApp',
    providers: ['Twilio', 'WhatsApp Business API'],
  },
  voice: {
    icon: Phone,
    label: 'Voice / Calling',
    providers: ['Twilio', 'Vonage'],
  },
};

export default function IntegrationsPage() {
  const { integrations } = useCRM();
  const { toast } = useToast();
  
  // LinkedIn integration state
  const [linkedInSession, setLinkedInSession] = useState<{ connected: boolean; lastUpdated: string | null }>({ 
    connected: false, 
    lastUpdated: null 
  });
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInEmail, setLinkedInEmail] = useState('');
  const [linkedInPassword, setLinkedInPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Fetch LinkedIn session status
  const fetchLinkedInSession = async () => {
    try {
      const response = await fetch('/api/v1/integrations/linkedin/session');
      const data = await response.json();
      setLinkedInSession(data);
    } catch (error) {
      console.error('Failed to fetch LinkedIn session:', error);
    }
  };
  
  useEffect(() => {
    fetchLinkedInSession();
  }, []);
  
  // Handle LinkedIn login
  const handleLinkedInLogin = async () => {
    if (!linkedInEmail || !linkedInPassword) {
      setLoginError('Please enter email and password');
      return;
    }
    
    setLinkedInLoading(true);
    setLoginError(null);
    
    try {
      const response = await fetch('/api/v1/integrations/linkedin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: linkedInEmail, password: linkedInPassword }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'LinkedIn Connected',
          description: 'Your LinkedIn session has been saved.',
        });
        setLoginDialogOpen(false);
        setLinkedInEmail('');
        setLinkedInPassword('');
        fetchLinkedInSession();
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (error) {
      setLoginError((error as Error).message);
    } finally {
      setLinkedInLoading(false);
    }
  };
  
  // Handle LinkedIn logout
  const handleLinkedInLogout = async () => {
    try {
      await fetch('/api/v1/integrations/linkedin/logout', { method: 'POST' });
      toast({
        title: 'LinkedIn Disconnected',
        description: 'Your LinkedIn session has been removed.',
      });
      fetchLinkedInSession();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <>
      <TopBar
        title="Integrations"
        subtitle="Connect your APIs and services"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            Add Integration
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* LinkedIn Scraper Integration */}
        <div>
          <h2 className="text-lg font-semibold mb-4">LinkedIn Integration</h2>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Linkedin className="h-7 w-7 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">LinkedIn Scraper</h3>
                      {linkedInSession.connected ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Connect your LinkedIn account to enable login-based scraping for more detailed results.
                      Google-based scraping works without login.
                    </p>
                    {linkedInSession.connected && linkedInSession.lastUpdated && (
                      <p className="text-xs text-muted-foreground">
                        Session saved {formatDistanceToNow(new Date(linkedInSession.lastUpdated), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {linkedInSession.connected ? (
                    <>
                      <Button variant="outline" size="sm" onClick={fetchLinkedInSession}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleLinkedInLogout}>
                        <LogOut className="h-4 w-4 mr-1" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Linkedin className="h-4 w-4 mr-1" />
                          Connect LinkedIn
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Connect LinkedIn Account</DialogTitle>
                          <DialogDescription>
                            Enter your LinkedIn credentials to enable login-based scraping.
                            Your credentials are only used to create a session and are not stored.
                          </DialogDescription>
                        </DialogHeader>
                        
                        {loginError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{loginError}</AlertDescription>
                          </Alert>
                        )}
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="linkedin-email">Email</Label>
                            <Input
                              id="linkedin-email"
                              type="email"
                              placeholder="your@email.com"
                              value={linkedInEmail}
                              onChange={(e) => setLinkedInEmail(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="linkedin-password">Password</Label>
                            <div className="relative">
                              <Input
                                id="linkedin-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={linkedInPassword}
                                onChange={(e) => setLinkedInPassword(e.target.value)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              LinkedIn may require security verification on first login.
                              If login fails, try logging in manually first on linkedin.com.
                            </AlertDescription>
                          </Alert>
                        </div>
                        
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setLoginDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleLinkedInLogin} disabled={linkedInLoading}>
                            {linkedInLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              'Connect'
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
              
              {/* Scraping modes explanation */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-3">Scraping Modes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500/10 text-green-500">Recommended</Badge>
                      <span className="font-medium">Google-based</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No login required. Uses Google search to find LinkedIn profiles.
                      Works without an account but has limited data.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Advanced</Badge>
                      <span className="font-medium">Login-based</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requires LinkedIn connection. Gets more detailed profile data
                      including connection degree and profile images.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Connected Services</h2>
          <div className="grid gap-4">
            {integrations.map(integration => {
              const config = integrationConfig[integration.type];
              const Icon = config.icon;
              return (
                <Card key={integration.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{integration.name}</h3>
                            {integration.isConnected ? (
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                <XCircle className="h-3 w-3 mr-1" />
                                Not Connected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {config.label} • {integration.provider}
                          </p>
                          {integration.lastTestedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last tested {formatDistanceToNow(integration.lastTestedAt, { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4 mr-1" />
                              Configure
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Configure {integration.name}</DialogTitle>
                              <DialogDescription>
                                Update your API credentials for {integration.provider}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input type="password" placeholder="Enter API key" />
                              </div>
                              {integration.type === 'email' && (
                                <div className="space-y-2">
                                  <Label>From Email</Label>
                                  <Input placeholder="noreply@yourdomain.com" />
                                </div>
                              )}
                              {integration.type === 'sms' && (
                                <>
                                  <div className="space-y-2">
                                    <Label>Account SID</Label>
                                    <Input placeholder="Enter Account SID" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>From Phone Number</Label>
                                    <Input placeholder="+1234567890" />
                                  </div>
                                </>
                              )}
                            </div>
                            <DialogFooter>
                              <Button variant="outline">Cancel</Button>
                              <Button>Save Changes</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Available Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Add New Integration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(integrationConfig).map(([type, config]) => {
              const Icon = config.icon;
              const existingIntegration = integrations.find(i => i.type === type);
              
              return (
                <Card key={type} className="cursor-pointer hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      {existingIntegration?.isConnected && (
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                          Connected
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base mt-3">{config.label}</CardTitle>
                    <CardDescription>
                      Available providers: {config.providers.join(', ')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* API Logs */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent API Logs</h2>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {[
                  { time: '2 min ago', type: 'email', status: 'success', message: 'Email sent to sarah@techcorp.io' },
                  { time: '5 min ago', type: 'sms', status: 'success', message: 'SMS delivered to +1555123456' },
                  { time: '12 min ago', type: 'email', status: 'error', message: 'Failed to send: Invalid recipient' },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground w-20">{log.time}</span>
                    <Badge variant="outline" className="w-16 justify-center">
                      {log.type}
                    </Badge>
                    {log.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={log.status === 'error' ? 'text-red-500' : ''}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
