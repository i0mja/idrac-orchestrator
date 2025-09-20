import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UpdateRiskAssessment {
  serverId: string;
  riskScore: number;
  riskFactors: {
    criticalWorkloads: boolean;
    highAvailability: boolean;
    recentChanges: boolean;
    firmwareComplexity: 'low' | 'medium' | 'high';
    dependencyCount: number;
  };
  recommendations: string[];
  suggestedWindow?: {
    start: string;
    duration: number;
    rationale: string;
  };
}

interface IntelligentUpdatePlan {
  id: string;
  name: string;
  serverGroups: {
    groupId: string;
    servers: string[];
    riskLevel: 'low' | 'medium' | 'high';
    scheduledWindow: string;
    dependencies: string[];
  }[];
  rollbackPlan: {
    checkpoints: string[];
    rollbackTriggers: string[];
    recoverySteps: string[];
  };
  safetyChecks: {
    preUpdate: string[];
    postUpdate: string[];
    rollbackValidation: string[];
  };
}

export function useIntelligentUpdateOrchestrator() {
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<IntelligentUpdatePlan | null>(null);
  const [riskAssessments, setRiskAssessments] = useState<UpdateRiskAssessment[]>([]);
  const { toast } = useToast();

  const analyzeUpdateRisk = useCallback(async (serverIds: string[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('intelligent-update-analysis', {
        body: { serverIds, analysisType: 'risk_assessment' }
      });

      if (error) throw error;
      
      setRiskAssessments(data.riskAssessments || []);
      toast({
        title: "Risk Analysis Complete",
        description: `Analyzed ${serverIds.length} servers for update readiness`
      });

      return data.riskAssessments;
    } catch (error) {
      console.error('Risk analysis failed:', error);
      toast({
        title: "Analysis Failed", 
        description: error.message,
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const generateIntelligentPlan = useCallback(async (
    serverIds: string[], 
    firmwarePackages: string[],
    constraints?: {
      maxConcurrentUpdates?: number;
      maintenanceWindows?: Array<{ start: string; end: string }>;
      criticalSystemProtection?: boolean;
    }
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('intelligent-update-planning', {
        body: { 
          serverIds, 
          firmwarePackages,
          constraints: constraints || {},
          planType: 'intelligent_orchestration'
        }
      });

      if (error) throw error;
      
      setCurrentPlan(data.plan);
      toast({
        title: "Intelligent Plan Generated",
        description: `Created optimized update sequence for ${serverIds.length} servers`
      });

      return data.plan;
    } catch (error) {
      console.error('Plan generation failed:', error);
      toast({
        title: "Planning Failed",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const executePlan = useCallback(async (planId: string, options?: {
    dryRun?: boolean;
    autoRollback?: boolean;
    pauseOnFailure?: boolean;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-intelligent-update-plan', {
        body: { planId, options: options || {} }
      });

      if (error) throw error;

      toast({
        title: options?.dryRun ? "Dry Run Complete" : "Plan Execution Started",
        description: `Update orchestration ${options?.dryRun ? 'simulated' : 'initiated'} successfully`
      });

      return data;
    } catch (error) {
      console.error('Plan execution failed:', error);
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const monitorExecution = useCallback(async (executionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('monitor-update-execution', {
        body: { executionId }
      });

      if (error) throw error;
      return data.status;
    } catch (error) {
      console.error('Monitoring failed:', error);
      return null;
    }
  }, []);

  return {
    loading,
    currentPlan,
    riskAssessments,
    analyzeUpdateRisk,
    generateIntelligentPlan,
    executePlan,
    monitorExecution
  };
}