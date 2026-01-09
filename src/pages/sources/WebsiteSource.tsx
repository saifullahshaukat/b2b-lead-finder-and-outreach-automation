import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Play, Globe, Code, Eye } from 'lucide-react';

export default function WebsiteSource() {
  return (
    <div className="space-y-6">
      {/* New Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-500" />
            Website Scraper
          </CardTitle>
          <CardDescription>
            Extract contact data from websites using CSS selectors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Target URL</Label>
            <Input placeholder="https://example.com/team or https://example.com/contact" />
          </div>
          
          <div className="space-y-2">
            <Label>CSS Selectors</Label>
            <Textarea 
              placeholder={`{
  "name": ".team-member-name",
  "email": ".team-member-email",
  "title": ".team-member-title"
}`}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Define CSS selectors to extract data from the page
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Configuration Name</Label>
              <Input placeholder="e.g., Company Team Pages" />
            </div>
            <div className="space-y-2">
              <Label>Pagination Selector (Optional)</Label>
              <Input placeholder=".next-page, .pagination a" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Save Configuration
            </Button>
            <Button variant="outline">
              <Play className="h-4 w-4 mr-1" />
              Run Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
              1
            </div>
            <div>
              <p className="font-medium">Enter the target URL</p>
              <p className="text-sm text-muted-foreground">
                Paste the URL of the page containing the data you want to extract
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
              2
            </div>
            <div>
              <p className="font-medium">Define CSS selectors</p>
              <p className="text-sm text-muted-foreground">
                Use your browser's inspect tool to find the CSS selectors for each data field
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
              3
            </div>
            <div>
              <p className="font-medium">Preview and run</p>
              <p className="text-sm text-muted-foreground">
                Preview the extracted data, then run the scraper to import leads
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Configurations */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Saved Configurations</h3>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No website scraper configurations yet. Create one above to get started.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
