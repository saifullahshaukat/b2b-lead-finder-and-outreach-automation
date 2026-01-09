import { useCRM } from '@/contexts/CRMContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check, Plus, Bookmark } from 'lucide-react';

export function SavedViewsDropdown() {
  const { savedViews, activeViewId, setActiveViewId } = useCRM();
  const activeView = savedViews.find(v => v.id === activeViewId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bookmark className="h-4 w-4" />
          {activeView?.name || 'All Leads'}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {savedViews.map(view => (
          <DropdownMenuItem
            key={view.id}
            onClick={() => setActiveViewId(view.id)}
            className="justify-between"
          >
            {view.name}
            {view.id === activeViewId && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus className="h-4 w-4 mr-2" />
          Create New View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
