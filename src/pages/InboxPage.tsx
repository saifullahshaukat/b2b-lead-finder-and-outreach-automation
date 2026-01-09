import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useCRM } from '@/contexts/CRMContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, MessageSquare, Send, Search, Archive, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  linkedin: Mail,
  call: Mail,
  form: Mail,
};

export default function InboxPage() {
  const { conversations, leads } = useCRM();
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]?.id || null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const activeConversation = conversations.find(c => c.id === selectedConversation);
  const activeLead = activeConversation
    ? leads.find(l => l.id === activeConversation.leadId)
    : null;

  return (
    <>
      <TopBar title="Inbox" subtitle={`${conversations.length} conversations`} />

      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className="w-80 border-r border-border flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-9" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="replied">Needs Reply</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border">
              {conversations.map(conversation => {
                const lead = leads.find(l => l.id === conversation.leadId);
                const lastMessage = conversation.messages[conversation.messages.length - 1];
                const Icon = channelIcons[conversation.channel];
                const isSelected = conversation.id === selectedConversation;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={cn(
                      'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-muted'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {lead
                            ? `${lead.firstName[0]}${lead.lastName[0]}`
                            : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">
                            {lead
                              ? `${lead.firstName} ${lead.lastName}`
                              : 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(conversation.lastMessageAt, { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground truncate">
                            {lastMessage?.content.slice(0, 50)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={conversation.status === 'replied' ? 'default' : 'secondary'}
                            className="text-xs h-5"
                          >
                            {conversation.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {conversations.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No conversations yet
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Conversation View */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {activeLead
                      ? `${activeLead.firstName[0]}${activeLead.lastName[0]}`
                      : '??'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">
                    {activeLead
                      ? `${activeLead.firstName} ${activeLead.lastName}`
                      : 'Unknown'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activeLead?.email} • {activeLead?.company}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Closed
                </Button>
                <Button variant="outline" size="sm">
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-2xl mx-auto">
                {activeConversation.messages.map(message => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg p-3',
                        message.direction === 'outbound'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.subject && (
                        <p className="font-medium mb-1 text-sm">{message.subject}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={cn(
                          'text-xs mt-2',
                          message.direction === 'outbound'
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        )}
                      >
                        {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Reply */}
            <div className="p-4 border-t border-border">
              <div className="max-w-2xl mx-auto flex gap-2">
                <Textarea
                  placeholder="Type your reply..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button className="self-end">
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to view
          </div>
        )}
      </div>
    </>
  );
}
