import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClusterHealthCheck {
  cluster_id: string
  cluster_name: string
  overall_status: 'healthy' | 'warning' | 'critical' | 'error'
  host_count: number
  connected_hosts: number
  maintenance_hosts: number
  vm_count: number
  drs_enabled: boolean
  ha_enabled: boolean
  resource_utilization: {
    cpu_usage_percent: number
    memory_usage_percent: number
    storage_usage_percent: number
  }
  health_issues: Array<{
    severity: 'critical' | 'warning' | 'info'
    message: string
    host_id?: string
    resolution?: string
  }>
}

export const useVCenterClusterHealth = () => {
  const [healthChecks, setHealthChecks] = useState<ClusterHealthCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkClusterHealth = useCallback(async (vcenterId: string, clusterId?: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('vsphere-cluster-health', {
        body: { vcenterId, clusterId }
      });

      if (error) throw error;

      if (data.success) {
        setHealthChecks(data.health_checks);
        toast({
          title: "Cluster Health Check Complete",
          description: `Checked ${data.health_checks.length} cluster(s)`,
        });
        return data.health_checks;
      } else {
        throw new Error(data.error || 'Health check failed');
      }
    } catch (error: any) {
      console.error('Cluster health check failed:', error);
      toast({
        title: "Health Check Failed",
        description: error.message || "Failed to check cluster health",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getHealthSummary = useCallback(() => {
    const total = healthChecks.length;
    const healthy = healthChecks.filter(c => c.overall_status === 'healthy').length;
    const warning = healthChecks.filter(c => c.overall_status === 'warning').length;
    const critical = healthChecks.filter(c => c.overall_status === 'critical').length;
    const error = healthChecks.filter(c => c.overall_status === 'error').length;

    const totalHosts = healthChecks.reduce((sum, c) => sum + c.host_count, 0);
    const connectedHosts = healthChecks.reduce((sum, c) => sum + c.connected_hosts, 0);
    const maintenanceHosts = healthChecks.reduce((sum, c) => sum + c.maintenance_hosts, 0);
    const totalVMs = healthChecks.reduce((sum, c) => sum + c.vm_count, 0);

    const totalIssues = healthChecks.reduce((sum, c) => sum + c.health_issues.length, 0);
    const criticalIssues = healthChecks.reduce((sum, c) => 
      sum + c.health_issues.filter(i => i.severity === 'critical').length, 0);

    return {
      cluster_summary: {
        total,
        healthy,
        warning,
        critical,
        error
      },
      infrastructure_summary: {
        total_hosts: totalHosts,
        connected_hosts: connectedHosts,
        maintenance_hosts: maintenanceHosts,
        total_vms: totalVMs
      },
      issues_summary: {
        total_issues: totalIssues,
        critical_issues: criticalIssues
      }
    };
  }, [healthChecks]);

  const getCriticalIssues = useCallback(() => {
    return healthChecks.flatMap(cluster => 
      cluster.health_issues
        .filter(issue => issue.severity === 'critical')
        .map(issue => ({
          ...issue,
          cluster_name: cluster.cluster_name,
          cluster_id: cluster.cluster_id
        }))
    );
  }, [healthChecks]);

  const getClusterByStatus = useCallback((status: string) => {
    return healthChecks.filter(cluster => cluster.overall_status === status);
  }, [healthChecks]);

  return {
    healthChecks,
    loading,
    checkClusterHealth,
    getHealthSummary,
    getCriticalIssues,
    getClusterByStatus
  };
};