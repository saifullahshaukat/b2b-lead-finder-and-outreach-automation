import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CRMProvider } from "@/contexts/CRMContext";
import { AppLayout } from "@/components/layout/AppLayout";
import LeadsPage from "@/pages/LeadsPage";
import LeadSourcesPage from "@/pages/LeadSourcesPage";
import GoogleMapsSource from "@/pages/sources/GoogleMapsSource";
import LinkedInSource from "@/pages/sources/LinkedInSource";
import CSVSource from "@/pages/sources/CSVSource";
import WebsiteSource from "@/pages/sources/WebsiteSource";
import APISource from "@/pages/sources/APISource";
import OutreachPage from "@/pages/OutreachPage";
import EmailOutreach from "@/pages/outreach/EmailOutreach";
import SMSOutreach from "@/pages/outreach/SMSOutreach";
import ChannelPlaceholder from "@/pages/outreach/ChannelPlaceholder";
import WorkflowsPage from "@/pages/WorkflowsPage";
import InboxPage from "@/pages/InboxPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CRMProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/leads" replace />} />
            <Route
              path="/leads"
              element={
                <AppLayout>
                  <LeadsPage />
                </AppLayout>
              }
            />
            <Route
              path="/sources"
              element={
                <AppLayout>
                  <LeadSourcesPage />
                </AppLayout>
              }
            >
              <Route path="google-maps" element={<GoogleMapsSource />} />
              <Route path="linkedin" element={<LinkedInSource />} />
              <Route path="csv" element={<CSVSource />} />
              <Route path="website" element={<WebsiteSource />} />
              <Route path="api" element={<APISource />} />
            </Route>
            <Route
              path="/outreach"
              element={
                <AppLayout>
                  <OutreachPage />
                </AppLayout>
              }
            >
              <Route path="email" element={<EmailOutreach />} />
              <Route path="sms" element={<SMSOutreach />} />
              <Route
                path="whatsapp"
                element={
                  <ChannelPlaceholder
                    channel="WhatsApp"
                    description="Create WhatsApp message templates"
                  />
                }
              />
              <Route
                path="linkedin"
                element={
                  <ChannelPlaceholder
                    channel="LinkedIn"
                    description="Create LinkedIn connection and message templates"
                  />
                }
              />
              <Route
                path="calling"
                element={
                  <ChannelPlaceholder
                    channel="AI Calling"
                    description="Configure AI-powered cold calling scripts"
                  />
                }
              />
              <Route
                path="forms"
                element={
                  <ChannelPlaceholder
                    channel="Web Forms"
                    description="Automate website contact form submissions"
                  />
                }
              />
            </Route>
            <Route
              path="/workflows"
              element={
                <AppLayout>
                  <WorkflowsPage />
                </AppLayout>
              }
            />
            <Route
              path="/inbox"
              element={
                <AppLayout>
                  <InboxPage />
                </AppLayout>
              }
            />
            <Route
              path="/integrations"
              element={
                <AppLayout>
                  <IntegrationsPage />
                </AppLayout>
              }
            />
            <Route
              path="/analytics"
              element={
                <AppLayout>
                  <AnalyticsPage />
                </AppLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CRMProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
