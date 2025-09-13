import { useState } from "react";
import { EnhancedOOBEWizard } from "./EnhancedOOBEWizard";
import { Skeleton } from "@/components/ui/skeleton";
import type { SetupConfig } from '@/types/setup';

interface SetupAppProps {
  onSetupComplete: (config: SetupConfig) => Promise<void>;
}

export function SetupApp({ onSetupComplete }: SetupAppProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async (config: SetupConfig) => {
    setIsCompleting(true);
    try {
      // Pass to main app for processing
      await onSetupComplete(config);
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

  return <EnhancedOOBEWizard onComplete={handleComplete} />;
}