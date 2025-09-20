import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EnhancedDiscoveryOptions {
  ipRange: string;
  credentials?: {
    username: string;
    password: string;
  };
  datacenterId?: string;
  useCredentialProfiles?: boolean;
  detectProtocols?: boolean;
  checkFirmware?: boolean;
}

export interface DiscoveryResult {
  success: boolean;
  discovered: number;
  cached?: number;
  processed?: number;
  servers: any[];
  summary: {
    total: number;
    withProtocols: number;
    withFirmwareData: number;
    readyForUpdates: number;
    healthyProtocols?: number;
  };
  error?: string;
  errorType?: string;
}

export function useEnhancedDiscovery() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [results, setResults] = useState<DiscoveryResult | null>(null);
  const { toast } = useToast();

  const startDiscovery = useCallback(async (options: EnhancedDiscoveryOptions): Promise<DiscoveryResult> => {
    setIsDiscovering(true);
    setProgress(0);
    setCurrentPhase('Initializing discovery...');
    
    try {
      // Phase 1: Validate inputs
      setCurrentPhase('Validating discovery parameters...');
      setProgress(10);
      
      if (!options.ipRange && !options.datacenterId) {
        throw new Error('Either IP range or datacenter must be specified');
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Phase 2: Check credential profiles if needed
      if (options.useCredentialProfiles && !options.credentials) {
        setCurrentPhase('Loading credential profiles...');
        setProgress(20);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('credential_profiles')
          .select('*')
          .eq('is_default', true)
          .limit(1);
        
        if (profilesError) {
          console.warn('Failed to load credential profiles:', profilesError);
        } else if (!profiles || profiles.length === 0) {
          toast({
            title: "No Default Credentials",
            description: "No default credential profile found. Please configure credentials.",
            variant: "destructive",
          });
        }
      }

      // Phase 3: Start enhanced discovery
      setCurrentPhase('Starting protocol detection...');
      setProgress(30);
      
      const { data, error } = await supabase.functions.invoke('enhanced-discovery', {
        body: options
      });
      
      if (error) {
        throw new Error(error.message || 'Discovery failed');
      }
      
      // Phase 4: Process results
      setCurrentPhase('Processing discovery results...');
      setProgress(80);
      
      const result: DiscoveryResult = {
        success: data?.success || false,
        discovered: data?.discovered || 0,
        cached: data?.cached || 0,
        processed: data?.processed || 0,
        servers: data?.servers || [],
        summary: data?.summary || {
          total: 0,
          withProtocols: 0,
          withFirmwareData: 0,
          readyForUpdates: 0,
          healthyProtocols: 0
        },
        error: data?.error,
        errorType: data?.errorType
      };
      
      // Phase 5: Update local state and cache
      setCurrentPhase('Finalizing discovery...');
      setProgress(100);
      
      setResults(result);
      
      // Show results summary
      if (result.success && result.discovered > 0) {
        toast({
          title: "Discovery Complete",
          description: `Discovered ${result.discovered} servers with protocol analysis`,
        });
      } else if (result.success && result.discovered === 0) {
        toast({
          title: "Discovery Complete",
          description: "No new servers discovered in the specified range",
        });
      } else {
        throw new Error(result.error || 'Discovery completed with errors');
      }
      
      return result;
      
    } catch (error) {
      console.error('Enhanced discovery error:', error);
      
      const errorResult: DiscoveryResult = {
        success: false,
        discovered: 0,
        servers: [],
        summary: {
          total: 0,
          withProtocols: 0,
          withFirmwareData: 0,
          readyForUpdates: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        errorType: 'critical'
      };
      
      setResults(errorResult);
      
      toast({
        title: "Discovery Failed",
        description: errorResult.error,
        variant: "destructive",
      });
      
      return errorResult;
      
    } finally {
      setIsDiscovering(false);
      setProgress(0);
      setCurrentPhase('');
    }
  }, [toast]);

  const clearResults = useCallback(() => {
    setResults(null);
  }, []);

  const getProtocolStats = useCallback(() => {
    if (!results?.servers) return null;
    
    const protocolStats = {
      REDFISH: { supported: 0, healthy: 0, total: 0 },
      WSMAN: { supported: 0, healthy: 0, total: 0 },
      RACADM: { supported: 0, healthy: 0, total: 0 },
      IPMI: { supported: 0, healthy: 0, total: 0 },
      SSH: { supported: 0, healthy: 0, total: 0 }
    };
    
    results.servers.forEach(server => {
      if (server.protocols && Array.isArray(server.protocols)) {
        server.protocols.forEach((protocol: any) => {
          const protocolType = protocol.protocol as keyof typeof protocolStats;
          if (protocolStats[protocolType]) {
            protocolStats[protocolType].total++;
            if (protocol.supported) {
              protocolStats[protocolType].supported++;
              if (protocol.status === 'healthy') {
                protocolStats[protocolType].healthy++;
              }
            }
          }
        });
      }
    });
    
    return protocolStats;
  }, [results]);

  return {
    // State
    isDiscovering,
    progress,
    currentPhase,
    results,
    
    // Actions
    startDiscovery,
    clearResults,
    
    // Computed
    protocolStats: getProtocolStats()
  };
}