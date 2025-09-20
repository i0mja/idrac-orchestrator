import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReadinessResult {
  server_id: string
  overall_readiness: 'ready' | 'warning' | 'not_ready'
  readiness_score: number
  connectivity_status: 'connected' | 'unreachable' | 'error'
  credential_status: 'valid' | 'invalid' | 'missing'
  firmware_capability_status: 'supported' | 'unsupported' | 'unknown'
  vcenter_integration_status?: 'integrated' | 'not_integrated' | 'error'
  maintenance_mode_capable: boolean
  blocking_issues: string[]
  warnings: string[]
  last_successful_update?: string
  recommendations: string[]
}

export const useHostReadinessCheck = () => {
  const [readinessResults, setReadinessResults] = useState<ReadinessResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkReadiness = useCallback(async (
    serverId?: string,
    ipAddress?: string,
    checkTypes: string[] = ['all'],
    forceRefresh: boolean = false
  ) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('host-readiness-check', {
        body: {
          server_id: serverId,
          ip_address: ipAddress,
          check_types: checkTypes,
          force_refresh: forceRefresh
        }
      });

      if (error) throw error;

      if (data.success) {
        setReadinessResults(data.readiness_results);
        
        const totalChecked = data.readiness_results.length;
        const readyCount = data.readiness_results.filter((r: ReadinessResult) => r.overall_readiness === 'ready').length;
        const notReadyCount = data.readiness_results.filter((r: ReadinessResult) => r.overall_readiness === 'not_ready').length;

        toast({
          title: "Readiness Check Complete",
          description: `${readyCount}/${totalChecked} servers ready, ${notReadyCount} not ready`,
          variant: notReadyCount > 0 ? "destructive" : "default"
        });

        return data.readiness_results;
      } else {
        throw new Error(data.error || 'Readiness check failed');
      }
    } catch (error: any) {
      console.error('Host readiness check failed:', error);
      toast({
        title: "Readiness Check Failed",
        description: error.message || "Failed to check host readiness",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getReadinessSummary = useCallback(() => {
    const total = readinessResults.length;
    const ready = readinessResults.filter(r => r.overall_readiness === 'ready').length;
    const warning = readinessResults.filter(r => r.overall_readiness === 'warning').length;
    const notReady = readinessResults.filter(r => r.overall_readiness === 'not_ready').length;

    const avgScore = total > 0 
      ? Math.round(readinessResults.reduce((sum, r) => sum + r.readiness_score, 0) / total)
      : 0;

    const connectivityIssues = readinessResults.filter(r => r.connectivity_status !== 'connected').length;
    const credentialIssues = readinessResults.filter(r => r.credential_status !== 'valid').length;
    const maintenanceCapable = readinessResults.filter(r => r.maintenance_mode_capable).length;

    return {
      readiness_summary: {
        total,
        ready,
        warning,
        not_ready: notReady,
        average_score: avgScore
      },
      capability_summary: {
        connectivity_issues: connectivityIssues,
        credential_issues: credentialIssues,
        maintenance_capable: maintenanceCapable
      }
    };
  }, [readinessResults]);

  const getBlockingIssues = useCallback(() => {
    return readinessResults.flatMap(result => 
      result.blocking_issues.map(issue => ({
        server_id: result.server_id,
        issue,
        severity: 'critical' as const
      }))
    );
  }, [readinessResults]);

  const getRecommendations = useCallback(() => {
    const allRecommendations = readinessResults.flatMap(result => 
      result.recommendations.map(rec => ({
        server_id: result.server_id,
        recommendation: rec,
        readiness_score: result.readiness_score
      }))
    );

    // Group by recommendation text to avoid duplicates
    const grouped = allRecommendations.reduce((acc, item) => {
      const key = item.recommendation;
      if (!acc[key]) {
        acc[key] = {
          recommendation: item.recommendation,
          affected_servers: [],
          priority: 'medium' as const
        };
      }
      acc[key].affected_servers.push(item.server_id);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }, [readinessResults]);

  const getServersByReadiness = useCallback((readinessLevel: 'ready' | 'warning' | 'not_ready') => {
    return readinessResults.filter(result => result.overall_readiness === readinessLevel);
  }, [readinessResults]);

  const getServerReadiness = useCallback((serverId: string) => {
    return readinessResults.find(result => result.server_id === serverId);
  }, [readinessResults]);

  return {
    readinessResults,
    loading,
    checkReadiness,
    getReadinessSummary,
    getBlockingIssues,
    getRecommendations,
    getServersByReadiness,
    getServerReadiness
  };
};