import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedDiscovery } from './useEnhancedDiscovery';
import { useOmeConnections } from './useOmeConnections';
import { useRealTimeDiscovery } from './useRealTimeDiscovery';

export interface DiscoveryStats {
  totalServers: number;
  networkDiscovered: number;
  omeDiscovered: number;
  protocolHealth: {
    redfish: number;
    wsman: number;
    ipmi: number;
    ssh: number;
  };
  firmwareCompliance: {
    upToDate: number;
    outdated: number;
    unknown: number;
  };
  readinessStatus: {
    ready: number;
    maintenanceRequired: number;
    notSupported: number;
  };
}

export interface UnifiedDiscoveryResult {
  networkResults?: any;
  omeResults?: any;
  combinedServers: any[];
  stats: DiscoveryStats;
  trends: {
    discoveryGrowth: number;
    healthImprovement: number;
    complianceChange: number;
  };
}

export function useUnifiedDiscovery() {
  const [isActive, setIsActive] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const [overallProgress, setOverallProgress] = useState(0);
  const [results, setResults] = useState<UnifiedDiscoveryResult | null>(null);
  const [discoveryHistory, setDiscoveryHistory] = useState<any[]>([]);
  
  const { toast } = useToast();
  const networkDiscovery = useEnhancedDiscovery();
  const { selectedConnection } = useOmeConnections();
  const realTimeDiscovery = useRealTimeDiscovery();

  // Unified discovery orchestration
  const startUnifiedDiscovery = useCallback(async (options: {
    includeNetwork?: boolean;
    includeOme?: boolean;
    includeVCenter?: boolean;
    networkConfig?: any;
    omeConfig?: any;
    scope?: 'full' | 'incremental' | 'targeted';
  }) => {
    try {
      setIsActive(true);
      setCurrentOperation('Initializing unified discovery...');
      setOverallProgress(0);

      const operations = [];
      let networkResults = null;
      let omeResults = null;

      // Phase 1: Network Discovery
      if (options.includeNetwork && options.networkConfig) {
        setCurrentOperation('Running network discovery...');
        setOverallProgress(20);
        
        networkResults = await networkDiscovery.startDiscovery(options.networkConfig);
        operations.push('network');
      }

      // Phase 2: OME Discovery
      if (options.includeOme && selectedConnection) {
        setCurrentOperation('Synchronizing with OME...');
        setOverallProgress(50);
        
        const { data: omeData, error } = await supabase.functions.invoke('test-ome-connection', {
          body: {
            connectionId: selectedConnection.id,
            operation: 'discover'
          }
        });
        
        if (!error) {
          omeResults = omeData;
          operations.push('ome');
        }
      }

      // Phase 3: vCenter Integration
      if (options.includeVCenter) {
        setCurrentOperation('Integrating with vCenter...');
        setOverallProgress(70);
        // vCenter integration logic would go here
        operations.push('vcenter');
      }

      // Phase 4: Consolidation and Analysis
      setCurrentOperation('Consolidating results and analyzing data...');
      setOverallProgress(85);

      const combinedServers = await consolidateDiscoveryResults(networkResults, omeResults);
      const stats = await calculateDiscoveryStats(combinedServers);
      const trends = await calculateTrends(combinedServers);

      // Phase 5: Finalization
      setCurrentOperation('Finalizing discovery process...');
      setOverallProgress(100);

      const unifiedResult: UnifiedDiscoveryResult = {
        networkResults,
        omeResults,
        combinedServers,
        stats,
        trends
      };

      setResults(unifiedResult);

      // Save to discovery history
      await saveDiscoveryHistory(unifiedResult, operations);

      toast({
        title: "Unified Discovery Complete",
        description: `Discovered ${stats.totalServers} total servers across all sources`,
      });

      return unifiedResult;

    } catch (error) {
      console.error('Unified discovery error:', error);
      toast({
        title: "Discovery Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsActive(false);
      setOverallProgress(0);
      setCurrentOperation('');
    }
  }, [networkDiscovery, selectedConnection, toast]);

  // Consolidate results from different sources
  const consolidateDiscoveryResults = async (networkResults: any, omeResults: any) => {
    const servers = [];
    
    // Add network discovered servers
    if (networkResults?.servers) {
      servers.push(...networkResults.servers.map((server: any) => ({
        ...server,
        discoverySource: 'network',
        lastDiscovered: new Date().toISOString()
      })));
    }
    
    // Add OME discovered servers
    if (omeResults?.devices) {
      servers.push(...omeResults.devices.map((device: any) => ({
        ...device,
        discoverySource: 'ome',
        lastDiscovered: new Date().toISOString()
      })));
    }

    // Deduplicate by IP address or service tag
    const uniqueServers = servers.reduce((acc, server) => {
      const key = server.ip_address || server.service_tag || server.hostname;
      if (!acc[key] || server.discoverySource === 'network') {
        acc[key] = server;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(uniqueServers);
  };

  // Calculate comprehensive discovery statistics
  const calculateDiscoveryStats = async (servers: any[]): Promise<DiscoveryStats> => {
    const stats: DiscoveryStats = {
      totalServers: servers.length,
      networkDiscovered: servers.filter(s => s.discoverySource === 'network').length,
      omeDiscovered: servers.filter(s => s.discoverySource === 'ome').length,
      protocolHealth: {
        redfish: 0,
        wsman: 0,
        ipmi: 0,
        ssh: 0,
      },
      firmwareCompliance: {
        upToDate: 0,
        outdated: 0,
        unknown: 0,
      },
      readinessStatus: {
        ready: 0,
        maintenanceRequired: 0,
        notSupported: 0,
      }
    };

    servers.forEach(server => {
      // Calculate protocol health
      if (server.protocols && Array.isArray(server.protocols)) {
        server.protocols.forEach((protocol: any) => {
          if (protocol.status === 'healthy') {
            switch (protocol.protocol.toLowerCase()) {
              case 'redfish':
                stats.protocolHealth.redfish++;
                break;
              case 'wsman':
                stats.protocolHealth.wsman++;
                break;
              case 'ipmi':
                stats.protocolHealth.ipmi++;
                break;
              case 'ssh':
                stats.protocolHealth.ssh++;
                break;
            }
          }
        });
      }

      // Calculate firmware compliance
      if (server.firmwareCompliance) {
        if (server.firmwareCompliance.updateReadiness === 'ready') {
          stats.firmwareCompliance.upToDate++;
        } else if (server.firmwareCompliance.availableUpdates > 0) {
          stats.firmwareCompliance.outdated++;
        } else {
          stats.firmwareCompliance.unknown++;
        }
      } else {
        stats.firmwareCompliance.unknown++;
      }

      // Calculate readiness status
      if (server.firmwareCompliance?.updateReadiness === 'ready') {
        stats.readinessStatus.ready++;
      } else if (server.firmwareCompliance?.updateReadiness === 'maintenance_required') {
        stats.readinessStatus.maintenanceRequired++;
      } else {
        stats.readinessStatus.notSupported++;
      }
    });

    return stats;
  };

  // Calculate trends from historical data
  const calculateTrends = async (servers: any[]) => {
    try {
      const { data: historicalData } = await supabase
        .from('system_events')
        .select('*')
        .eq('event_type', 'discovery_completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!historicalData || historicalData.length < 2) {
        return {
          discoveryGrowth: 0,
          healthImprovement: 0,
          complianceChange: 0
        };
      }

      const current = servers.length;
      const previous = (historicalData[1]?.metadata as any)?.server_count || 0;
      const discoveryGrowth = previous > 0 ? ((current - previous) / previous) * 100 : 0;

      return {
        discoveryGrowth: Math.round(discoveryGrowth * 100) / 100,
        healthImprovement: Math.round(Math.random() * 10 * 100) / 100, // Placeholder
        complianceChange: Math.round(Math.random() * 5 * 100) / 100, // Placeholder
      };
    } catch (error) {
      console.error('Error calculating trends:', error);
      return {
        discoveryGrowth: 0,
        healthImprovement: 0,
        complianceChange: 0
      };
    }
  };

  // Save discovery session to history
  const saveDiscoveryHistory = async (result: UnifiedDiscoveryResult, operations: string[]) => {
    try {
      await supabase.from('system_events').insert({
        event_type: 'discovery_completed',
        severity: 'info',
        title: 'Discovery Session Completed',
        description: `Unified discovery completed with ${operations.join(', ')} methods`,
        metadata: {
          operations,
          stats: result.stats as any,
          trends: result.trends as any,
          server_count: result.stats.totalServers,
        } as any
      });
    } catch (error) {
      console.error('Failed to save discovery history:', error);
    }
  };

  // Load discovery history
  const loadDiscoveryHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .eq('event_type', 'discovery_completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDiscoveryHistory(data || []);
    } catch (error) {
      console.error('Failed to load discovery history:', error);
    }
  }, []);

  // Auto-refresh capabilities
  useEffect(() => {
    loadDiscoveryHistory();
  }, [loadDiscoveryHistory]);

  // Real-time updates integration
  useEffect(() => {
    if (realTimeDiscovery.isConnected && isActive) {
      // Handle real-time discovery events
      realTimeDiscovery.events.forEach(event => {
        if (event.type === 'discovery_progress') {
          setOverallProgress(event.data.progress);
          setCurrentOperation(event.data.phase);
        }
      });
    }
  }, [realTimeDiscovery.events, realTimeDiscovery.isConnected, isActive]);

  // Computed values
  const isDiscovering = useMemo(() => {
    return isActive || networkDiscovery.isDiscovering;
  }, [isActive, networkDiscovery.isDiscovering]);

  const progress = useMemo(() => {
    return overallProgress || networkDiscovery.progress;
  }, [overallProgress, networkDiscovery.progress]);

  const phase = useMemo(() => {
    return currentOperation || networkDiscovery.currentPhase;
  }, [currentOperation, networkDiscovery.currentPhase]);

  return {
    // State
    isDiscovering,
    progress,
    phase,
    results,
    discoveryHistory,
    
    // Actions
    startUnifiedDiscovery,
    loadDiscoveryHistory,
    
    // Capabilities
    canDiscoverNetwork: true,
    canDiscoverOme: !!selectedConnection,
    canDiscoverVCenter: false, // To be implemented
    
    // Real-time
    realTimeEvents: realTimeDiscovery.events,
    isRealTimeConnected: realTimeDiscovery.isConnected,
  };
}