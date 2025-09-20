import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProtocolCapability {
  protocol: 'REDFISH' | 'WSMAN' | 'RACADM' | 'IPMI' | 'SSH';
  supported: boolean;
  firmwareVersion?: string;
  managerType?: string;
  generation?: string;
  updateModes: string[];
  priority: number;
  raw?: any;
}

export interface ProtocolHealth {
  protocol: string;
  status: 'healthy' | 'degraded' | 'unreachable';
  latencyMs?: number;
  checkedAt: number;
  details?: string;
}

export interface DetectionResult {
  identity: {
    host: string;
    model?: string;
    serviceTag?: string;
    generation?: string;
  };
  capabilities: ProtocolCapability[];
  healthiestProtocol?: ProtocolCapability;
  healthChecks: ProtocolHealth[];
}

/**
 * Hook for detecting and managing protocol capabilities for Dell servers
 */
export function useProtocolDetection() {
  const [detecting, setDetecting] = useState(false);
  const [results, setResults] = useState<DetectionResult | null>(null);
  const { toast } = useToast();

  /**
   * Detect supported protocols for a server
   */
  const detectProtocols = async (host: string, credentials: { username: string; password: string }) => {
    setDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('redfish-discovery', {
        body: {
          host,
          credentials,
          enableHealthChecks: true,
          enableCapabilityDetection: true
        }
      });

      if (error) throw error;

      const detectionResult: DetectionResult = {
        identity: data.identity || { host },
        capabilities: data.capabilities || [],
        healthiestProtocol: data.healthiestProtocol,
        healthChecks: data.healthChecks || []
      };

      setResults(detectionResult);
      
      toast({
        title: "Protocol Detection Complete",
        description: `Detected ${detectionResult.capabilities.filter(c => c.supported).length} supported protocols`,
      });

      return detectionResult;
    } catch (error) {
      console.error('Protocol detection error:', error);
      toast({
        title: "Detection Failed",
        description: error.message || "Failed to detect server protocols",
        variant: "destructive",
      });
      throw error;
    } finally {
      setDetecting(false);
    }
  };

  /**
   * Test protocol health for a server
   */
  const testProtocolHealth = async (host: string, credentials: { username: string; password: string }) => {
    try {
      const { data, error } = await supabase.functions.invoke('redfish-discovery', {
        body: {
          host,
          credentials,
          healthCheckOnly: true
        }
      });

      if (error) throw error;
      return data.healthChecks || [];
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  };

  return {
    detecting,
    results,
    detectProtocols,
    testProtocolHealth,
    clearResults: () => setResults(null)
  };
}