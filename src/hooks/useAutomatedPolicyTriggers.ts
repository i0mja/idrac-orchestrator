import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PolicyRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
  lastTriggered?: string;
}

interface TriggerEvent {
  type: 'firmware_compliance' | 'server_discovery' | 'health_check' | 'maintenance_window';
  serverIds: string[];
  metadata: any;
}

export function useAutomatedPolicyTriggers() {
  const [policies, setPolicies] = useState<PolicyRule[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [triggerHistory, setTriggerHistory] = useState<any[]>([]);
  const { toast } = useToast();

  // Default policy rules
  const defaultPolicies: PolicyRule[] = [
    {
      id: 'auto-update-ready',
      name: 'Auto-schedule Updates for Ready Servers',
      condition: 'firmware_compliance.updateReadiness === "ready" && protocols.REDFISH.supported',
      action: 'schedule_update_job',
      enabled: true
    },
    {
      id: 'maintenance-mode-trigger',
      name: 'Enter Maintenance Mode for Updates',
      condition: 'update_scheduled && vcenter_managed && !in_maintenance_mode',
      action: 'enter_maintenance_mode',
      enabled: true
    },
    {
      id: 'critical-firmware-alert',
      name: 'Alert on Critical Firmware Issues',
      condition: 'firmware_compliance.criticalUpdates > 0',
      action: 'create_alert',
      enabled: true
    },
    {
      id: 'auto-discovery-schedule',
      name: 'Schedule Discovery for New Networks',
      condition: 'datacenter_added && auto_discovery_enabled',
      action: 'schedule_discovery',
      enabled: false
    }
  ];

  useEffect(() => {
    // Load policies from storage or use defaults
    const savedPolicies = localStorage.getItem('automated-policies');
    if (savedPolicies) {
      try {
        setPolicies(JSON.parse(savedPolicies));
      } catch {
        setPolicies(defaultPolicies);
      }
    } else {
      setPolicies(defaultPolicies);
    }
  }, []);

  const evaluateCondition = useCallback((condition: string, context: any): boolean => {
    try {
      // Simple condition evaluation - in production, use a proper expression evaluator
      const cleanCondition = condition
        .replace(/firmware_compliance\.(\w+)/g, 'context.firmwareCompliance?.$1')
        .replace(/protocols\.(\w+)\.(\w+)/g, 'context.protocols?.$1?.$2')
        .replace(/(\w+)/g, (match) => {
          if (match === 'context' || match === 'true' || match === 'false') return match;
          return `context.${match}`;
        });

      return Function('context', `return Boolean(${cleanCondition})`)(context);
    } catch (error) {
      console.warn('Failed to evaluate condition:', condition, error);
      return false;
    }
  }, []);

  const triggerPolicy = useCallback(async (policy: PolicyRule, context: any) => {
    if (!policy.enabled) return;

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('automated-policy-trigger', {
        body: {
          policyId: policy.id,
          action: policy.action,
          context
        }
      });

      if (error) throw error;

      // Update trigger history
      const historyEntry = {
        id: Date.now().toString(),
        policyId: policy.id,
        policyName: policy.name,
        action: policy.action,
        context,
        result: data,
        timestamp: new Date().toISOString()
      };

      setTriggerHistory(prev => [historyEntry, ...prev.slice(0, 49)]);

      // Update last triggered time
      setPolicies(prev => prev.map(p => 
        p.id === policy.id 
          ? { ...p, lastTriggered: new Date().toISOString() }
          : p
      ));

      toast({
        title: "Policy Triggered",
        description: `${policy.name} executed successfully`,
      });

    } catch (error: any) {
      console.error('Policy trigger error:', error);
      toast({
        title: "Policy Error",
        description: error.message || "Failed to execute policy",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const processTriggerEvent = useCallback(async (event: TriggerEvent) => {
    const enabledPolicies = policies.filter(p => p.enabled);
    
    for (const policy of enabledPolicies) {
      const shouldTrigger = evaluateCondition(policy.condition, {
        ...event.metadata,
        eventType: event.type,
        serverIds: event.serverIds
      });

      if (shouldTrigger) {
        await triggerPolicy(policy, {
          event,
          servers: event.serverIds,
          metadata: event.metadata
        });
      }
    }
  }, [policies, evaluateCondition, triggerPolicy]);

  const updatePolicy = useCallback((policyId: string, updates: Partial<PolicyRule>) => {
    setPolicies(prev => {
      const updated = prev.map(p => p.id === policyId ? { ...p, ...updates } : p);
      localStorage.setItem('automated-policies', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const createCustomPolicy = useCallback((policy: Omit<PolicyRule, 'id'>) => {
    const newPolicy = {
      ...policy,
      id: `custom-${Date.now()}`
    };
    
    setPolicies(prev => {
      const updated = [...prev, newPolicy];
      localStorage.setItem('automated-policies', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deletePolicy = useCallback((policyId: string) => {
    setPolicies(prev => {
      const updated = prev.filter(p => p.id !== policyId);
      localStorage.setItem('automated-policies', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Auto-process events from server discovery
  useEffect(() => {
    const channel = supabase
      .channel('policy-triggers')
      .on('broadcast', { event: 'trigger_event' }, (payload: any) => {
        // Validate payload structure before processing
        if (payload && typeof payload === 'object' && 'serverIds' in payload && 'metadata' in payload) {
          processTriggerEvent(payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processTriggerEvent]);

  return {
    policies,
    isProcessing,
    triggerHistory,
    updatePolicy,
    createCustomPolicy,
    deletePolicy,
    processTriggerEvent,
    manualTrigger: triggerPolicy
  };
}