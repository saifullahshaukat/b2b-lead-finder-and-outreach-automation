import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function OutreachPage() {
  const location = useLocation();

  // Redirect to email if on /outreach
  if (location.pathname === '/outreach') {
    return <Navigate to="/outreach/email" replace />;
  }

  return (
    <>
      <TopBar
        title="Outreach"
        subtitle="Templates, sequences, and campaigns"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <Outlet />
      </div>
    </>
  );
}
