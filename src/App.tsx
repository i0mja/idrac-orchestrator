/**
 * @fileoverview Main App component for iDRAC Updater Orchestrator
 * 
 * This component serves as the root of the application, handling:
 * - Application-wide state management with React Query
 * - Router configuration for SPA navigation
 * - Initial setup workflow detection and routing
 * - Global UI providers (tooltips, notifications)
 * 
 * @author Enterprise Infrastructure Team
 * @version 1.0.0
 */

import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/components/routing/AppRoutes';
import { SetupApp } from '@/components/setup/SetupApp';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * React Query client configuration
 * 
 * Configures TanStack Query for server state management throughout the app.
 * Handles caching, background updates, and error handling for API calls.
 */
const queryClient = new QueryClient();

/**
 * AppContent component handles the main application flow
 * 
 * Manages the conditional rendering between:
 * - Loading state during initial setup check
 * - Setup wizard for first-time users
 * - Main application routes for configured systems
 * 
 * @returns {JSX.Element} The appropriate content based on setup status
 */
function AppContent() {
  const { isSetupComplete, loading, completeSetup } = useSetupStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isSetupComplete) {
    return <SetupApp onSetupComplete={completeSetup} />;
  }

  return <AppRoutes />;
}

/**
 * Main App component
 * 
 * Root component that provides application-wide context:
 * - Query client for server state management
 * - Router for navigation
 * - UI providers for tooltips and notifications
 * - Global layout and theming
 * 
 * @returns {JSX.Element} The complete application wrapped with providers
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <AppContent />
            <Toaster />
            <Sonner />
          </div>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
