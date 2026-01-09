import { useState } from 'react';
import { useCRM } from '@/contexts/CRMContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Upload, CheckCircle, Clock, FileText, Trash2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CSVSource() {
  const { leadSources } = useCRM();
  const csvSources = leadSources.filter(s => s.type === 'csv');
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop - would trigger field mapping flow
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-500" />
            CSV Upload
          </CardTitle>
          <CardDescription>
            Import leads from CSV files with custom field mapping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Drag & drop your CSV file here
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse your files
            </p>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Select CSV File
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Supports .csv files up to 10MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Saved Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved Field Mappings</CardTitle>
          <CardDescription>
            Reuse your field mappings for future imports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Healthcare Conference Attendees', fields: 8, lastUsed: new Date('2024-01-19') },
              { name: 'Trade Show Leads 2024', fields: 6, lastUsed: new Date('2024-01-15') },
              { name: 'Partner Referrals', fields: 5, lastUsed: new Date('2024-01-10') },
            ].map(mapping => (
              <div
                key={mapping.name}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{mapping.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {mapping.fields} fields mapped • Used {formatDistanceToNow(mapping.lastUsed, { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Use Mapping
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import History */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Import History</h3>
        <div className="space-y-4">
          {csvSources.map(source => (
            <Card key={source.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{source.name}</h3>
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {source.leadsImported.toLocaleString()} leads imported
                      </p>
                      {source.lastRunAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDistanceToNow(source.lastRunAt, { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View Leads
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {csvSources.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No CSV imports yet. Upload a file above to get started.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
