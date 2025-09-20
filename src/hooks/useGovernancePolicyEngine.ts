import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PolicyTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  template: {
    conditions: any[];
    actions: any[];
    metadata: Record<string, any>;
  };
  isBuiltIn: boolean;
}

interface PolicyExecution {
  id: string;
  policyId: string;
  serverId: string;
  executedAt: string;
  result: 'pass' | 'fail' | 'warning';
  details: Record<string, any>;
  remediation?: {
    action: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    details: string;
  };
}

interface PolicyMetrics {
  totalPolicies: number;
  activePolicies: number;
  policyExecutions: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  complianceScore: number;
  trendData: Array<{
    date: string;
    executions: number;
    violations: number;
    complianceScore: number;
  }>;
}

export function useGovernancePolicyEngine() {
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState<any[]>([]);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [executions, setExecutions] = useState<PolicyExecution[]>([]);
  const [metrics, setMetrics] = useState<PolicyMetrics | null>(null);
  const { toast } = useToast();

  const evaluatePolicy = useCallback(async (
    policyId: string, 
    targetServers?: string[]
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-governance-policy', {
        body: { 
          policyId,
          targetServers: targetServers || [],
          includeRemediation: true
        }
      });

      if (error) throw error;

      if (data.executions) {
        setExecutions(prev => [...prev, ...data.executions]);
      }
      
      toast({
        title: "Policy Evaluation Complete",
        description: `Evaluated policy against ${targetServers?.length || 'all'} servers`
      });

      return data;
    } catch (error) {
      console.error('Policy evaluation failed:', error);
      toast({
        title: "Policy Evaluation Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createPolicyFromTemplate = useCallback(async (
    templateId: string,
    policyName: string,
    customizations?: Record<string, any>
  ) => {
    setLoading(true);
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      // Get user's organization ID for the policy
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data, error } = await supabase
        .from('governance_policies')
        .insert({
          organization_id: profile?.organization_id || '00000000-0000-0000-0000-000000000000',
          policy_name: policyName,
          policy_type: template.category,
          policy_rules: {
            ...template.template,
            ...customizations
          },
          enforcement_level: customizations?.enforcementLevel || 'warn',
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setPolicies(prev => [...prev, data]);
      
      toast({
        title: "Policy Created",
        description: `Policy "${policyName}" created from template`
      });

      return data;
    } catch (error) {
      console.error('Policy creation failed:', error);
      toast({
        title: "Policy Creation Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [templates, toast]);

  const updatePolicyEnforcement = useCallback(async (
    policyId: string,
    enforcementLevel: 'monitor' | 'warn' | 'block'
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('governance_policies')
        .update({ 
          enforcement_level: enforcementLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', policyId)
        .select()
        .single();

      if (error) throw error;

      setPolicies(prev => prev.map(policy => 
        policy.id === policyId 
          ? { ...policy, enforcement_level: enforcementLevel }
          : policy
      ));
      
      toast({
        title: "Enforcement Updated",
        description: `Policy enforcement set to "${enforcementLevel}"`
      });

      return data;
    } catch (error) {
      console.error('Enforcement update failed:', error);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const bulkEvaluatePolicies = useCallback(async (serverIds?: string[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-policy-evaluation', {
        body: { 
          serverIds: serverIds || [],
          activePoliciesOnly: true,
          generateReport: true
        }
      });

      if (error) throw error;

      if (data.executions) {
        setExecutions(data.executions);
      }
      
      if (data.metrics) {
        setMetrics(data.metrics);
      }
      
      toast({
        title: "Bulk Evaluation Complete",
        description: `Evaluated ${data.policiesEvaluated || 0} policies across ${serverIds?.length || 'all'} servers`
      });

      return data;
    } catch (error) {
      console.error('Bulk evaluation failed:', error);
      toast({
        title: "Bulk Evaluation Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const simulatePolicyImpact = useCallback(async (
    policyId: string,
    targetServers?: string[]
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulate-policy-impact', {
        body: { 
          policyId,
          targetServers: targetServers || [],
          simulationMode: true
        }
      });

      if (error) throw error;
      
      toast({
        title: "Simulation Complete",
        description: `Impact simulation completed for ${targetServers?.length || 'all'} servers`
      });

      return data;
    } catch (error) {
      console.error('Policy simulation failed:', error);
      toast({
        title: "Simulation Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchPolicies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('governance_policies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Failed to fetch policies:', error);
    }
  }, []);

  const loadPolicyTemplates = useCallback(async () => {
    try {
      // Load built-in policy templates
      const builtInTemplates: PolicyTemplate[] = [
        {
          id: 'firmware-eol-policy',
          name: 'Firmware End-of-Life Policy',
          category: 'lifecycle',
          description: 'Enforce firmware lifecycle management and EOL compliance',
          template: {
            conditions: [
              {
                metric: 'firmware_age_days',
                operator: 'greater_than',
                value: 365
              }
            ],
            actions: [
              {
                type: 'alert',
                parameters: { severity: 'high', notification: true }
              }
            ],
            metadata: {
              category: 'lifecycle',
              impact: 'medium',
              frequency: 'daily'
            }
          },
          isBuiltIn: true
        },
        {
          id: 'security-hardening-policy',
          name: 'Security Hardening Compliance',
          category: 'security',
          description: 'Ensure servers meet security hardening standards',
          template: {
            conditions: [
              {
                metric: 'ssl_enabled',
                operator: 'equals',
                value: true
              },
              {
                metric: 'default_passwords',
                operator: 'equals',
                value: false
              }
            ],
            actions: [
              {
                type: 'quarantine',
                parameters: { severity: 'critical', auto_remediate: false }
              }
            ],
            metadata: {
              category: 'security',
              impact: 'high',
              frequency: 'hourly'
            }
          },
          isBuiltIn: true
        },
        {
          id: 'maintenance-window-policy',
          name: 'Maintenance Window Compliance',
          category: 'governance',
          description: 'Enforce maintenance window scheduling policies',
          template: {
            conditions: [
              {
                metric: 'maintenance_scheduled',
                operator: 'equals',
                value: true
              },
              {
                metric: 'business_hours_maintenance',
                operator: 'equals',
                value: false
              }
            ],
            actions: [
              {
                type: 'block',
                parameters: { severity: 'medium', require_approval: true }
              }
            ],
            metadata: {
              category: 'governance',
              impact: 'medium',
              frequency: 'on_demand'
            }
          },
          isBuiltIn: true
        }
      ];

      setTemplates(builtInTemplates);
    } catch (error) {
      console.error('Failed to load policy templates:', error);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
    loadPolicyTemplates();
  }, [fetchPolicies, loadPolicyTemplates]);

  return {
    loading,
    policies,
    templates,
    executions,
    metrics,
    evaluatePolicy,
    createPolicyFromTemplate,
    updatePolicyEnforcement,
    bulkEvaluatePolicies,
    simulatePolicyImpact,
    refreshData: fetchPolicies
  };
}