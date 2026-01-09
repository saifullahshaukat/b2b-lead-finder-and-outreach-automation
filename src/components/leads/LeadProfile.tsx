import { Lead } from '@/types/crm';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LeadSourceBadge } from './LeadSourceBadge';
import {
  Mail,
  Phone,
  MessageSquare,
  Linkedin,
  Globe,
  Building2,
  Briefcase,
  Calendar,
  Clock,
  Send,
  Plus,
  MoreHorizontal,
  ExternalLink,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LeadStatus } from '@/types/crm';
import { useState, useEffect } from 'react';
import { 
  useLeadNotes, 
  useAddNote, 
  useDeleteNote, 
  useAllTags, 
  useAddTags, 
  useRemoveTag,
  useUpdateLead 
} from '@/hooks/useLeads';

interface LeadProfileProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  linkedin: Linkedin,
  call: Phone,
  form: Globe,
};

export function LeadProfile({ lead, open, onClose }: LeadProfileProps) {
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // API hooks
  const { data: notes = [], isLoading: notesLoading } = useLeadNotes(lead?.id || '');
  const { data: allTags = [] } = useAllTags();
  const addNote = useAddNote();
  const deleteNote = useDeleteNote();
  const addTags = useAddTags();
  const removeTag = useRemoveTag();
  const updateLead = useUpdateLead();

  // Filter tag suggestions
  const tagSuggestions = allTags.filter(tag => 
    tag.toLowerCase().includes(newTag.toLowerCase()) && 
    !lead?.tags?.includes(tag)
  ).slice(0, 5);

  if (!lead) return null;

  const initials = `${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase() || '?';

  const handleStatusChange = (status: LeadStatus) => {
    updateLead.mutate({ id: lead.id, updates: { status } });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote.mutate({ leadId: lead.id, content: newNote.trim() });
    setNewNote('');
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote.mutate({ leadId: lead.id, noteId });
  };

  const handleAddTag = (tag: string) => {
    if (!tag.trim()) return;
    addTags.mutate({ leadId: lead.id, tags: [tag.trim()] });
    setNewTag('');
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (tag: string) => {
    removeTag.mutate({ leadId: lead.id, tag });
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl mb-1">
                {lead.firstName} {lead.lastName}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {lead.jobTitle && <span>{lead.jobTitle}</span>}
                {lead.jobTitle && lead.company && <span>at</span>}
                {lead.company && (
                  <span className="font-medium text-foreground">{lead.company}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <LeadStatusBadge status={lead.status} />
                <LeadSourceBadge source={lead.source} />
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Quick Actions */}
            <div className="flex gap-2 mb-6">
              {lead.email && (
                <Button size="sm" className="flex-1" onClick={() => window.open(`mailto:${lead.email}`)}>
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
              )}
              {lead.phone && (
                <>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`sms:${lead.phone}`)}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    SMS
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`tel:${lead.phone}`)}>
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                </>
              )}
              {lead.linkedinUrl && (
                <Button 
                  size="sm" 
                  variant={lead.source === 'linkedin' ? 'default' : 'outline'}
                  className="flex-1" 
                  onClick={() => window.open(lead.linkedinUrl, '_blank')}
                >
                  <Linkedin className="h-4 w-4 mr-1" />
                  LinkedIn
                </Button>
              )}
              <Button size="sm" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {/* Status Selector */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-4">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Contact
                  </h4>
                  <div className="space-y-2">
                    {lead.email ? (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${lead.email}`} className="hover:underline">
                          {lead.email}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>No email available</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${lead.phone}`} className="hover:underline">
                          {lead.phone}
                        </a>
                      </div>
                    )}
                    {lead.linkedinUrl && (
                      <div className="flex items-center gap-3 text-sm">
                        <Linkedin className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={lead.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1 text-blue-600"
                        >
                          LinkedIn Profile
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {lead.website && (
                      <div className="flex items-center gap-3 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          {lead.website.replace(/^https?:\/\//, '')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Company Info */}
                {lead.company && (
                  <>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Company
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.company}</span>
                        </div>
                        {lead.jobTitle && (
                          <div className="flex items-center gap-3 text-sm">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.jobTitle}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Custom Fields */}
                {Object.keys(lead.customFields).length > 0 && (
                  <>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Custom Fields
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(lead.customFields).map(([key, value]) => {
                          const field = customFields.find(f => f.key === key);
                          return (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {field?.name || key}
                              </span>
                              <span className="font-medium">
                                {typeof value === 'number'
                                  ? value.toLocaleString()
                                  : String(value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Tags */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Tags
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(lead.tags || []).map(tag => (
                      <Badge 
                        key={tag} 
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Add Tag Input */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => {
                          setNewTag(e.target.value);
                          setShowTagSuggestions(e.target.value.length > 0);
                        }}
                        onFocus={() => setShowTagSuggestions(newTag.length > 0 || allTags.length > 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTag.trim()) {
                            e.preventDefault();
                            handleAddTag(newTag);
                          }
                        }}
                        className="h-8"
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAddTag(newTag)}
                        disabled={!newTag.trim() || addTags.isPending}
                      >
                        {addTags.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Tag Suggestions Dropdown */}
                    {showTagSuggestions && (tagSuggestions.length > 0 || (newTag.length === 0 && allTags.length > 0)) && (
                      <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-auto">
                        {(newTag.length > 0 ? tagSuggestions : allTags.filter(t => !lead.tags?.includes(t)).slice(0, 5)).map(tag => (
                          <button
                            key={tag}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                            onClick={() => handleAddTag(tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Metadata */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Metadata
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Created</span>
                      <span className="ml-auto">
                        {format(lead.createdAt, 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last Contact</span>
                      <span className="ml-auto">
                        {lead.lastContactedAt
                          ? formatDistanceToNow(lead.lastContactedAt, { addSuffix: true })
                          : 'Never'}
                      </span>
                    </div>
                    {lead.sourceDetails && (
                      <div className="flex items-center gap-3">
                        <Send className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Source Details</span>
                        <span className="ml-auto text-right max-w-[150px] truncate">
                          {lead.sourceDetails}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <div className="space-y-4">
                  {lead.outreachHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No outreach activity yet
                    </p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-4">
                        {lead.outreachHistory.map(event => {
                          const Icon = channelIcons[event.channel];
                          return (
                            <div key={event.id} className="flex gap-4 relative">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center z-10">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 pt-1">
                                <p className="text-sm font-medium capitalize">
                                  {event.type} via {event.channel}
                                </p>
                                {event.subject && (
                                  <p className="text-sm text-muted-foreground">
                                    {event.subject}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(event.createdAt, { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddNote} 
                      disabled={!newNote.trim() || addNote.isPending}
                    >
                      {addNote.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Note'
                      )}
                    </Button>
                  </div>

                  <Separator />

                  {notesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No notes yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {notes.map(note => (
                        <div key={note.id} className="space-y-1 group">
                          <div className="flex items-start justify-between">
                            <p className="text-sm flex-1">{note.content}</p>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {note.createdBy} • {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
