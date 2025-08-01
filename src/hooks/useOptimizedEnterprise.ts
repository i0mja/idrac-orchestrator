import { useState, useCallback } from 'react';
import { useOptimizedDataFlow } from './useOptimizedDataFlow';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Optimized Enterprise Management Hook
export function useOptimizedEnterprise() {
  const [operationStates, setOperationStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Use optimized data flow for required data
  const {
    servers = [],
    dellPackages = [],
    systemEvents = [],
    autoConfig,
    loading,
    refresh,
    bulkUpdateServers,
    createOptimizedEvent,
    cacheInstance
  } = useOptimizedDataFlow(['servers', 'dellPackages', 'systemEvents', 'autoConfig']);

  const setOperationState = useCallback((operation: string, isLoading: boolean) => {
    setOperationStates(prev => ({ ...prev, [operation]: isLoading }));
  }, []);

  // Optimized operations with intelligent analysis
  const optimizedOperations = {
    // Smart discovery with batching and caching
    discoverFirmwareIntelligent: async (serverIds: string[]) => {
      setOperationState('discovery', true);
      try {
        // Filter servers that haven't been checked recently (last 4 hours)
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
        const serversToCheck = servers.filter(server => 
          serverIds.includes(server.id) && 
          (!server.last_updated || new Date(server.last_updated) < fourHoursAgo)
        );

        if (serversToCheck.length === 0) {
          toast({
            title: "Cache Hit",
            description: "All servers have recent firmware data",
          });
          return 0;
        }

        // Batch discovery in groups of 5 to avoid overwhelming the system
        const batchSize = 5;
        const batches = [];
        for (let i = 0; i < serversToCheck.length; i += batchSize) {
          batches.push(serversToCheck.slice(i, i + batchSize));
        }

        let totalDiscovered = 0;
        for (const batch of batches) {
          const { data } = await supabase.functions.invoke('redfish-discovery', {
            body: { 
              serverIds: batch.map(s => s.id),
              batchMode: true,
              cacheEnabled: true
            }
          });
          totalDiscovered += data?.discovered || 0;
          
          // Small delay between batches to prevent overwhelming
          if (batches.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        await createOptimizedEvent([{
          event_type: 'firmware_discovery_optimized',
          severity: 'info',
          title: 'Optimized Firmware Discovery Completed',
          description: `Discovered firmware for ${totalDiscovered} servers using intelligent caching`
        }]);

        return totalDiscovered;
      } finally {
        setOperationState('discovery', false);
      }
    },

    // Health score calculation with comprehensive analysis
    calculateSystemHealthScore: () => {
      const metrics = {
        serverHealth: calculateServerHealthMetrics(servers),
        firmwareCompliance: calculateFirmwareCompliance(servers, dellPackages),
        eventSeverity: calculateEventSeverityScore(systemEvents),
        systemStability: calculateSystemStability(servers, systemEvents)
      };

      const weightedScore = (
        metrics.serverHealth * 0.3 +
        metrics.firmwareCompliance * 0.25 +
        metrics.eventSeverity * 0.25 +
        metrics.systemStability * 0.2
      );

      return {
        overallScore: Math.round(weightedScore),
        breakdown: metrics,
        recommendations: generateHealthRecommendations(metrics),
        trend: calculateHealthTrend(systemEvents)
      };
    },

    // Intelligent resource optimization analysis
    analyzeResourceOptimization: () => {
      const clusterAnalysis = analyzeClusterUtilization(servers);
      const updatePatterns = analyzeUpdatePatterns(systemEvents);
      const maintenanceOptimization = calculateMaintenanceOptimization(servers);

      return {
        clusterUtilization: clusterAnalysis,
        updateEfficiency: updatePatterns,
        maintenanceWindows: maintenanceOptimization,
        recommendations: generateOptimizationRecommendations(clusterAnalysis, updatePatterns)
      };
    },

    // Predictive maintenance analysis
    predictMaintenanceNeeds: () => {
      const serverAging = analyzeServerAging(servers);
      const failurePatterns = analyzeFailurePatterns(systemEvents);
      const updateHistory = analyzeUpdateHistory(systemEvents);

      return {
        riskAnalysis: serverAging,
        failurePatterns,
        updateHistory,
        recommendations: generateMaintenanceRecommendations(serverAging, failurePatterns),
        optimalSchedule: calculateOptimalMaintenanceSchedule(servers, systemEvents)
      };
    },

    // Bulk operations with progress tracking
    executeBulkServerUpdate: async (serverIds: string[], updateData: any) => {
      setOperationState('bulkUpdate', true);
      try {
        const updates = serverIds.map(id => ({ id, updates: updateData }));
        const success = await bulkUpdateServers(updates);
        
        if (success) {
          await createOptimizedEvent([{
            event_type: 'bulk_server_update',
            severity: 'success',
            title: 'Bulk Server Update Completed',
            description: `Successfully updated ${serverIds.length} servers`
          }]);
          
          toast({
            title: "Bulk Update Success",
            description: `Updated ${serverIds.length} servers`,
          });
        }
        
        return success;
      } finally {
        setOperationState('bulkUpdate', false);
      }
    },

    // Performance analytics
    generatePerformanceReport: () => {
      const discoveryMetrics = calculateDiscoveryMetrics(systemEvents);
      const updateMetrics = calculateUpdateMetrics(systemEvents);
      const systemMetrics = calculateSystemMetrics(servers);

      return {
        discovery: discoveryMetrics,
        updates: updateMetrics,
        system: systemMetrics,
        overallPerformance: (discoveryMetrics.score + updateMetrics.score + systemMetrics.score) / 3,
        timeframe: '30 days'
      };
    }
  };

  return {
    // Data
    servers,
    dellPackages,
    systemEvents,
    autoConfig,
    
    // State
    loading,
    operationStates,
    
    // Operations
    ...optimizedOperations,
    refresh,
    
    // Utilities
    setOperationState
  };
}

// Helper functions for intelligent analysis
function calculateServerHealthMetrics(servers: any[]) {
  if (servers.length === 0) return 100;
  
  const online = servers.filter(s => s.status === 'online').length;
  const health = Math.round((online / servers.length) * 100);
  
  return Math.max(0, Math.min(100, health));
}

function calculateFirmwareCompliance(servers: any[], packages: any[]) {
  if (servers.length === 0) return 100;
  
  const upToDate = servers.filter(s => s.last_updated && 
    new Date(s.last_updated) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;
  
  return Math.round((upToDate / servers.length) * 100);
}

function calculateEventSeverityScore(events: any[]) {
  const recent = events.filter(e => 
    new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  
  if (recent.length === 0) return 100;
  
  const severity = recent.reduce((score, event) => {
    switch (event.severity) {
      case 'error': return score - 10;
      case 'warning': return score - 5;
      case 'success': return score + 2;
      default: return score;
    }
  }, 100);
  
  return Math.max(0, Math.min(100, severity));
}

function calculateSystemStability(servers: any[], events: any[]) {
  const errors = events.filter(e => e.severity === 'error').length;
  const totalEvents = events.length;
  
  if (totalEvents === 0) return 100;
  
  const errorRate = errors / totalEvents;
  return Math.round((1 - errorRate) * 100);
}

function generateHealthRecommendations(metrics: any) {
  const recommendations = [];
  
  if (metrics.serverHealth < 90) {
    recommendations.push({
      priority: 'high',
      category: 'infrastructure',
      message: 'Address offline servers to improve system reliability',
      impact: 'System availability at risk'
    });
  }
  
  if (metrics.firmwareCompliance < 80) {
    recommendations.push({
      priority: 'medium',
      category: 'maintenance',
      message: 'Schedule firmware updates for outdated systems',
      impact: 'Security vulnerabilities possible'
    });
  }
  
  if (metrics.eventSeverity < 70) {
    recommendations.push({
      priority: 'high',
      category: 'monitoring',
      message: 'Investigate and resolve critical system events',
      impact: 'System stability concerns'
    });
  }
  
  return recommendations;
}

function calculateHealthTrend(events: any[]) {
  const last24h = events.filter(e => 
    new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  
  const prev24h = events.filter(e => {
    const eventTime = new Date(e.created_at);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    return eventTime <= dayAgo && eventTime > twoDaysAgo;
  });
  
  const currentErrors = last24h.filter(e => e.severity === 'error').length;
  const previousErrors = prev24h.filter(e => e.severity === 'error').length;
  
  if (previousErrors === 0) return currentErrors === 0 ? 'stable' : 'declining';
  
  const change = (currentErrors - previousErrors) / previousErrors;
  
  if (change > 0.2) return 'declining';
  if (change < -0.2) return 'improving';
  return 'stable';
}

function analyzeClusterUtilization(servers: any[]) {
  const clusters = groupBy(servers.filter(s => s.cluster_name), 'cluster_name');
  
  return Object.entries(clusters).map(([name, clusterServers]) => {
    const total = (clusterServers as any[]).length;
    const healthy = (clusterServers as any[]).filter(s => s.status === 'online').length;
    const utilization = total > 0 ? healthy / total : 0;
    
    return {
      name,
      total,
      healthy,
      utilization: Math.round(utilization * 100),
      status: utilization >= 0.8 ? 'optimal' : utilization >= 0.6 ? 'acceptable' : 'critical'
    };
  });
}

function analyzeUpdatePatterns(events: any[]) {
  const updateEvents = events.filter(e => 
    e.event_type.includes('update') || e.event_type.includes('orchestration')
  );
  
  const successful = updateEvents.filter(e => e.severity === 'success').length;
  const failed = updateEvents.filter(e => e.severity === 'error').length;
  const total = updateEvents.length;
  
  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? Math.round((successful / total) * 100) : 100,
    averageFrequency: calculateAverageFrequency(updateEvents)
  };
}

function calculateMaintenanceOptimization(servers: any[]) {
  const maintenanceNeeded = servers.filter(s => 
    s.last_updated && 
    new Date(s.last_updated) < new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 days
  );
  
  return {
    serversNeedingMaintenance: maintenanceNeeded.length,
    percentage: servers.length > 0 ? Math.round((maintenanceNeeded.length / servers.length) * 100) : 0,
    criticalServers: maintenanceNeeded.filter(s => s.status !== 'online').length
  };
}

function generateOptimizationRecommendations(clusterAnalysis: any[], updatePatterns: any) {
  const recommendations = [];
  
  clusterAnalysis.forEach(cluster => {
    if (cluster.utilization < 60) {
      recommendations.push({
        type: 'cluster_optimization',
        cluster: cluster.name,
        message: `Cluster ${cluster.name} is underutilized (${cluster.utilization}%)`,
        action: 'Consider redistributing workloads or investigating issues'
      });
    }
  });
  
  if (updatePatterns.successRate < 80) {
    recommendations.push({
      type: 'update_optimization',
      message: `Update success rate is low (${updatePatterns.successRate}%)`,
      action: 'Review update procedures and failure patterns'
    });
  }
  
  return recommendations;
}

function analyzeServerAging(servers: any[]) {
  return servers.map(server => {
    const lastUpdate = server.last_updated ? new Date(server.last_updated) : null;
    const daysSinceUpdate = lastUpdate ? 
      Math.floor((Date.now() - lastUpdate.getTime()) / (24 * 60 * 60 * 1000)) : null;
    
    let riskLevel = 'low';
    if (daysSinceUpdate === null) riskLevel = 'unknown';
    else if (daysSinceUpdate > 90) riskLevel = 'high';
    else if (daysSinceUpdate > 60) riskLevel = 'medium';
    
    return {
      serverId: server.id,
      hostname: server.hostname,
      daysSinceUpdate,
      riskLevel,
      status: server.status
    };
  });
}

function analyzeFailurePatterns(events: any[]) {
  const failures = events.filter(e => e.severity === 'error');
  const last30Days = failures.filter(e => 
    new Date(e.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  
  return {
    totalFailures: failures.length,
    recentFailures: last30Days.length,
    trend: last30Days.length === 0 ? 'stable' : 'needs_attention',
    commonPatterns: identifyCommonPatterns(failures)
  };
}

function analyzeUpdateHistory(events: any[]) {
  const updateEvents = events.filter(e => e.event_type.includes('update'));
  const recent = updateEvents.filter(e => 
    new Date(e.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  
  return {
    totalUpdates: updateEvents.length,
    recentUpdates: recent.length,
    successfulUpdates: recent.filter(e => e.severity === 'success').length,
    frequency: recent.length / 30 // per day
  };
}

function generateMaintenanceRecommendations(aging: any[], patterns: any) {
  const recommendations = [];
  
  const highRiskServers = aging.filter(s => s.riskLevel === 'high').length;
  if (highRiskServers > 0) {
    recommendations.push({
      priority: 'high',
      message: `${highRiskServers} servers require immediate maintenance`,
      action: 'Schedule firmware updates for outdated systems'
    });
  }
  
  if (patterns.trend === 'needs_attention') {
    recommendations.push({
      priority: 'medium',
      message: 'Recent failure patterns detected',
      action: 'Investigate root causes and implement preventive measures'
    });
  }
  
  return recommendations;
}

function calculateOptimalMaintenanceSchedule(servers: any[], events: any[]) {
  // Analyze historical patterns to suggest optimal maintenance times
  const eventsByHour = groupBy(events, e => new Date(e.created_at).getHours());
  
  // Find quietest hours (least events)
  const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    activity: (eventsByHour[hour] as any[] || []).length
  }));
  
  const optimalHours = hourlyActivity
    .sort((a, b) => a.activity - b.activity)
    .slice(0, 4)
    .map(h => h.hour);
  
  return {
    recommendedHours: optimalHours,
    reasoning: 'Based on historical system activity patterns',
    estimatedImpact: 'minimal'
  };
}

function calculateDiscoveryMetrics(events: any[]) {
  const discoveryEvents = events.filter(e => e.event_type.includes('discovery'));
  const successful = discoveryEvents.filter(e => e.severity === 'success').length;
  const total = discoveryEvents.length;
  
  return {
    total,
    successful,
    score: total > 0 ? Math.round((successful / total) * 100) : 100
  };
}

function calculateUpdateMetrics(events: any[]) {
  const updateEvents = events.filter(e => e.event_type.includes('update'));
  const successful = updateEvents.filter(e => e.severity === 'success').length;
  const total = updateEvents.length;
  
  return {
    total,
    successful,
    score: total > 0 ? Math.round((successful / total) * 100) : 100
  };
}

function calculateSystemMetrics(servers: any[]) {
  const online = servers.filter(s => s.status === 'online').length;
  const total = servers.length;
  
  return {
    total,
    online,
    score: total > 0 ? Math.round((online / total) * 100) : 100
  };
}

function calculateAverageFrequency(events: any[]) {
  if (events.length < 2) return 0;
  
  const sortedEvents = events.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  const intervals = [];
  for (let i = 1; i < sortedEvents.length; i++) {
    const diff = new Date(sortedEvents[i].created_at).getTime() - 
                 new Date(sortedEvents[i-1].created_at).getTime();
    intervals.push(diff / (24 * 60 * 60 * 1000)); // days
  }
  
  return intervals.length > 0 ? 
    Math.round(intervals.reduce((a, b) => a + b) / intervals.length) : 0;
}

function identifyCommonPatterns(failures: any[]) {
  const patterns = failures.reduce((acc: Record<string, number>, failure) => {
    const type = failure.event_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(patterns)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));
}

function groupBy<T>(array: T[], keyOrFn: keyof T | ((item: T) => any)): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = typeof keyOrFn === 'function' ? 
      String(keyOrFn(item)) : 
      String(item[keyOrFn]);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}