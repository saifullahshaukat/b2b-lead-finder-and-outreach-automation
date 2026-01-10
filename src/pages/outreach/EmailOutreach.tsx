import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Edit, Trash2, Mail, Send, Settings, FileText, 
  CheckCircle, XCircle, Clock, Loader2, RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const API_BASE = 'http://localhost:3001/api/v1';

// Email Credentials hook
function useEmailCredentials() {
  return useQuery({
    queryKey: ['email-credentials'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/email-credentials`);
      if (!response.ok) throw new Error('Failed to fetch credentials');
      return response.json();
    },
  });
}

// Email Templates hook
function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/email-templates`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });
}

// Email Outreach hook
function useEmailOutreach(status?: string) {
  return useQuery({
    queryKey: ['email-outreach', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const response = await fetch(`${API_BASE}/email-outreach${params}`);
      if (!response.ok) throw new Error('Failed to fetch outreach');
      return response.json();
    },
  });
}

export default function EmailOutreach() {
  const queryClient = useQueryClient();
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newCredentials, setNewCredentials] = useState({
    email: '', password: '', smtpServer: 'smtp.gmail.com', smtpPort: 587
  });
  const [newTemplate, setNewTemplate] = useState({
    name: '', subject: '', content: ''
  });

  const { data: credentials = [], isLoading: credentialsLoading } = useEmailCredentials();
  const { data: templates = [], isLoading: templatesLoading } = useEmailTemplates();
  const { data: outreachData, isLoading: outreachLoading, refetch: refetchOutreach } = useEmailOutreach();

  // Mutations
  const addCredentialsMutation = useMutation({
    mutationFn: async (data: typeof newCredentials) => {
      const response = await fetch(`${API_BASE}/email-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add credentials');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Email credentials added');
      queryClient.invalidateQueries({ queryKey: ['email-credentials'] });
      setShowCredentialsDialog(false);
      setNewCredentials({ email: '', password: '', smtpServer: 'smtp.gmail.com', smtpPort: 587 });
    },
    onError: () => toast.error('Failed to add credentials'),
  });

  const deleteCredentialsMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/email-credentials/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Credentials deleted');
      queryClient.invalidateQueries({ queryKey: ['email-credentials'] });
    },
  });

  const addTemplateMutation = useMutation({
    mutationFn: async (data: typeof newTemplate) => {
      const response = await fetch(`${API_BASE}/email-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add template');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Template saved');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setShowTemplateDialog(false);
      setNewTemplate({ name: '', subject: '', content: '' });
    },
    onError: () => toast.error('Failed to save template'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/email-templates/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`${API_BASE}/email-outreach/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Emails deleted');
      queryClient.invalidateQueries({ queryKey: ['email-outreach'] });
      setSelectedEmails([]);
    },
  });

  const stats = outreachData?.stats || { total: 0, pending: 0, sent: 0, failed: 0 };
  const emails = outreachData?.emails || [];

  const toggleEmailSelection = (id: string) => {
    setSelectedEmails(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleAllEmails = () => {
    if (selectedEmails.length === emails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(emails.map((e: { id: string }) => e.id));
    }
  };

  return (
    <Tabs defaultValue="queue" className="space-y-6">
      <TabsList>
        <TabsTrigger value="queue">Email Queue</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="credentials">SMTP Settings</TabsTrigger>
      </TabsList>

      {/* Email Queue Tab */}
      <TabsContent value="queue" className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.sent}</p>
                  <p className="text-xs text-muted-foreground">Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedEmails.length > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedEmails.length} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => bulkDeleteMutation.mutate(selectedEmails)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetchOutreach()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button disabled={stats.pending === 0 || credentials.length === 0}>
              <Send className="h-4 w-4 mr-1" />
              Start Sending
            </Button>
          </div>
        </div>

        {/* Email Queue Table */}
        <Card>
          <CardContent className="p-0">
            {outreachLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No emails in queue</p>
                <p className="text-sm">Add leads to email outreach from the Leads page</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEmails.length === emails.length && emails.length > 0}
                        onCheckedChange={toggleAllEmails}
                      />
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email: { 
                    id: string; 
                    email: string; 
                    subject: string; 
                    status: string; 
                    created_at: string 
                  }) => (
                    <TableRow key={email.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEmails.includes(email.id)}
                          onCheckedChange={() => toggleEmailSelection(email.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{email.email}</TableCell>
                      <TableCell className="max-w-xs truncate">{email.subject || '(No subject)'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          email.status === 'sent' ? 'default' :
                          email.status === 'failed' ? 'destructive' : 'secondary'
                        }>
                          {email.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => bulkDeleteMutation.mutate([email.id])}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Templates Tab */}
      <TabsContent value="templates" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Email Templates</h3>
            <p className="text-sm text-muted-foreground">
              Create reusable templates with variables like (firstName), (company)
            </p>
          </div>
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Email Template</DialogTitle>
                <DialogDescription>
                  Use variables like (firstName), (lastName), (company), (email) in your template
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., Initial Outreach"
                  />
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    placeholder="e.g., Quick question for (company)"
                  />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    placeholder="Hi (firstName),&#10;&#10;I noticed (company) is..."
                    rows={8}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => addTemplateMutation.mutate(newTemplate)}
                    disabled={!newTemplate.name || !newTemplate.subject || !newTemplate.content}
                  >
                    Save Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {templatesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates yet</p>
              <p className="text-sm">Create your first email template above</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {templates.map((template: { 
              id: string; 
              name: string; 
              subject: string; 
              content: string;
              created_at: string;
            }) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        Subject: {template.subject}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                      >
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* SMTP Credentials Tab */}
      <TabsContent value="credentials" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">SMTP Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure email sending credentials
            </p>
          </div>
          <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Add Credentials
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Email Credentials</DialogTitle>
                <DialogDescription>
                  Add SMTP credentials for sending emails
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={newCredentials.email}
                    onChange={(e) => setNewCredentials({ ...newCredentials, email: e.target.value })}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <Label>App Password</Label>
                  <Input
                    type="password"
                    value={newCredentials.password}
                    onChange={(e) => setNewCredentials({ ...newCredentials, password: e.target.value })}
                    placeholder="Your app password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    For Gmail, use an App Password from your Google Account settings
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SMTP Server</Label>
                    <Input
                      value={newCredentials.smtpServer}
                      onChange={(e) => setNewCredentials({ ...newCredentials, smtpServer: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={newCredentials.smtpPort}
                      onChange={(e) => setNewCredentials({ ...newCredentials, smtpPort: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCredentialsDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => addCredentialsMutation.mutate(newCredentials)}
                    disabled={!newCredentials.email || !newCredentials.password}
                  >
                    Save Credentials
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {credentialsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : credentials.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No email credentials configured</p>
              <p className="text-sm">Add SMTP credentials to start sending emails</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {credentials.map((cred: { 
              id: string; 
              email: string; 
              smtp_server: string; 
              smtp_port: number;
              is_default: boolean;
            }) => (
              <Card key={cred.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <Mail className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{cred.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {cred.smtp_server}:{cred.smtp_port}
                      </p>
                    </div>
                    {cred.is_default && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteCredentialsMutation.mutate(cred.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* SMTP Presets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Common SMTP Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">Gmail</p>
                <p className="text-muted-foreground">smtp.gmail.com:587</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">Outlook</p>
                <p className="text-muted-foreground">smtp.office365.com:587</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">Yahoo</p>
                <p className="text-muted-foreground">smtp.mail.yahoo.com:587</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
