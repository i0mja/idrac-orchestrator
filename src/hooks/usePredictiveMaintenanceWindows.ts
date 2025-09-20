import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkloadPattern {
  dayOfWeek: number;
  hourOfDay: number;
  averageLoad: number;
  peakLoad: number;
  criticalProcesses: string[];
}

interface MaintenanceWindow {
  id: string;
  serverId: string;
  suggestedStart: string;
  suggestedEnd: string;
  confidence: number;
  riskScore: number;
  workloadImpact: 'minimal' | 'low' | 'medium' | 'high';
  rationale: string[];
  alternatives: Array<{
    start: string;
    end: string;
    confidence: number;
    tradeoffs: string[];
  }>;
}

interface BusinessConstraints {
  criticalHours: Array<{ start: string; end: string; description: string }>;
  blackoutDates: string[];
  preferredDays: number[];
  maxDowntimeMinutes: number;
  requireApproval: boolean;
}

export function usePredictiveMaintenanceWindows() {
  const [loading, setLoading] = useState(false);
  const [workloadPatterns, setWorkloadPatterns] = useState<WorkloadPattern[]>([]);
  const [suggestedWindows, setSuggestedWindows] = useState<MaintenanceWindow[]>([]);
  const [businessConstraints, setBusinessConstraints] = useState<BusinessConstraints | null>(null);
  const { toast } = useToast();

  const analyzeWorkloadPatterns = useCallback(async (serverIds: string[], daysToAnalyze = 30) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('workload-pattern-analysis', {
        body: { serverIds, daysToAnalyze, includeVmMetrics: true }
      });

      if (error) throw error;
      
      setWorkloadPatterns(data.patterns || []);
      toast({
        title: "Workload Analysis Complete",
        description: `Analyzed ${daysToAnalyze} days of workload data for ${serverIds.length} servers`
      });

      return data.patterns;
    } catch (error) {
      console.error('Workload analysis failed:', error);
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

  const predictOptimalWindows = useCallback(async (
    serverIds: string[],
    updateDurationEstimate: number,
    constraints?: Partial<BusinessConstraints>
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predictive-maintenance-windows', {
        body: { 
          serverIds, 
          updateDurationEstimate,
          constraints: constraints || {},
          predictionModel: 'ml_enhanced'
        }
      });

      if (error) throw error;
      
      setSuggestedWindows(data.windows || []);
      toast({
        title: "Optimal Windows Predicted",
        description: `Generated ${data.windows?.length || 0} maintenance window recommendations`
      });

      return data.windows;
    } catch (error) {
      console.error('Window prediction failed:', error);
      toast({
        title: "Prediction Failed",
        description: error.message,
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const validateWindow = useCallback(async (
    serverId: string, 
    proposedWindow: { start: string; end: string }
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-maintenance-window', {
        body: { serverId, proposedWindow }
      });

      if (error) throw error;
      return {
        valid: data.valid,
        conflicts: data.conflicts || [],
        riskScore: data.riskScore || 0,
        recommendations: data.recommendations || []
      };
    } catch (error) {
      console.error('Window validation failed:', error);
      return {
        valid: false,
        conflicts: ['Validation service unavailable'],
        riskScore: 100,
        recommendations: ['Please try again later']
      };
    }
  }, []);

  const scheduleMaintenanceWindow = useCallback(async (
    windowId: string,
    approvalRequired = false
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('schedule-maintenance-window', {
        body: { windowId, approvalRequired }
      });

      if (error) throw error;

      toast({
        title: approvalRequired ? "Approval Requested" : "Window Scheduled",
        description: approvalRequired 
          ? "Maintenance window submitted for approval"
          : "Maintenance window scheduled successfully"
      });

      return data;
    } catch (error) {
      console.error('Scheduling failed:', error);
      toast({
        title: "Scheduling Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadBusinessConstraints = useCallback(async () => {
    try {
      // For now, use default business constraints since system_config table doesn't exist yet
      const defaultConstraints: BusinessConstraints = {
        criticalHours: [
          { start: '09:00', end: '17:00', description: 'Business hours' }
        ],
        blackoutDates: [],
        preferredDays: [0, 6], // Weekends
        maxDowntimeMinutes: 60,
        requireApproval: true
      };
      
      setBusinessConstraints(defaultConstraints);
    } catch (error) {
      console.error('Failed to load business constraints:', error);
    }
  }, []);

  useEffect(() => {
    loadBusinessConstraints();
  }, [loadBusinessConstraints]);

  return {
    loading,
    workloadPatterns,
    suggestedWindows,
    businessConstraints,
    analyzeWorkloadPatterns,
    predictOptimalWindows,
    validateWindow,
    scheduleMaintenanceWindow,
    setBusinessConstraints
  };
}