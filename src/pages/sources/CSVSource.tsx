import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileSpreadsheet, Upload, CheckCircle, X, Loader2, FileUp, Tag, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const API_BASE = 'http://localhost:3001/api/v1';

// Standard CRM fields that can be mapped
const CRM_FIELDS = [
  { key: 'email', label: 'Email', keywords: ['email', 'e-mail', 'mail', 'emails'] },
  { key: 'firstName', label: 'First Name', keywords: ['first name', 'firstname', 'first_name', 'fname', 'given name'] },
  { key: 'lastName', label: 'Last Name', keywords: ['last name', 'lastname', 'last_name', 'lname', 'surname', 'family name'] },
  { key: 'company', label: 'Company', keywords: ['company', 'organization', 'org', 'business', 'business name', 'company name'] },
  { key: 'phone', label: 'Phone', keywords: ['phone', 'mobile', 'tel', 'telephone', 'cell', 'phone number', 'contact'] },
  { key: 'website', label: 'Website', keywords: ['website', 'url', 'domain', 'site', 'web', 'website url', 'homepage'] },
  { key: 'jobTitle', label: 'Job Title', keywords: ['title', 'job', 'position', 'role', 'job title', 'designation'] },
];

// Smart auto-mapping function
function autoMapColumns(columns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  for (const col of columns) {
    const colLower = col.toLowerCase().trim();
    
    for (const field of CRM_FIELDS) {
      // Skip if already mapped
      if (mapping[field.key]) continue;
      
      // Check for exact or partial match
      for (const keyword of field.keywords) {
        if (colLower === keyword || colLower.includes(keyword) || keyword.includes(colLower)) {
          mapping[field.key] = col;
          break;
        }
      }
    }
  }
  
  return mapping;
}

interface CSVPreview {
  filename: string;
  filePath: string;
  columns: string[];
  preview: Record<string, unknown>[];
}

export default function CSVSource() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importTags, setImportTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE}/csv/preview`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to preview CSV');
      }
      
      setCsvPreview(data);
      
      // Smart auto-map columns
      const autoMapping = autoMapColumns(data.columns);
      setFieldMapping(autoMapping);
      
      setShowMappingDialog(true);
      
      // Show how many fields were auto-mapped
      const mappedCount = Object.keys(autoMapping).length;
      if (mappedCount > 0) {
        toast.success(`Auto-mapped ${mappedCount} field${mappedCount > 1 ? 's' : ''}`);
      }
      
    } catch (error) {
      toast.error('Failed to upload CSV');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    if (!csvPreview || !fieldMapping.email) {
      toast.error('Email field mapping is required');
      return;
    }

    setIsImporting(true);
    
    try {
      const response = await fetch(`${API_BASE}/csv/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: csvPreview.filePath,
          mapping: fieldMapping,
          tags: importTags,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to import CSV');
      }
      
      const data = await response.json();
      toast.success(data.message);
      
      // Reset state
      setCsvPreview(null);
      setShowMappingDialog(false);
      setFieldMapping({});
      setImportTags([]);
      
      // Refresh leads
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
    } catch (error) {
      toast.error('Failed to import CSV');
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !importTags.includes(tagInput.trim())) {
      setImportTags([...importTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setImportTags(importTags.filter(t => t !== tag));
  };

  const mappedCount = Object.values(fieldMapping).filter(v => v && v !== '_none').length;

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-500" />
            CSV Import
          </CardTitle>
          <CardDescription>
            Upload a CSV file to import leads. Columns are auto-mapped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-16 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            {isUploading ? (
              <div className="space-y-3">
                <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Processing file...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <FileUp className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Field Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-500" />
              Import "{csvPreview?.filename}"
            </DialogTitle>
          </DialogHeader>
          
          {csvPreview && (
            <div className="space-y-5">
              {/* Auto-mapped indicator */}
              {mappedCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 px-3 py-2 rounded-lg">
                  <Sparkles className="h-4 w-4" />
                  {mappedCount} field{mappedCount > 1 ? 's' : ''} auto-mapped from your CSV
                </div>
              )}

              {/* Field Mapping */}
              <div className="space-y-3">
                {CRM_FIELDS.map((field) => {
                  const isMapped = fieldMapping[field.key] && fieldMapping[field.key] !== '_none';
                  return (
                    <div key={field.key} className="flex items-center gap-3">
                      <div className="w-24 flex-shrink-0 text-sm font-medium">
                        {field.label}
                        {field.key === 'email' && <span className="text-red-500 ml-0.5">*</span>}
                      </div>
                      <Select
                        value={fieldMapping[field.key] || '_none'}
                        onValueChange={(value) => 
                          setFieldMapping({ ...fieldMapping, [field.key]: value === '_none' ? '' : value })
                        }
                      >
                        <SelectTrigger className={`flex-1 ${isMapped ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">-- Skip --</SelectItem>
                          {csvPreview.columns.map((col) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isMapped && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* Tags */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tags (optional)</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {importTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {importTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setShowMappingDialog(false);
                setCsvPreview(null);
                setFieldMapping({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !fieldMapping.email}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {csvPreview?.preview?.length ? `(${csvPreview.preview.length}+ leads)` : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
