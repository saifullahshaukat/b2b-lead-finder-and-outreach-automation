import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Users,
  Database,
  Send,
  GitBranch,
  Inbox,
  Plug,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquare,
  Phone,
  Linkedin,
  Globe,
  MessagesSquare,
  Settings,
  Zap,
  MapPin,
  FileSpreadsheet,
  Webhook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  children?: { label: string; icon: React.ElementType; path: string }[];
}

const navItems: NavItem[] = [
  { label: 'Leads', icon: Users, path: '/leads' },
  {
    label: 'Lead Sources',
    icon: Database,
    path: '/sources',
    children: [
      { label: 'Google Maps', icon: MapPin, path: '/sources/google-maps' },
      { label: 'LinkedIn', icon: Linkedin, path: '/sources/linkedin' },
      { label: 'CSV Upload', icon: FileSpreadsheet, path: '/sources/csv' },
      { label: 'Website', icon: Globe, path: '/sources/website' },
      { label: 'API / Webhook', icon: Webhook, path: '/sources/api' },
    ],
  },
  {
    label: 'Outreach',
    icon: Send,
    path: '/outreach',
    children: [
      { label: 'Email', icon: Mail, path: '/outreach/email' },
      { label: 'SMS', icon: MessageSquare, path: '/outreach/sms' },
      { label: 'WhatsApp', icon: MessagesSquare, path: '/outreach/whatsapp' },
      { label: 'LinkedIn', icon: Linkedin, path: '/outreach/linkedin' },
      { label: 'AI Calling', icon: Phone, path: '/outreach/calling' },
      { label: 'Web Forms', icon: Globe, path: '/outreach/forms' },
    ],
  },
  { label: 'Workflows', icon: GitBranch, path: '/workflows' },
  { label: 'Inbox', icon: Inbox, path: '/inbox' },
  { label: 'Integrations', icon: Plug, path: '/integrations' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Outreach', 'Lead Sources']);
  const location = useLocation();

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  const NavItemComponent = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);
    const active = isActive(item.path);
    const Icon = item.icon;

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <NavLink
              to={hasChildren ? item.children![0].path : item.path}
              className={cn(
                'flex items-center justify-center h-10 w-10 rounded-lg transition-colors mx-auto',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.label)}
            className={cn(
              'flex items-center w-full gap-3 px-3 py-2 rounded-lg transition-colors text-left',
              active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            style={{ paddingLeft: `${12 + depth * 12}px` }}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1 font-medium">{item.label}</span>
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
        ) : (
          <NavLink
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            style={{ paddingLeft: `${12 + depth * 12}px` }}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        )}

        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => (
              <NavItemComponent key={child.path} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-card transition-all duration-300 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-border px-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">OutreachCRM</span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(item => (
          <NavItemComponent key={item.path} item={item} />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-1">
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to="/settings"
                className={cn(
                  'flex items-center justify-center h-10 w-10 rounded-lg transition-colors mx-auto',
                  isActive('/settings')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Settings className="h-5 w-5" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <NavLink
            to="/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              isActive('/settings')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </NavLink>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full justify-center text-muted-foreground hover:text-foreground',
            collapsed && 'px-0'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Collapse
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
