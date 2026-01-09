import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function LeadSourcesPage() {
  const location = useLocation();

  if (location.pathname === '/sources') {
    return <Navigate to="/sources/google-maps" replace />;
  }

  return (
    <>
      <TopBar
        title="Lead Sources"
        subtitle="Configure and manage your lead sources"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            New Configuration
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <Outlet />
      </div>
    </>
  );
}
