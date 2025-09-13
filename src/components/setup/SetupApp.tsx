import { useState } from "react";
import { OOBEWizard } from "./OOBEWizard";
import { Skeleton } from "@/components/ui/skeleton";

interface SetupConfig {
  backend_mode: 'supabase' | 'on_premise';
  organization_name: string;
  admin_email: string;
  deployment_type: 'cloud' | 'on_premise' | 'hybrid';
}

interface SetupAppProps {
  onSetupComplete: (config: SetupConfig) => void;
}

export function SetupApp({ onSetupComplete }: SetupAppProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async (config: SetupConfig) => {
    setIsCompleting(true);
    try {
      // Store config in localStorage temporarily until main app takes over
      localStorage.setItem('idrac_setup_config', JSON.stringify({
        ...config,
        setup_completed: true,
        setup_completed_at: new Date().toISOString()
      }));
      
      // Pass to main app
      onSetupComplete(config);
    } catch (error) {
      console.error('Setup completion failed:', error);
      setIsCompleting(false);
    }
  };

  if (isCompleting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <h3 className="text-lg font-medium">Initializing Application...</h3>
          <p className="text-muted-foreground">Setting up your configuration</p>
        </div>
      </div>
    );
  }

  return <OOBEWizard onComplete={handleComplete} />;
}